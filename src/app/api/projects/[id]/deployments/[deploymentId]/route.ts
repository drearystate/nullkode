import { db } from "@/lib/db";
import { ownedProject, checkPublishLimit } from "@/lib/guard";
import { json } from "@/lib/utils";
import { getTranslations } from "next-intl/server";
import { requestLocale } from "@/i18n/request";

/** Make an earlier published version live again (rollback). */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string; deploymentId: string }> }) {
  const { id, deploymentId } = await ctx.params;
  const r = await ownedProject(id);
  if ("error" in r) return r.error;
  const deployment = await db.deployment.findFirst({ where: { id: deploymentId, projectId: id }, select: { id: true, version: true } });
  if (!deployment) {
    const t = await getTranslations({ locale: await requestLocale(), namespace: "project.deploymentsApi" });
    return json({ error: t("versionMissing") }, { status: 404 });
  }
  if (!r.project.published) {
    const limitError = await checkPublishLimit(r.user);
    if (limitError) return limitError;
  }
  await db.project.update({
    where: { id },
    data: { liveDeploymentId: deployment.id, published: true, publishedAt: new Date() },
  });
  void import("@/lib/native/compile").then((m) => m.scheduleNativeCompile(id, deployment.id)).catch(() => {});
  return json({ ok: true, version: deployment.version });
}
