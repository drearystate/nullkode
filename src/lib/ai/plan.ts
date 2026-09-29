import { z } from "zod";

/**
 * An app plan: the skeleton the AI proposes before anything is built. The
 * builder shows it to the user, who can rename the app, change its look,
 * drop pages or ask for changes, and the approved plan is what gets built.
 *
 * Strings are trimmed to size rather than rejected, so a wordy model (or an
 * edited plan sent back by the browser) never fails validation over length.
 */
const text = (max: number) => z.string().transform((s) => s.trim().slice(0, max));

export const AppPlanSchema = z.object({
  project: z.object({ name: text(80).pipe(z.string().min(1)), description: text(600).default("") }),
  theme: text(60).default("Clean Slate"),
  assumptions: z.array(text(240)).transform((a) => a.filter(Boolean).slice(0, 6)).catch([]),
  tables: z.array(z.object({
    name: z.string().regex(/^[a-z][a-z0-9_]*$/).max(48),
    fields: z.array(z.object({ name: z.string().regex(/^[a-z][a-z0-9_]*$/).max(48), type: z.enum(["text", "int", "float", "bool", "timestamp", "json"]) })).max(40),
    // Example rows for things visitors pick from (services, menu items…),
    // so a new app works on day one. Up to 8; bad entries are dropped.
    seed: z.array(z.record(z.union([z.string().transform((v) => v.slice(0, 500)), z.number(), z.boolean(), z.null()])))
      .transform((rows) => rows.slice(0, 8)).optional().catch(undefined),
  })).max(12).default([]),
  pages: z.array(z.object({
    slug: z.string().regex(/^[a-z0-9-]+$/).max(60),
    title: text(80).pipe(z.string().min(1)),
    isHome: z.boolean().default(false),
    summary: text(400).default(""),
    requiresAuth: z.boolean().default(false),
    requiresRole: z.string().max(40).nullable().optional(),
  })).min(1).max(12),
  flows: z.array(z.object({
    slug: z.string().regex(/^[a-z0-9-]+$/).max(60),
    name: text(80).pipe(z.string().min(1)),
    purpose: text(400).default(""),
    kind: text(20).default("custom"),
    table: z.string().max(48).nullable().optional(),
    auth: z.boolean().optional(),
  })).max(20).default([]),
});

export type AppPlan = z.infer<typeof AppPlanSchema>;

/** Make a plan internally consistent: one home page, unique slugs, real table references. */
export function normalizePlan(plan: AppPlan): AppPlan {
  const pages = plan.pages.filter((p, i, all) => all.findIndex((q) => q.slug === p.slug) === i);
  const home = pages.findIndex((p) => p.isHome);
  pages.forEach((p, i) => { p.isHome = i === (home >= 0 ? home : 0); });
  const tables = plan.tables.filter((t, i, all) => all.findIndex((q) => q.name === t.name) === i);
  const flows = plan.flows
    .filter((f, i, all) => all.findIndex((q) => q.slug === f.slug) === i)
    .map((f) => (f.table && !tables.some((t) => t.name === f.table) ? { ...f, table: null } : f));
  return { ...plan, pages, tables, flows };
}
