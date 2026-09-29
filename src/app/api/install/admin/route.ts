import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, hashPassword, verifyPassword } from "@/lib/auth";
import { INSTALL_OWNER_KEY, isInstallComplete, validInstallToken } from "@/lib/install";
import { SETTING_KEYS } from "@/lib/settings";

export const runtime = "nodejs";
const Body = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.string().email().max(200).transform(v => v.toLowerCase()),
  password: z.string().min(12).max(200),
  token: z.string().max(256),
});

export async function POST(req: Request) {
  if (await isInstallComplete()) return NextResponse.json({ error: "Setup is already complete." }, { status: 409 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter your setup code, name, email, and a password of at least 12 characters." }, { status: 400 });
  if (!validInstallToken(parsed.data.token)) return NextResponse.json({ error: "The setup code doesn't match. Copy INSTALL_TOKEN from your installation's .env file." }, { status: 403 });
  const { name, email, password } = parsed.data;
  const passwordHash = await hashPassword(password);
  // One owner, even when two setup requests arrive together. The marker and
  // owner account commit together so reloads cannot accidentally close setup.
  const result = await db.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(734190261)`;
    if (await tx.setting.findUnique({ where: { key: SETTING_KEYS.INSTALL_COMPLETED_AT } })) return null;
    const marker = await tx.setting.findUnique({ where: { key: INSTALL_OWNER_KEY } });
    if (marker) {
      const owner = await tx.user.findUnique({ where: { id: String(marker.value) } });
      if (!owner || owner.email !== email || !(await verifyPassword(owner.passwordHash, password))) return null;
      return owner.id;
    }
    if (await tx.user.findFirst({ where: { role: "ADMIN" } })) return null;
    if (await tx.user.findUnique({ where: { email } })) return null;
    const owner = await tx.user.create({ data: { name, email, passwordHash, role: "ADMIN", plan: "TEAM", emailVerified: new Date() } });
    await tx.setting.create({ data: { key: INSTALL_OWNER_KEY, value: owner.id } });
    return owner.id;
  });
  if (!result) return NextResponse.json({ error: "Setup already has an owner. To resume, enter the same owner email and password." }, { status: 409 });
  await createSession(result);
  return NextResponse.json({ ok: true });
}
