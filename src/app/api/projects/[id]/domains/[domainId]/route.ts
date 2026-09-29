import { db } from "@/lib/db";
import { ownedProject } from "@/lib/guard";
import { json } from "@/lib/utils";
import { promises as dns } from "dns";
import { platformTargetHost } from "@/lib/reseller";

export async function PATCH(
  _req: Request,
  ctx: { params: Promise<{ id: string; domainId: string }> }
) {
  const { id, domainId } = await ctx.params;
  const r = await ownedProject(id);
  if ("error" in r) return r.error;
  const domain = await db.domain.findFirst({
    where: { id: domainId, projectId: id },
  });
  if (!domain) return json({ error: "Not found" }, { status: 404 });

  // Ownership: a TXT record at _verify.<host> (older setups used _nullkode.<host>).
  let verified = false;
  for (const name of [`_verify.${domain.host}`, `_nullkode.${domain.host}`]) {
    try {
      if ((await dns.resolveTxt(name)).flat().join(" ").includes(domain.verifyToken)) verified = true;
    } catch {}
  }
  // Routing (informational): does the domain resolve to this server?
  const addrs = async (h: string) => {
    const out = new Set<string>();
    try { for (const a of await dns.resolve4(h)) out.add(a); } catch {}
    try { for (const a of await dns.resolve6(h)) out.add(a); } catch {}
    return out;
  };
  const [mine, theirs] = await Promise.all([addrs(platformTargetHost()), addrs(domain.host)]);
  const pointsHere = [...theirs].some((a) => mine.has(a));

  const updated = await db.domain.update({
    where: { id: domainId },
    data: verified
      ? { status: "ACTIVE", verifiedAt: domain.verifiedAt ?? new Date() }
      : { status: domain.status === "ACTIVE" ? "ACTIVE" : "FAILED" },
  });
  return json({ domain: updated, owned: verified, pointsHere });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string; domainId: string }> }
) {
  const { id, domainId } = await ctx.params;
  const r = await ownedProject(id);
  if ("error" in r) return r.error;
  const removed = await db.domain.deleteMany({ where: { id: domainId, projectId: id } });
  if (!removed.count) return json({ error: "Not found" }, { status: 404 });
  return json({ ok: true });
}
