import { checkPublishLimit } from "@/lib/guard";
import { publishDraft } from "@/lib/deployments";
import { errorsT } from "@/lib/errors-i18n";
import { db } from "@/lib/db";
import { fromStudioRefusal, ok, partnerRoute, PartnerError } from "@/lib/partner/api";
import { projectView, scopedProject } from "@/lib/partner/scope";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Publishes an app's current draft, like the studio's Publish button: the
 * owner's plan limit on live apps applies (except to an app that is
 * already live, which is just updated).
 */
export const POST = partnerRoute<{ id: string }>({ permission: "publish", idempotent: true, limit: "publish" }, async (ctx, { id }) => {
  const project = await scopedProject(ctx.key, id);
  if (!project) throw new PartnerError(404, "not_found", ctx.t("notFound"));
  ctx.audit.userId = project.ownerId;
  ctx.audit.projectId = project.id;
  if (!project.published) {
    const limit = await checkPublishLimit(project.owner, errorsT(ctx.locale));
    if (limit) return fromStudioRefusal(limit, "plan_limit");
  }
  const { version } = await publishDraft(project.id, project.ownerId);
  const fresh = await db.project.findUniqueOrThrow({ where: { id: project.id } });
  return ok({ ok: true, version, project: await projectView(fresh) });
});
