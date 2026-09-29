import { z } from "zod";
import { db } from "@/lib/db";
import { verifyPassword, createSession, promoteIfSeededAdmin, isBlocked } from "@/lib/auth";
import { clientIp } from "@/lib/antibot";
import { hitLimit, isLimited, clearLimit } from "@/lib/rate-limit";
import { requestHost, resellerForHost, getRequestBrand } from "@/lib/reseller";
import { json } from "@/lib/utils";

const Body = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(200),
});

// Failed sign-ins: 10 per IP and 5 per account per 15 minutes.
const WINDOW_MS = 15 * 60_000;

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "Enter your email and password." }, { status: 400 });

  const email = parsed.data.email.trim();
  const ip = clientIp(req);
  const ipKey = `login:ip:${ip}`;
  const accountKey = `login:acct:${email.toLowerCase()}`;
  if (isLimited(ipKey, 10) || isLimited(accountKey, 5)) {
    return json({ error: "Too many sign-in attempts. Please wait 15 minutes and try again." }, { status: 429 });
  }
  const fail = () => {
    hitLimit(ipKey, 10, WINDOW_MS);
    hitLimit(accountKey, 5, WINDOW_MS);
    return json({ error: "That email and password don't match." }, { status: 401 });
  };

  // Emails are matched case-insensitively (older accounts may be stored mixed-case).
  const user = await db.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    include: { reseller: { select: { id: true, status: true } }, ownedReseller: { select: { id: true, status: true } } },
  });
  if (!user) return fail();
  const ok = await verifyPassword(user.passwordHash, parsed.data.password);
  if (!ok) return fail();

  // On a reseller's own domain, only that reseller and its clients sign in.
  const hostReseller = await resellerForHost(await requestHost());
  if (hostReseller && user.resellerId !== hostReseller.id && user.ownedReseller?.id !== hostReseller.id) {
    return json({ error: `This account isn't registered with ${hostReseller.name}. Sign in where you created it.` }, { status: 403 });
  }
  if (isBlocked(user)) {
    const { brand } = await getRequestBrand(user);
    return json(
      { error: `This account is suspended.${brand.supportEmail ? ` Contact ${brand.supportEmail} for help.` : " Contact support for help."}` },
      { status: 403 },
    );
  }

  clearLimit(accountKey);
  await promoteIfSeededAdmin(user.id, user.email);
  await createSession(user.id, {
    ip,
    userAgent: req.headers.get("user-agent") ?? undefined,
  });

  return json({ user: { id: user.id, email: user.email, name: user.name } });
}
