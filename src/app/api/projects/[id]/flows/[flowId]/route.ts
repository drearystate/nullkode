import { z } from "zod";
import { db } from "@/lib/db";
import { ownedProject, checkScheduledFlows } from "@/lib/guard";
import { json } from "@/lib/utils";
import { plannedNextRun } from "@/lib/flow/scheduler";

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
  const r = await ownedProject(id);
  if ("error" in r) return r.error;
  const flow = await db.flow.findFirst({ where: { id: flowId, projectId: id } });
  if (!flow) return json({ error: "Not found" }, { status: 404 });
  return json({ flow });
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string; flowId: string }> }
) {
  const { id, flowId } = await ctx.params;
  const r = await ownedProject(id);
  if ("error" in r) return r.error;
  const parsed = PatchBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "Invalid input" }, { status: 400 });

  // Check plan when setting a schedule trigger or schedule expression
  if (parsed.data.trigger === "SCHEDULE" || parsed.data.schedule) {
    const scheduleError = await checkScheduledFlows(r.user);
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

  // Scope to this project: owning one app must not unlock another app's flows.
  const { count } = await db.flow.updateMany({ where: { id: flowId, projectId: id }, data: { ...parsed.data, ...replan } });
  if (!count) return json({ error: "Not found" }, { status: 404 });
  const flow = await db.flow.findUnique({ where: { id: flowId } });
  return json({ flow });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string; flowId: string }> }
) {
  const { id, flowId } = await ctx.params;
  const r = await ownedProject(id);
  if ("error" in r) return r.error;
  const { count } = await db.flow.deleteMany({ where: { id: flowId, projectId: id } });
  if (!count) return json({ error: "Not found" }, { status: 404 });
  return json({ ok: true });
}
