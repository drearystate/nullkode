import type { PartnerKey } from "@prisma/client";
import { db } from "../db";
import { loadRun, type RunSnapshot, type ScaffoldEvent } from "../ai/runs";
import { inScope, projectView } from "./scope";
import type { StartRefusal } from "../ai/app-builds";

/**
 * The partner error code for each refusal of the studio's shared plan and
 * build code (lib/ai/app-builds.ts). Reference image refusals keep their
 * own codes (docs/partner-api.md, "Reference images").
 */
export const START_REFUSAL_CODES: Record<StartRefusal, string> = {
  unauthorized: "not_found",
  invalid_request: "invalid_request",
  ai_quota: "ai_quota_exceeded",
  plan_limit: "plan_limit",
  rate_limited: "rate_limited",
  build_not_allowed: "build_not_allowed",
  images_not_supported: "images_not_supported",
  image_too_large: "image_too_large",
  image_type: "image_type",
  too_many_images: "too_many_images",
  image_fetch_failed: "image_fetch_failed",
  invalid_images: "invalid_request",
  references_not_found: "references_not_found",
};

/**
 * A plan or build run as the partner API shows it: status, the person-facing
 * progress messages, and the outcome (the plan, or the new app with its
 * links). Raw AI tokens are left out.
 */
export async function runView(run: RunSnapshot) {
  const events = run.events.filter((e): e is Exclude<ScaffoldEvent, { type: "token" }> => e.type !== "token");
  const planned = [...events].reverse().find((e) => e.type === "planned") as Extract<ScaffoldEvent, { type: "planned" }> | undefined;
  const project = run.kind === "scaffold" && run.status === "success" && run.result?.projectId
    ? await db.project.findUnique({ where: { id: run.result.projectId }, select: { id: true, name: true, slug: true, kind: true, published: true, publishedAt: true, createdAt: true, updatedAt: true, ownerId: true, hostLabel: true } })
    : null;
  const progress = events.filter((e) => e.type === "progress") as Array<Extract<ScaffoldEvent, { type: "progress" }>>;
  return {
    id: run.id,
    kind: run.kind === "scaffold" ? "build" : "plan",
    userId: run.ownerId,
    status: run.status,
    message: progress.length ? progress[progress.length - 1].message : null,
    progress: progress.slice(-50).map((e) => ({ step: e.step, message: e.message, ...(e.name ? { name: e.name } : {}) })),
    plan: run.kind === "plan" && planned ? planned.plan : null,
    // Reference images: send referenceId with POST /builds (or a plan revision) to reuse them.
    references: run.meta?.references
      ? { id: run.meta.references.id, count: run.meta.references.count, brief: run.meta.references.brief ?? null }
      : null,
    project: project ? await projectView(project) : null,
    error: run.status === "error" ? run.error : null,
    // "build_not_allowed" when the build rule refused it while it ran (docs/partner-api.md).
    errorCode: run.status === "error" ? (typeof run.meta?.errorCode === "string" ? run.meta.errorCode : "failed") : null,
    refunded: run.refunded,
    createdAt: new Date(run.createdAt).toISOString(),
    updatedAt: new Date(run.updatedAt).toISOString(),
    endedAt: run.endedAt ? new Date(run.endedAt).toISOString() : null,
  };
}

/** The run, when its owner is inside the key's scope. */
export async function scopedRun(key: Pick<PartnerKey, "resellerId">, id: string): Promise<RunSnapshot | null> {
  const run = await loadRun(id);
  if (!run) return null;
  const owner = await db.user.findUnique({ where: { id: run.ownerId }, select: { role: true, resellerId: true } });
  return owner && inScope(key, owner) ? run : null;
}
