import { z } from "zod";
import { db } from "@/lib/db";
import { getRealUser } from "@/lib/auth";
import { json } from "@/lib/utils";
import { findUserByEmail, issueAccountLink, normalizeEmail, placeholderPasswordHash } from "@/lib/reseller-admin";
import { resellerSlug } from "@/lib/reseller";

const quota = z.number().int().min(0).max(1_000_000).nullable().optional();
const Body = z.object({
  name: z.string().trim().min(2, "Enter the reseller's brand name.").max(60),
  ownerEmail: z.string().email("Enter the reseller's email address."),
  ownerName: z.string().trim().max(100).optional(),
  maxClients: quota,
  maxApps: quota,
  maxAiActions: quota,
});

/**
 * Create a reseller. A new email gets an invitation; an existing customer
 * (not already a reseller or a reseller's client) is upgraded in place.
 */
export async function POST(req: Request) {
  const admin = await getRealUser();
  if (admin?.role !== "ADMIN") return json({ error: "Forbidden" }, { status: 403 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? "Check the form." }, { status: 400 });
  const { name, ownerName, maxClients, maxApps, maxAiActions } = parsed.data;
  const email = normalizeEmail(parsed.data.ownerEmail);

  let owner = await findUserByEmail(email);
  if (owner) {
    if (owner.role === "ADMIN") return json({ error: "Administrators can't also be resellers. Use a different email." }, { status: 409 });
    if (owner.role === "RESELLER") return json({ error: "That account is already a reseller." }, { status: 409 });
    if (owner.resellerId) return json({ error: "That account is a client of another reseller." }, { status: 409 });
  }
  let slug = resellerSlug(name);
  for (let i = 2; await db.reseller.findUnique({ where: { slug }, select: { id: true } }); i++) slug = `${resellerSlug(name)}-${i}`;

  let invite: { link: string; emailed: boolean } | null = null;
  if (!owner) {
    owner = await db.user.create({ data: { email, name: ownerName || null, passwordHash: await placeholderPasswordHash(), role: "RESELLER" } });
  } else {
    owner = await db.user.update({ where: { id: owner.id }, data: { role: "RESELLER" } });
  }
  const reseller = await db.reseller.create({
    data: { ownerId: owner.id, name, slug, maxClients: maxClients ?? null, maxApps: maxApps ?? null, maxAiActions: maxAiActions ?? null },
  });
  if (!owner.emailVerified) invite = await issueAccountLink(owner, "invite", "The platform team");
  return json({ reseller: { id: reseller.id, name: reseller.name, ownerId: owner.id }, invite });
}
