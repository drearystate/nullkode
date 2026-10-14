import { z } from "zod";
import { db } from "@/lib/db";
import { ownedProject, checkScheduledFlows } from "@/lib/guard";
import { json } from "@/lib/utils";
import { plannedNextRun } from "@/lib/flow/scheduler";
import { getTranslations } from "next-intl/server";
import { requestLocale } from "@/i18n/request";
import { appSecretValues, graphFor, keepHiddenValues } from "@/lib/sharing/redact";
import { noteEdit } from "@/lib/sharing/audit";

/** An error message in the owner's language (only looked up when there is one). */
async function msg(key: "notFound" | "invalidInput") {
  const t = await getTranslations({ locale: await requestLocale(), namespace: "flows.api" });
  return t(key);
}

const PatchBody = z.object({
  name: z.string().min(1).max(80).optional(),
  httpPath: z.string().max(120).optional(),
  httpMethod: z.string().max(10).optional(),
  trigger: z.enum(["HTTP", "FORM_SUBMIT", "SCHEDULE", "EVENT"]).optional(),
  schedule: z.string().max(120).optional(),
  enabled: z.boolean().optional(),
  graph: z.any().optional(),
});

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string; flowId: string }> }
) {
  const { id, flowId } = await ctx.params;
  const r = await ownedProject(id, "view");
  if ("error" in r) return r.error;
  const flow = await db.flow.findFirst({ where: { id: flowId, projectId: id } });
  if (!flow) return json({ error: await msg("notFound") }, { status: 404 });
  // Collaborators see the owner's private keys blanked (lib/sharing/redact.ts).
  if (r.role !== "owner") return json({ flow: { ...flow, graph: graphFor(r.role, flow.graph, await appSecretValues(id)) } });
  return json({ flow });
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string; flowId: string }> }
) {
  const { id, flowId } = await ctx.params;
  const r = await ownedProject(id, "edit");
  if ("error" in r) return r.error;
  const parsed = PatchBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: await msg("invalidInput") }, { status: 400 });

  // Check plan when setting a schedule trigger or schedule expression
  if (parsed.data.trigger === "SCHEDULE" || parsed.data.schedule) {
    // The app's plan decides (an editor's own plan doesn't matter here).
    const scheduleError = await checkScheduledFlows(r.owner);
    if (scheduleError) return scheduleError;
  }

  // A schedule turned back on starts from now: a run it missed while paused
  // doesn't go off the moment it's resumed.
  let replan = {};
  if (parsed.data.enabled === true) {
    const before = await db.flow.findFirst({ where: { id: flowId, projectId: id } });
    const after = before && { ...before, ...parsed.data, trigger: parsed.data.trigger ?? before.trigger };
    if (before && after && !before.enabled && after.trigger === "SCHEDULE") {
      replan = { nextRunAt: await plannedNextRun(after, r.project.liveDeploymentId), scheduleDeploymentId: r.project.liveDeploymentId };
    }
  }

  // A collaborator's save keeps the owner's private keys they were shown blanked.
  const data = { ...parsed.data };
  if (r.role !== "owner" && data.graph !== undefined) {
    const current = await db.flow.findFirst({ where: { id: flowId, projectId: id }, select: { graph: true } });
    if (current) data.graph = keepHiddenValues(r.role, data.graph, current.graph, await appSecretValues(id));
  }
  // Scope to this project: owning one app must not unlock another app's flows.
  const { count } = await db.flow.updateMany({ where: { id: flowId, projectId: id }, data: { ...data, ...replan } });
  if (!count) return json({ error: await msg("notFound") }, { status: 404 });
  const flow = await db.flow.findUnique({ where: { id: flowId } });
  await noteEdit("app", id, r.user.id, "flow.save", { subjectId: flowId, label: flow?.name });
  if (flow && r.role !== "owner") return json({ flow: { ...flow, graph: graphFor(r.role, flow.graph, await appSecretValues(id)) } });
  return json({ flow });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string; flowId: string }> }
) {
  const { id, flowId } = await ctx.params;
  const r = await ownedProject(id, "edit");
  if ("error" in r) return r.error;
  const gone = await db.flow.findFirst({ where: { id: flowId, projectId: id }, select: { name: true } });
  const { count } = await db.flow.deleteMany({ where: { id: flowId, projectId: id } });
  if (!count) return json({ error: await msg("notFound") }, { status: 404 });
  await noteEdit("app", id, r.user.id, "flow.delete", { subjectId: flowId, label: gone?.name });
  return json({ ok: true });
}
