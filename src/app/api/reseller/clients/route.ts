import { z } from "zod";
import type { Plan, Reseller, User } from "@prisma/client";
import { db } from "@/lib/db";
import { json } from "@/lib/utils";
import { emailEnabled } from "@/lib/mailer";
import { CLIENT_PLANS, issueAccountLink, normalizeEmail, placeholderPasswordHash, requireReseller } from "@/lib/reseller-admin";

const PlanField = z.enum(CLIENT_PLANS as [string, ...string[]]).optional();

const Single = z.object({
  email: z.string().email(),
  name: z.string().trim().max(100).optional(),
  plan: PlanField,
});

/** Many addresses at once: an array, or the pasted text (split on new lines, commas and semicolons). */
const Bulk = z.object({
  emails: z.union([z.array(z.string().max(400)).max(500), z.string().max(40_000)]),
  plan: PlanField,
});

/** Addresses per bulk invite. Keeps the request (and the emails it sends) short. */
const MAX_BULK = 50;
const EmailAddress = z.string().email().max(320);

type Outcome =
  | { email: string; status: "invited"; client: User }
  | { email: string; status: "skipped"; reason: string; code: "invalid" | "duplicate" | "own-client" | "taken" | "no-seats" };

function seatsMessage(reseller: Pick<Reseller, "maxClients">): string {
  return `Your plan includes ${reseller.maxClients} clients and they're all in use. Contact the platform operator to add more.`;
}

/** "Jo Lee <jo@shop.test>" → "jo@shop.test"; anything else as typed. */
function addressOf(entry: string): string {
  const inBrackets = /<([^<>\s]+)>/.exec(entry);
  return normalizeEmail(inBrackets ? inBrackets[1] : entry);
}

/**
 * Creates client accounts for the addresses, in order, until the reseller's
 * client seats run out. Invites for one reseller run one at a time, so two
 * at once can't go past the seat limit.
 */
