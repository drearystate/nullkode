import { z } from "zod";
import type { Flow, Project, User } from "@prisma/client";
import { db } from "@/lib/db";
import { ownedProject, checkScheduledFlows, moreHint } from "@/lib/guard";
import { json } from "@/lib/utils";
import { AI_MIN_MINUTES, graphUsesAi, serializeSchedule, validateSchedule } from "@/lib/flow/schedule-spec";
import { flowScheduleState, plannedNextRun } from "@/lib/flow/scheduler";

export const dynamic = "force-dynamic";

/**
 * When a flow runs: "when the app calls it" (HTTP) or on a schedule.
 *   GET  → the picker's state: schedule, live/draft difference, next and
 *          last run, pause, plan.
 *   PUT  { mode: "app" }                   → stop the schedule
 *        { mode: "schedule", schedule }    → run on this schedule
 *        { resume: true }                  → un-pause after repeated failures
 */

const Body = z.union([
  z.object({ mode: z.literal("app") }),
  z.object({ mode: z.literal("schedule"), schedule: z.unknown() }),
  z.object({ resume: z.literal(true) }),
]);

type Ctx = { params: Promise<{ id: string; flowId: string }> };

type Loaded = { user: User; project: Project; flow: Flow };

async function load(id: string, flowId: string): Promise<Loaded | { error: Response }> {
  const r = await ownedProject(id);
  if (r.error) return { error: r.error };
  const flow = await db.flow.findFirst({ where: { id: flowId, projectId: id } });
  if (!flow) return { error: json({ error: "Not found" }, { status: 404 }) };
  return { user: r.user, project: r.project, flow };
}

async function stateResponse(flowId: string, project: { published: boolean; liveDeploymentId: string | null }, userId: string) {
  const [flow, owner] = await Promise.all([
    db.flow.findUnique({ where: { id: flowId } }),
    db.user.findUnique({ where: { id: userId }, include: { reseller: { select: { status: true } }, ownedReseller: { select: { status: true } } } }),
  ]);
  if (!flow || !owner) return json({ error: "Not found" }, { status: 404 });
  const state = await flowScheduleState(flow, project, owner);
  return json({ ...state, planHint: state.planAllows ? null : await moreHint(owner) });
}

export async function GET(_req: Request, ctx: Ctx) {
  const { id, flowId } = await ctx.params;
  const r = await load(id, flowId);
  if ("error" in r) return r.error;
  return stateResponse(flowId, r.project, r.user.id);
}

export async function PUT(req: Request, ctx: Ctx) {
  const { id, flowId } = await ctx.params;
  const r = await load(id, flowId);
  if ("error" in r) return r.error;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "Choose when this should run." }, { status: 400 });
  const body = parsed.data;
  const { flow, project } = r;

  if ("resume" in body) {
    const next = flow.trigger === "SCHEDULE" && flow.enabled ? await plannedNextRun(flow, project.liveDeploymentId) : null;
    await db.flow.update({
      where: { id: flow.id },
      data: { pausedReason: null, consecutiveFailures: 0, nextRunAt: next, scheduleDeploymentId: project.liveDeploymentId },
    });
    return stateResponse(flow.id, project, r.user.id);
  }

  if (body.mode === "app") {
    await db.flow.update({
      where: { id: flow.id },
      // Keep the chosen times so switching back restores them.
      data: { ...(flow.trigger === "SCHEDULE" ? { trigger: "HTTP" as const } : {}), nextRunAt: null, pausedReason: null, consecutiveFailures: 0 },
    });
    return stateResponse(flow.id, project, r.user.id);
  }

  const planError = await checkScheduledFlows(r.user);
  if (planError) return planError;
  const v = validateSchedule(body.schedule);
  if (!v.ok) return json({ error: v.error }, { status: 400 });
  if (v.spec.kind === "every" && v.spec.minutes < AI_MIN_MINUTES && graphUsesAi(flow.graph)) {
    return json(
      { error: `This flow uses AI, so it can run at most every ${AI_MIN_MINUTES} minutes. That keeps a schedule from using up your AI allowance.` },
      { status: 400 },
    );
  }
  const updated = { ...flow, trigger: "SCHEDULE" as const, schedule: serializeSchedule(v.spec) };
  const next = updated.enabled ? await plannedNextRun(updated, project.liveDeploymentId) : null;
  await db.flow.update({
    where: { id: flow.id },
    data: {
      trigger: "SCHEDULE",
      schedule: updated.schedule,
      nextRunAt: next,
      scheduleDeploymentId: project.liveDeploymentId,
      pausedReason: null,
      consecutiveFailures: 0,
    },
  });
  return stateResponse(flow.id, project, r.user.id);
}
