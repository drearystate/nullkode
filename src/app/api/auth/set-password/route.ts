import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, hashPassword } from "@/lib/auth";
import { consumeAccountToken } from "@/lib/account-tokens";
import { clientIp } from "@/lib/antibot";
import { hitLimit } from "@/lib/rate-limit";
import { json } from "@/lib/utils";

const Body = z.object({
  token: z.string().min(10).max(200),
  password: z.string().min(8, "Use at least 8 characters.").max(200),
  name: z.string().trim().min(1).max(100).optional(),
});

/** Finish an invitation or a password reset, then sign the user in. */
export async function POST(req: Request) {
  const ip = clientIp(req);
  if (!hitLimit(`set-password:${ip}`, 20, 15 * 60_000).ok) {
    return json({ error: "Too many attempts. Please wait a few minutes." }, { status: 429 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? "Check the form and try again." }, { status: 400 });

  const token = await consumeAccountToken(parsed.data.token);
  if (!token) return json({ error: "This link has expired or was already used. Ask for a new one." }, { status: 410 });

  await db.user.update({
    where: { id: token.userId },
    data: {
      passwordHash: await hashPassword(parsed.data.password),
      // Opening the emailed/shared link proves the address.
      emailVerified: token.user.emailVerified ?? new Date(),
      ...(parsed.data.name && !token.user.name ? { name: parsed.data.name } : {}),
    },
  });
  // A new password signs out every other device.
  await db.session.deleteMany({ where: { userId: token.userId } });
  await createSession(token.userId, { ip, userAgent: req.headers.get("user-agent") ?? undefined });
  // Resellers start in their own dashboard, everyone else with their apps.
  return json({ ok: true, next: token.user.role === "RESELLER" ? "/reseller" : "/dashboard" });
}
