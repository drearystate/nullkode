import type { User } from "@prisma/client";
import { db } from "./db";
import { limitsForUser } from "./plan-limits";
import { json } from "./utils";

/**
 * Monthly AI allowance. Every AI action — an app build, a Designer run, an
 * Ask-AI edit, AI sample data, an AI step in a published app's flow — counts
 * against the owner's plan (and, for a reseller's clients, the reseller's
 * monthly cap). The operator pays for the AI, so every plan can limit it.
 */
export type AiKind = "build" | "designer" | "edit" | "seed" | "flow";

function monthStart(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

function nextMonthLabel(now = new Date()): string {
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return next.toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" });
}

export async function aiUsageThisMonth(userId: string): Promise<number> {
  return db.aiUsage.count({ where: { userId, createdAt: { gte: monthStart() } } });
}

export type AiAllowance = { used: number; limit: number | null };

export async function aiAllowance(user: Pick<User, "id" | "plan" | "role" | "resellerId">): Promise<AiAllowance> {
  const limits = await limitsForUser(user);
  return { used: await aiUsageThisMonth(user.id), limit: Number.isFinite(limits.aiActionsPerMonth) ? limits.aiActionsPerMonth : null };
}

/** Why this user can't run an AI action right now, or null if they can. */
export async function aiQuotaProblem(user: Pick<User, "id" | "plan" | "role" | "resellerId">): Promise<string | null> {
  if (user.role === "ADMIN") return null;
  const { used, limit } = await aiAllowance(user);
  if (limit !== null && used >= limit) {
    return `You've used all ${limit} AI actions included in your plan this month. They reset on ${nextMonthLabel()}. Upgrade your plan for more.`;
  }
  if (user.resellerId) {
    const reseller = await db.reseller.findUnique({ where: { id: user.resellerId }, select: { maxAiActions: true, name: true } });
    if (reseller?.maxAiActions != null) {
      const pooled = await db.aiUsage.count({ where: { createdAt: { gte: monthStart() }, user: { resellerId: user.resellerId } } });
      if (pooled >= reseller.maxAiActions) return `AI is paused for this workspace until ${nextMonthLabel()}. Please contact ${reseller.name}.`;
    }
  }
  return null;
}

/** 429 response when the allowance is used up, else null. */
export async function checkAiQuota(user: Pick<User, "id" | "plan" | "role" | "resellerId">): Promise<Response | null> {
  const problem = await aiQuotaProblem(user);
  return problem ? json({ error: problem, code: "ai_quota" }, { status: 429 }) : null;
}

export async function recordAiUsage(userId: string, kind: AiKind, projectId?: string | null): Promise<void> {
  await db.aiUsage.create({ data: { userId, kind, projectId: projectId ?? null } }).catch((err) => {
    console.error("[ai-quota] couldn't record usage", err instanceof Error ? err.message : err);
  });
}
