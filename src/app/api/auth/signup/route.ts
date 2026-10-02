import { z } from "zod";
import { db } from "@/lib/db";
import { hashPassword, createSession, promoteIfSeededAdmin } from "@/lib/auth";
import { guardSignup, SignupBlocked } from "@/lib/antibot";
import { json } from "@/lib/utils";
import { requestErrorsT } from "@/lib/errors-i18n";
import { requestHost, resellerForHost } from "@/lib/reseller";

const Body = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(200),
  name: z.string().max(100).optional(),
  // Anti-bot ticket from /api/auth/challenge.
  challenge: z.string().min(1).max(64),
  nonce: z.number().int().min(0),
  // Honeypots — must stay empty.
  website: z.string().max(200).optional(),
  company: z.string().max(200).optional(),
  // Signed up after describing an app in the home page's idea box (counted
  // in the onboarding funnel).
  arrivedWithIdea: z.boolean().optional(),
});

export async function POST(req: Request) {
  const t = await requestErrorsT();
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: t("common.invalidInput") }, { status: 400 });

  const { password, name, challenge, nonce, website, company, arrivedWithIdea } = parsed.data;
  const email = parsed.data.email.trim().toLowerCase();

  // Signing up on a reseller's domain makes you that reseller's client.
  const reseller = await resellerForHost(await requestHost());
  if (reseller) {
    if (!reseller.allowSignup) {
      return json({ error: t("auth.inviteOnly", { reseller: reseller.name }) }, { status: 403 });
    }
    if (reseller.maxClients !== null && (await db.user.count({ where: { resellerId: reseller.id } })) >= reseller.maxClients) {
      return json({ error: t("auth.notAccepting", { reseller: reseller.name }) }, { status: 403 });
    }
  }

  let ip: string;
  let emailNormalized: string;
  try {
    ({ ip, emailNormalized } = await guardSignup({
      email,
      challenge,
      nonce,
      honeypot: { website, company },
      req,
    }));
  } catch (err) {
    if (err instanceof SignupBlocked) {
      console.warn(`[signup blocked] ${err.reason} — ${email}`);
      return json(
        { error: t(`antibot.${err.userMessageKey}`), retryable: err.retryable || undefined },
        { status: err.status },
      );
    }
    throw err;
  }

  const exists = await db.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } }, select: { id: true } });
  if (exists) return json({ error: t("auth.exists") }, { status: 409 });

  const passwordHash = await hashPassword(password);
  const user = await db.user.create({
    data: {
      email, passwordHash, name, emailNormalized, signupIp: ip, resellerId: reseller?.id ?? null,
      ...(arrivedWithIdea ? { prefs: { arrivedWithIdea: true } } : {}),
    },
    select: { id: true, email: true, name: true },
  });

  await promoteIfSeededAdmin(user.id, user.email);

  await createSession(user.id, {
    ip,
    userAgent: req.headers.get("user-agent") ?? undefined,
  });

  return json({ user });
}
