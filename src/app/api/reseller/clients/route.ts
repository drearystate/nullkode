import { z } from "zod";
import { db } from "@/lib/db";
import { json } from "@/lib/utils";
import { CLIENT_PLANS, findUserByEmail, issueAccountLink, normalizeEmail, placeholderPasswordHash, requireReseller } from "@/lib/reseller-admin";

const Body = z.object({
  email: z.string().email(),
  name: z.string().trim().max(100).optional(),
  plan: z.enum(CLIENT_PLANS as [string, ...string[]]).optional(),
});

/** Add a client and send (or return) their invitation link. */
export async function POST(req: Request) {
  const r = await requireReseller();
  if ("error" in r) return r.error;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "Enter a valid email address." }, { status: 400 });
  const { reseller, user: owner } = r;

  if (reseller.maxClients !== null && (await db.user.count({ where: { resellerId: reseller.id } })) >= reseller.maxClients) {
    return json({ error: `Your plan includes ${reseller.maxClients} clients and they're all in use. Contact the platform operator to add more.` }, { status: 403 });
  }
  const email = normalizeEmail(parsed.data.email);
  const existing = await findUserByEmail(email);
  if (existing) {
    return json({
      error: existing.resellerId === reseller.id
        ? "That person is already one of your clients."
        : "That email already has an account, so it can't be added as a new client.",
    }, { status: 409 });
  }
  const client = await db.user.create({
    data: {
      email,
      name: parsed.data.name || null,
      passwordHash: await placeholderPasswordHash(),
      resellerId: reseller.id,
      plan: (parsed.data.plan ?? "FREE") as never,
    },
  });
  const { link, emailed } = await issueAccountLink(client, "invite", owner.name || reseller.name);
  return json({ client: { id: client.id, email: client.email, name: client.name, plan: client.plan }, link, emailed });
}