async function createClients(
  reseller: Reseller,
  entries: Array<{ email: string; name?: string | null }>,
  plan: Plan,
): Promise<Outcome[]> {
  const outcomes: Outcome[] = [];
  const candidates: Array<{ email: string; name: string | null }> = [];
  const seen = new Set<string>();
  for (const entry of entries) {
    const email = addressOf(entry.email);
    if (!EmailAddress.safeParse(email).success) {
      outcomes.push({ email: entry.email.trim(), status: "skipped", reason: "Not a valid email address.", code: "invalid" });
    } else if (seen.has(email)) {
      outcomes.push({ email, status: "skipped", reason: "Listed twice.", code: "duplicate" });
    } else {
      seen.add(email);
      candidates.push({ email, name: entry.name || null });
    }
  }
  if (!candidates.length) return outcomes;

  // Unusable random passwords (argon2 is slow), made before taking the lock.
  const used = await db.user.count({ where: { resellerId: reseller.id } });
  const room = reseller.maxClients === null ? candidates.length : Math.max(0, Math.min(candidates.length, reseller.maxClients - used));
  const hashes = await Promise.all(Array.from({ length: room }, () => placeholderPasswordHash()));

  const created = await db.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`nk-invite:${reseller.id}`}))`;
      let seats =
        reseller.maxClients === null ? Infinity : reseller.maxClients - (await tx.user.count({ where: { resellerId: reseller.id } }));
      const done: Outcome[] = [];
      for (const c of candidates) {
        const existing = await tx.user.findFirst({
          where: { email: { equals: c.email, mode: "insensitive" } },
          select: { resellerId: true },
        });
        if (existing) {
          done.push(
            existing.resellerId === reseller.id
              ? { email: c.email, status: "skipped", reason: "Already one of your clients.", code: "own-client" }
              : { email: c.email, status: "skipped", reason: "This email already has an account, so it can't be added as a new client.", code: "taken" },
          );
          continue;
        }
        // (A seat freed since the count above still gets a password here.)
        const hash = seats > 0 ? (hashes.shift() ?? (await placeholderPasswordHash())) : undefined;
        if (!hash) {
          done.push({ email: c.email, status: "skipped", reason: "No client seats left.", code: "no-seats" });
          continue;
        }
        const client = await tx.user.create({
          data: { email: c.email, name: c.name, passwordHash: hash, resellerId: reseller.id, plan },
        });
        seats -= 1;
        done.push({ email: c.email, status: "invited", client });
      }
      return done;
    },
    { timeout: 30_000 },
  );
  return [...outcomes, ...created];
}

/** Runs `fn` over the items, a few at a time. */
async function inBatches<T, R>(items: T[], size: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += size) out.push(...(await Promise.all(items.slice(i, i + size).map(fn))));
  return out;
}

/**
 * Add a client and send (or return) their invitation link. With `emails`
 * (pasted addresses), invites many at once: it stops when the client seats
 * run out, reports what it skipped and why, and returns every new client's
 * link (to share by hand when email isn't set up on this server).
 */
export async function POST(req: Request) {
  const r = await requireReseller();
  if ("error" in r) return r.error;
  const { reseller, user: owner } = r;
  const body = await req.json().catch(() => null);
  const invitedBy = owner.name || reseller.name;

  if (body && typeof body === "object" && "emails" in body) {
    const parsed = Bulk.safeParse(body);
    if (!parsed.success) return json({ error: "Paste the email addresses, one per line or separated by commas." }, { status: 400 });
    const list = (Array.isArray(parsed.data.emails) ? parsed.data.emails : [parsed.data.emails])
      .flatMap((chunk) => chunk.split(/[\r\n,;]+/))
      .map((s) => s.trim())
      .filter(Boolean);
    if (!list.length) return json({ error: "Paste at least one email address." }, { status: 400 });
    if (list.length > MAX_BULK) return json({ error: `Paste up to ${MAX_BULK} addresses at a time.` }, { status: 400 });
    if (reseller.maxClients !== null && (await db.user.count({ where: { resellerId: reseller.id } })) >= reseller.maxClients) {
      return json({ error: seatsMessage(reseller) }, { status: 403 });
    }

    const outcomes = await createClients(reseller, list.map((email) => ({ email })), (parsed.data.plan ?? "FREE") as Plan);
    const results = await inBatches(outcomes, 4, async (o) => {
      if (o.status === "skipped") return { email: o.email, status: o.status, reason: o.reason, code: o.code };
      const { link, emailed } = await issueAccountLink(o.client, "invite", invitedBy);
      return {
        email: o.email,
        status: o.status,
        client: { id: o.client.id, email: o.client.email, name: o.client.name, plan: o.client.plan },
        link,
        emailed,
      };
    });
    const count = await db.user.count({ where: { resellerId: reseller.id } });
    return json({
      results,
      invited: results.filter((x) => x.status === "invited").length,
      skipped: results.filter((x) => x.status === "skipped").length,
      seatsLeft: reseller.maxClients === null ? null : Math.max(0, reseller.maxClients - count),
      emailOn: emailEnabled(),
    });
  }

  const parsed = Single.safeParse(body);
  if (!parsed.success) return json({ error: "Enter a valid email address." }, { status: 400 });
  if (reseller.maxClients !== null && (await db.user.count({ where: { resellerId: reseller.id } })) >= reseller.maxClients) {
    return json({ error: seatsMessage(reseller) }, { status: 403 });
  }
  const [outcome] = await createClients(reseller, [{ email: parsed.data.email, name: parsed.data.name }], (parsed.data.plan ?? "FREE") as Plan);
  if (!outcome || outcome.status === "skipped") {
    if (outcome?.code === "no-seats") return json({ error: seatsMessage(reseller) }, { status: 403 });
    if (outcome?.code === "own-client") return json({ error: "That person is already one of your clients." }, { status: 409 });
    if (outcome?.code === "taken") return json({ error: "That email already has an account, so it can't be added as a new client." }, { status: 409 });
    return json({ error: "Enter a valid email address." }, { status: 400 });
  }
  const client = outcome.client;
  const { link, emailed } = await issueAccountLink(client, "invite", invitedBy);
  return json({ client: { id: client.id, email: client.email, name: client.name, plan: client.plan }, link, emailed });
}
