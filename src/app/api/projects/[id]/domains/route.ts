import { z } from "zod";
import { db } from "@/lib/db";
import { ownedProject, checkDomainLimit } from "@/lib/guard";
import { json } from "@/lib/utils";
import { nanoid } from "nanoid";
import { isPlatformHost, isValidDomainName, normalizeHost } from "@/lib/hosts";
import { getTranslations } from "next-intl/server";
import { requestLocale } from "@/i18n/request";

const CreateBody = z.object({ host: z.string().min(3).max(253) });

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const r = await ownedProject(id);
  if ("error" in r) return r.error;

  const limitError = await checkDomainLimit(r.user);
  if (limitError) return limitError;

  const t = await getTranslations({ locale: await requestLocale(), namespace: "project.domainsApi" });
  const parsed = CreateBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: t("enterDomain") }, { status: 400 });
  const host = normalizeHost(parsed.data.host.replace(/^https?:\/\//i, "").split("/")[0]);
  if (!isValidDomainName(host)) return json({ error: t("invalidDomain") }, { status: 400 });
  if (isPlatformHost(host)) return json({ error: t("platformAddress") }, { status: 400 });
  const [existing, resellerDomain] = await Promise.all([
    db.domain.findUnique({ where: { host } }),
    db.reseller.findFirst({ where: { domain: host }, select: { id: true } }),
  ]);
  if (existing || resellerDomain) return json({ error: t("alreadyConnected") }, { status: 409 });
  const domain = await db.domain.create({
    data: {
      projectId: id,
      host,
      verifyToken: `verify-${nanoid(24)}`,
    },
  });
  return json({ domain });
}
