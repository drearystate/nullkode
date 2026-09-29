import { z } from "zod";
import { db } from "@/lib/db";
import { ownedProject, checkDomainLimit } from "@/lib/guard";
import { json } from "@/lib/utils";
import { nanoid } from "nanoid";
import { isPlatformHost, isValidDomainName, normalizeHost } from "@/lib/hosts";

const CreateBody = z.object({ host: z.string().min(3).max(253) });

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const r = await ownedProject(id);
  if ("error" in r) return r.error;

  const limitError = await checkDomainLimit(r.user);
  if (limitError) return limitError;

  const parsed = CreateBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "Enter a domain name." }, { status: 400 });
  const host = normalizeHost(parsed.data.host.replace(/^https?:\/\//i, "").split("/")[0]);
  if (!isValidDomainName(host)) return json({ error: "Enter a domain like www.yourbusiness.com (no https:// or paths)." }, { status: 400 });
  if (isPlatformHost(host)) return json({ error: "That address belongs to this platform." }, { status: 400 });
  const [existing, resellerDomain] = await Promise.all([
    db.domain.findUnique({ where: { host } }),
    db.reseller.findFirst({ where: { domain: host }, select: { id: true } }),
  ]);
  if (existing || resellerDomain) return json({ error: "That domain is already connected to another app." }, { status: 409 });
  const domain = await db.domain.create({
    data: {
      projectId: id,
      host,
      verifyToken: `verify-${nanoid(24)}`,
    },
  });
  return json({ domain });
}
