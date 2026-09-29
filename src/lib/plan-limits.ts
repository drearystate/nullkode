import type { Plan, User } from "@prisma/client";
import { db } from "./db";
import { getSetting, setSetting } from "./settings";

export interface PlanLimits {
  /** Max projects a user can create */
  maxProjects: number;
  /** Max projects that can be published simultaneously */
  maxPublished: number;
  /** Max pages per project */
  maxPagesPerProject: number;
  /** Max custom domains across all projects */
  maxCustomDomains: number;
  /** Whether scheduled flows are allowed */
  scheduledFlows: boolean;
  /** AI actions (builds, Designer runs, AI edits, AI flow steps) per calendar month */
  aiActionsPerMonth: number;
}

const DEFAULTS: Record<Plan, PlanLimits> = {
  // Generous enough to build and launch a real small-business app for free:
  // pages cost nothing, and an own domain is part of launching.
  FREE: {
    maxProjects: 5,
    maxPublished: 3,
    maxPagesPerProject: Infinity,
    maxCustomDomains: 1,
    scheduledFlows: false,
    aiActionsPerMonth: 30,
  },
  STARTER: {
    maxProjects: 5,
    maxPublished: 5,
    maxPagesPerProject: Infinity,
    maxCustomDomains: 1,
    scheduledFlows: false,
    aiActionsPerMonth: 300,
  },
  PRO: {
    maxProjects: 25,
    maxPublished: 25,
    maxPagesPerProject: Infinity,
    maxCustomDomains: 5,
    scheduledFlows: true,
    aiActionsPerMonth: 1500,
  },
  TEAM: {
    maxProjects: Infinity,
    maxPublished: Infinity,
    maxPagesPerProject: Infinity,
    maxCustomDomains: Infinity,
    scheduledFlows: true,
    aiActionsPerMonth: Infinity,
  },
};

export const PLAN_LIMITS_KEY = "plans.limits";

/**
 * Wire format for plan-limits stored in the Setting table. Numbers travel
 * as `number | null` because Infinity is not JSON-serialisable — null means
 * "unlimited". A missing plan or missing field falls back to DEFAULTS.
 */
export type StoredPlanLimits = Partial<
  Record<
    Plan,
    Partial<{
      maxProjects: number | null;
      maxPublished: number | null;
      maxPagesPerProject: number | null;
      maxCustomDomains: number | null;
      scheduledFlows: boolean;
      aiActionsPerMonth: number | null;
    }>
  >
>;

const CACHE_TTL_MS = 5_000;
let cache: { at: number; value: Record<Plan, PlanLimits> } | null = null;

function decodeNumber(stored: number | null | undefined, fallback: number): number {
  if (stored === null) return Infinity;
  if (typeof stored === "number" && Number.isFinite(stored) && stored >= 0) return stored;
  return fallback;
}

/** Stored limits merged over a base (the defaults, or the platform's limits for a reseller). */
export function mergePlanLimits(stored: StoredPlanLimits, base: Record<Plan, PlanLimits> = DEFAULTS): Record<Plan, PlanLimits> {
  const merged = {} as Record<Plan, PlanLimits>;
  for (const plan of Object.keys(DEFAULTS) as Plan[]) {
    const d = base[plan];
    const o = stored[plan];
    merged[plan] = o
      ? {
          maxProjects: decodeNumber(o.maxProjects, d.maxProjects),
          maxPublished: decodeNumber(o.maxPublished, d.maxPublished),
          maxPagesPerProject: decodeNumber(o.maxPagesPerProject, d.maxPagesPerProject),
          maxCustomDomains: decodeNumber(o.maxCustomDomains, d.maxCustomDomains),
          scheduledFlows: typeof o.scheduledFlows === "boolean" ? o.scheduledFlows : d.scheduledFlows,
          aiActionsPerMonth: decodeNumber(o.aiActionsPerMonth, d.aiActionsPerMonth),
        }
      : { ...d };
  }
  return merged;
}

