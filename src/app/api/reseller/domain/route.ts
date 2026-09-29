import { promises as dns } from "dns";
import { nanoid } from "nanoid";
import { z } from "zod";
import { db } from "@/lib/db";
import { json } from "@/lib/utils";
import { isPlatformHost, isValidDomainName, normalizeHost } from "@/lib/hosts";
import { requireReseller } from "@/lib/reseller-admin";
import { forgetResellerHosts, platformTargetHost } from "@/lib/reseller";

const Body = z.object({ domain: z.string().max(253).nullable() });

/** Set (or remove) the domain the reseller's clients use, e.g. apps.agency.com. */
export async function PATCH(req: Request) {
  const r = await requireReseller();
  if ("error" in r) return r.error;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "Enter a domain name." }, { status: 400 });
  const raw = parsed.data.domain?.trim() ?? "";
  if (!raw) {
    await db.reseller.update({ where: { id: r.reseller.id }, data: { domain: null, domainToken: null, domainVerifiedAt: null } });
    forgetResellerHosts();
    return json({ ok: true, domain: null });
  }
  const domain = normalizeHost(raw.replace(/^https?:\/\//i, "").split("/")[0]);
  if (!isValidDomainName(domain)) return json({ error: "Enter a domain like apps.youragency.com (no https:// or paths)." }, { status: 400 });
  if (isPlatformHost(domain)) return json({ error: "That domain belongs to the platform." }, { status: 400 });
  const [otherReseller, appDomain] = await Promise.all([
    db.reseller.findFirst({ where: { domain, id: { not: r.reseller.id } }, select: { id: true } }),
    db.domain.findFirst({ where: { host: domain }, select: { id: true } }),
  ]);
  if (otherReseller || appDomain) return json({ error: "That domain is already in use here." }, { status: 409 });
  if (domain === r.reseller.domain) return json({ ok: true, domain, token: r.reseller.domainToken });
  const token = `verify-${nanoid(24)}`;
  await db.reseller.update({ where: { id: r.reseller.id }, data: { domain, domainToken: token, domainVerifiedAt: null } });
  forgetResellerHosts();
  return json({ ok: true, domain, token, target: platformTargetHost() });
}

async function addresses(host: string): Promise<Set<string>> {
  const out = new Set<string>();
  try { for (const a of await dns.resolve4(host)) out.add(a); } catch { /* none */ }
  try { for (const a of await dns.resolve6(host)) out.add(a); } catch { /* none */ }
  return out;
}

/** Check the TXT record proves ownership, and whether the domain reaches this server. */
export async function POST() {
  const r = await requireReseller();
  if ("error" in r) return r.error;
  const { domain, domainToken } = r.reseller;
  if (!domain || !domainToken) return json({ error: "Add a domain first." }, { status: 400 });
  let owned = false;
  try {
    owned = (await dns.resolveTxt(`_verify.${domain}`)).flat().join(" ").includes(domainToken);
  } catch { /* no record yet */ }
  const [mine, theirs] = await Promise.all([addresses(platformTargetHost()), addresses(domain)]);
  const pointsHere = [...theirs].some((a) => mine.has(a));
  if (owned) {
    await db.reseller.update({ where: { id: r.reseller.id }, data: { domainVerifiedAt: r.reseller.domainVerifiedAt ?? new Date() } });
    forgetResellerHosts();
  }
  return json({ owned, pointsHere, verified: owned });
}