async function load(): Promise<Record<Plan, PlanLimits>> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.value;
  const merged = mergePlanLimits((await getSetting<StoredPlanLimits>(PLAN_LIMITS_KEY)) ?? {});
  cache = { at: Date.now(), value: merged };
  return merged;
}

export async function limitsFor(plan: Plan): Promise<PlanLimits> {
  const all = await load();
  return all[plan];
}

export const UNLIMITED: PlanLimits = {
  maxProjects: Infinity,
  maxPublished: Infinity,
  maxPagesPerProject: Infinity,
  maxCustomDomains: Infinity,
  scheduledFlows: true,
  aiActionsPerMonth: Infinity,
};

/** Per-plan limits a reseller offers its clients (the platform's limits where unset). */
export async function resellerPlanLimits(stored: unknown): Promise<Record<Plan, PlanLimits>> {
  return mergePlanLimits((stored ?? {}) as StoredPlanLimits, await load());
}

/**
 * The limits that apply to this user. The operator (ADMIN) and resellers are
 * never blocked by plan limits — resellers are bounded by the quotas the
 * operator sets instead (see guard.ts). A reseller's clients get the limits
 * that reseller offers.
 */
export async function limitsForUser(user: Pick<User, "plan" | "role" | "resellerId">): Promise<PlanLimits> {
  if (user.role === "ADMIN" || user.role === "RESELLER") return UNLIMITED;
  if (user.resellerId) {
    const reseller = await db.reseller.findUnique({ where: { id: user.resellerId }, select: { planLimits: true } });
    if (reseller) return (await resellerPlanLimits(reseller.planLimits))[user.plan];
  }
  return limitsFor(user.plan);
}

export async function getAllPlanLimits(): Promise<Record<Plan, PlanLimits>> {
  return load();
}

export function defaultPlanLimits(): Record<Plan, PlanLimits> {
  return Object.fromEntries(
    (Object.keys(DEFAULTS) as Plan[]).map((p) => [p, { ...DEFAULTS[p] }]),
  ) as Record<Plan, PlanLimits>;
}

export async function setPlanLimits(stored: StoredPlanLimits): Promise<void> {
  await setSetting(PLAN_LIMITS_KEY, stored);
  cache = null;
}

export function invalidatePlanLimitsCache(): void {
  cache = null;
}

const VALID_PLANS: Plan[] = ["FREE", "STARTER", "PRO", "TEAM"];
const NUMERIC_FIELDS = [
  "maxProjects",
  "maxPublished",
  "maxPagesPerProject",
  "maxCustomDomains",
  "aiActionsPerMonth",
] as const;

/** Validates plan limits sent by the admin or reseller settings screens. */
export function parsePlanLimits(input: unknown): { ok: true; value: StoredPlanLimits } | { ok: false; error: string } {
  if (!input || typeof input !== "object") return { ok: false, error: "plans.limits must be an object" };
  const obj = input as Record<string, unknown>;
  const out: StoredPlanLimits = {};
  for (const [plan, raw] of Object.entries(obj)) {
    if (!VALID_PLANS.includes(plan as Plan)) {
      return { ok: false, error: `Unknown plan: ${plan}` };
    }
    if (!raw || typeof raw !== "object") {
      return { ok: false, error: `plans.limits.${plan} must be an object` };
    }
    const r = raw as Record<string, unknown>;
    const entry: NonNullable<StoredPlanLimits[Plan]> = {};
    for (const field of NUMERIC_FIELDS) {
      const v = r[field];
      if (v === undefined) continue;
      if (v === null) {
        entry[field] = null;
      } else if (typeof v === "number" && Number.isFinite(v) && v >= 0 && Number.isInteger(v)) {
        entry[field] = v;
      } else {
        return { ok: false, error: `plans.limits.${plan}.${field} must be a non-negative integer or null` };
      }
    }
    if (typeof r.scheduledFlows === "boolean") {
      entry.scheduledFlows = r.scheduledFlows;
    } else if (r.scheduledFlows !== undefined) {
      return { ok: false, error: `plans.limits.${plan}.scheduledFlows must be boolean` };
    }
    out[plan as Plan] = entry;
  }
  return { ok: true, value: out };
}
