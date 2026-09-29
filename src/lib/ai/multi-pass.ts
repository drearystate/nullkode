import { providerComplete } from "./provider";
import { z } from "zod";
import { AppPlanSchema, normalizePlan, type AppPlan } from "./plan";
import { DESIGN_SYSTEM_RULES, DESIGN_RULES_COMPACT } from "./design-system";
import { findTemplateForPrompt } from "../templates/registry";
import { estimateTokens, isCompactModel } from "./budget";
import { parsePageOutput } from "./text";
import { completeJson } from "./json-call";
import { standardFlowGraph, standardKind, type StandardFlowInfo } from "./standard-flows";
import { canonicalNodeType, isKnownNodeType, NODE_TYPES } from "./node-types";
import { formatViolationsForRepair, type Violation } from "./validate-scaffold";
import { UnusableOutputError } from "./errors";
import type { ScaffoldResult } from "./schema";

export { stripThinking } from "./text";

/**
 * Multi-pass scaffolder shared by all configured providers.
 *
 * The single-pass approach asks the model to produce one big JSON blob
 * (project + theme + tables + every page + every flow). For complex apps
 * that blob easily exceeds the model's response budget, and small models
 * can't produce it at all. Multi-pass splits the work:
 *   Phase 1 (PLAN):  project metadata + theme + tables + page list + flow list.
 *                    Small JSON; validated, with one repair attempt.
 *   Phase 2 (PAGES): one call per page, answered as plain HTML (a <style>
 *                    block + body markup) — no HTML-inside-JSON escaping.
 *   Phase 3 (FLOWS): standard data operations (list/load/create/update/
 *                    delete/count) are built deterministically in code; the
 *                    model only writes genuinely custom logic, and any
 *                    custom flow that fails validation falls back to a safe
 *                    graph instead of failing the whole build.
 *
 * Models with small context windows (see ai/budget.ts) get compact prompts.
 * The final object matches ScaffoldResult so applyScaffold doesn't change.
 */

export type MultiPassEvent =
  | { type: "progress"; message: string }
  | { type: "plan"; totalTables: number; totalPages: number; totalFlows: number }
  | { type: "milestone"; kind: "table" | "page" | "flow"; label: string }
  | { type: "result"; scaffold: ScaffoldResult; plan: AppPlan; compact: boolean };

/* ─────────────────────────── Phase 1: PLAN ─────────────────────────── */

const PLAN_SYSTEM = `You are Nullkode's app planner. The user describes an app in plain English. You return ONLY a JSON object that lays out the app's high-level structure: project metadata, theme, database tables, page list, and flow list. The actual pages and flows are built in later steps — your job is just the skeleton.

CRITICAL OUTPUT RULES:
- Reply with raw JSON ONLY. Start with "{" and end with "}". No prose, no markdown fences, no commentary.
- Use the exact field names below.
- AUTH + SETTINGS ARE PRE-INSTALLED. Do not list auth tables (auth_users), auth pages (login/register/profile/settings), or auth flows (login/register/logout/me/update-profile/list-users/change-role/set-theme-pref). They already exist.
- HONESTY: the project description and assumptions describe only what the user told you — never invent awards, customer numbers, years in business or reviews. Never plan a testimonials or reviews table with made-up entries, and never seed reviews, ratings or quotes: those must come from real people.
- Pick a theme that matches the app's mood. Available themes: Clean Slate, Corporate Trust, Warm Earth, Cherry Blossom, Ocean Breeze, Forest, Spring Garden, Sunset, Autumn Gold, Rose Gold, Newspaper, Minimal Mono, Brutalist, Pastel Dream, Gradient Dream, Desert, Electric, Midnight, Midnight Blue, Charcoal & Amber, Bold Neon, Terminal Green, Ocean Depths, Forest Dark, Purple Rain, Industrial, Royal, Cyberpunk, Copper, Monochrome.
- Tables: snake_case names. Fields are { name (snake_case), type: "text" | "int" | "float" | "bool" | "timestamp" | "json" }. Do NOT include id/created_at/updated_at/created_by — they're auto-managed. DO NOT add a "user_id" column or any per-user ownership column — data is shared across all users by default. Access is gated at the page level, not the row level.
- Pages: aim for 3-6 pages. Each is { slug (kebab-case), title, isHome, summary, requiresAuth, requiresRole }. Exactly one isHome=true. Mark requiresAuth=true for any page that requires the visitor to be signed in. Mark requiresRole="admin" (or another role string) ONLY for admin/staff/manager pages — leave it null otherwise. Public pages (landing, marketing) leave both false/null.
- Flows: aim for 2-10 flows. Each is { slug (kebab-case), name, purpose, kind, table, auth }.
  kind is one of: "list" (all rows of a table), "load" (one row by id), "create" (insert a row from a form), "update" (change a row by id), "delete" (remove a row by id), "aggregate" (a count for a KPI), or "custom" (anything else: emails, calculations, several tables, external APIs).
  table is the table the flow works on (required for every kind except custom; null for custom when no single table applies).
  auth is true when only signed-in visitors may run it (e.g. writes behind a login), else false.
  Queries return all rows — visibility is controlled by which role can see the page, not by who owns the row.
- seed: for tables whose rows visitors CHOOSE FROM or BROWSE (services, products, menu items, classes, rooms, events), include 3-6 realistic example rows for this business as "seed": [{ "<field>": value, ... }] using the table's own field names. Leave "seed" out for tables visitors FILL IN (bookings, messages, orders, sign-ups).
- Every table the owner has to keep up to date (services, products, menu items, classes…) needs an admin page (requiresRole "admin") where they can add new rows and see the list, plus the flows for it.
- assumptions: 2-4 short, plain-English sentences about decisions you made that the user did not spell out — who can see or change what, whether visitors need an account, what gets saved. The user reads these before anything is built, so no jargon and no table, field or flow names.

JSON SHAPE:
{
  "project": { "name": "string", "description": "string" },
  "theme": "Theme Name",
  "assumptions": ["Visitors can book a walk without making an account.", "Only you can see the full list of bookings."],
  "tables": [{ "name": "services", "fields": [{ "name": "name", "type": "text" }, { "name": "price", "type": "float" }], "seed": [{ "name": "Full groom", "price": 55 }] }],
  "pages": [{ "slug": "home", "title": "Home", "isHome": true, "summary": "Hero + features", "requiresAuth": false, "requiresRole": null }],
  "flows": [{ "slug": "list-tasks", "name": "List tasks", "purpose": "Returns every task", "kind": "list", "table": "tasks", "auth": false }]
}`;

type Plan = AppPlan;

/** When the user reviewed a plan and asked for a change, re-plan from it. */
export type PlanRevision = { change: string; previous: AppPlan };

async function runPlan(prompt: string, templateContext: string, onDelta: (n: number) => void, revision?: PlanRevision): Promise<Plan> {
  const revise = revision
    ? `\n\nYou planned this app before (JSON below). The user reviewed that plan and asked for this change:\n"""${revision.change}"""\nReturn the complete updated plan. Keep everything the user did not ask to change, and update the assumptions to match.\n\nPrevious plan:\n${JSON.stringify(revision.previous)}`
    : "";
  const plan = await completeJson(AppPlanSchema, "plan", {
    systemPrompt: PLAN_SYSTEM,
    userMessage: `Plan this app: ${prompt}${templateContext}${revise}\n\nRespond with the plan JSON only.`,
    json: true, task: "scaffold",
    maxTokens: 6000,
    onDelta,
  });
  return normalizePlan(plan);
}

function templateContextFor(prompt: string) {
  const matchedTemplate = findTemplateForPrompt(prompt);
  const homePage = matchedTemplate?.pages.find((p) => p.isHome);
  const context = homePage
    ? `\n\nA matching starter template "${matchedTemplate!.name}" (${matchedTemplate!.category}) is available — its visual style can guide your theme + page list. Theme suggestion: ${matchedTemplate!.theme.name}.`
    : "";
  return { homePage, context };
}

export type PlanEvent = { type: "progress"; message: string } | { type: "planned"; plan: AppPlan };

/**
 * Phase 1 on its own: propose a plan the user can review (and revise)
 * before the slower page and flow phases run.
 */
export async function* planApp(prompt: string, revision?: PlanRevision): AsyncGenerator<PlanEvent> {
  const { context } = templateContextFor(prompt);
  const label = revision ? "Updating the plan" : "Planning your app";
  yield { type: "progress", message: `${label}...` };
  const out: { value?: Plan } = {};
  yield* withProgress((d) => runPlan(prompt, context, d, revision), label, out);
  yield { type: "planned", plan: out.value! };
}

/* ─────────────────────────── Phase 2: PAGE ─────────────────────────── */

const PAGE_OUTPUT_RULES = `OUTPUT FORMAT (strict):
- First ONE <style> block with this page's own CSS (it may be empty: <style></style>).
- Then the page markup that goes inside <body>. No <html>, <head> or <body> tags.
- Nothing else: no markdown fences, no explanation before or after.`;

const PAGE_BINDING_RULES = `BINDING TO FLOWS:
- Forms: <form data-nk-form="" data-nk-flow-ref="<flow-slug>">. Inputs use name="<column>" (read as {{trigger.<column>}} server-side). Add <div data-nk-error class="small mt-2"></div> for error display.
- Data lists: <div data-nk-bind-flow-ref="<list-flow-slug>"> with ONE child <div data-nk-item> as the row template. Use data-nk-field="<column>" inside data-nk-item.
- KPI/single value: an aggregate flow returns [{value: N}]: <div data-nk-bind-flow-ref="<count-flow>"><div data-nk-item><span data-nk-field="value">0</span></div></div>.
- Detail pages: link to /<detail-page>?id=<row id> and bind a "load" flow — the page's URL parameters are sent to the flow automatically.
- Logout: <a data-nk-logout-ref="auth-logout" data-nk-redirect="/login">Log out</a>.
- Dates and prices: add data-nk-format="datetime" (or date, time, money, number) next to data-nk-field so they read nicely.
- NEVER render raw {placeholder} text outside a data-nk-item template. ALL dynamic data must come through data-nk-bind-flow-ref.`;

const PAGE_SYSTEM_FULL = `You are Nullkode's page builder. You receive one page's spec and return that page as HTML. Other pages and the backend flows are built separately — focus on this one page.

${PAGE_OUTPUT_RULES}

NO DEAD UI. Every button, link, and form MUST be wired to a real destination listed in the project's pages or flows. Never use href="#" as a placeholder.

PAGE GATING:
- If the page requires the visitor to be signed in, the FIRST line of the markup must be the marker <!--nk:require-auth-->.
- If the page is admin/staff-only, ALSO add a second marker on the next line: <!--nk:require-role:admin--> (or whatever role string matches the plan). The server enforces both — unsigned visitors go to /login, signed-in visitors with the wrong role go home.
- Do NOT add WHERE filters by user_id to flow queries. Data is shared. The only gate is which pages a role can reach.

NO EMOJI. Use inline lucide-style SVG icons instead (stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24").

RESPONSIVE — must work mobile-first with zero horizontal scroll. Use Bootstrap 5 utilities (.container, .row, .col-md-*, py-5). Wrap tables in .table-responsive.

NAVIGATION — the platform adds the site's shared menu to every page automatically. Do NOT build a top navigation bar.

DESIGN DISCIPLINE:
- h1/display-5 for hero only. Page content uses h2/h3.
- Wrap content in <div class="container">. Max prose measure: .col-md-8 / .col-lg-6.
- Use py-5 for sections, mb-4 between blocks, g-3 inside forms, gap-2 between buttons.
- NEVER hardcode colours. Use var(--nk-primary), var(--nk-accent), var(--nk-surface), var(--nk-text). Avoid bg-* / text-* Bootstrap utilities (they bypass the theme).

JAVASCRIPT (only when the page genuinely needs browser-side logic — games, canvas, drag/drop, audio, navigator APIs):
- You CAN use <script> tags. Wrap logic in an IIFE so it doesn't leak globals.
- For data persistence (saving rows, listing rows), use the form + flow pattern, not hand-rolled fetch — flows are visible/editable in the Flow tab.
- The right split: <script> for "run the game loop"; flows for "save the score". Use fetch('/api/run/<flow-slug>', {method:'POST', body: JSON.stringify({...})}) when JS needs to call a backend flow by slug.

${PAGE_BINDING_RULES}

AUTH-AWARE UI: use data-nk-auth="in" for elements visible only when signed in (e.g. logout, dashboard link) and data-nk-auth="out" for sign-in/sign-up CTAs. Use data-nk-user-field="email" to print the current user's email.

INTERACTIVE PATTERNS available in the runtime (always name flows by slug with the -ref attributes):
- data-nk-inline-edit="field_name" data-nk-update-flow-ref="<flow-slug>" data-nk-row-id="{id}" — click-to-edit fields
- <canvas data-nk-chart="bar|line|pie" data-nk-bind-flow-ref="<flow-slug>" data-nk-label-field="..." data-nk-value-field="..." style="height:300px;"></canvas>
- data-nk-sortable + data-nk-reorder-flow-ref="<flow-slug>" — drag to reorder
- data-nk-filter="<key>" data-nk-target="#chart-or-list" — reactive filters
- data-nk-calendar="month" + data-nk-calendar-source children (each with data-nk-bind-flow-ref="<list-flow-slug>") — calendar grid
- data-nk-kanban + data-nk-update-flow-ref="<flow-slug>" — drag between columns

${DESIGN_SYSTEM_RULES}`;

const PAGE_SYSTEM_COMPACT = `You build ONE page of a web app as HTML.

${PAGE_OUTPUT_RULES}

RULES:
- Link only to the pages listed (href="/slug"). Never href="#". The shared site menu is added automatically — do not build a top navigation bar.
- Signed-in-only pages start with <!--nk:require-auth-->.
- Show sign-in links with data-nk-auth="out"; sign-out: <a data-nk-logout-ref="auth-logout" data-nk-redirect="/login" data-nk-auth="in">Log out</a>.
- No <script> unless the page truly needs browser logic (a game or canvas).
- Form fields use the table's exact column names (name="<column>").
${PAGE_BINDING_RULES}

${DESIGN_RULES_COMPACT}`;

/** A page that failed the build checks, sent back once to be fixed (repair mode). */
export type PageRepair = { html: string; css: string; violations: Violation[] };

/**
 * Builds one page. In repair mode it gets its previous version and the
 * problems the build checks found, answers once, and has a smaller budget
 * (about the size of the page it fixes).
 */
export async function runPage(opts: {
  plan: Plan;
  page: Plan["pages"][number];
  templateHomeHtml?: string;
  compact: boolean;
  onDelta: (n: number) => void;
  repair?: PageRepair;
}): Promise<{ html: string; css: string }> {
  const otherPages = opts.plan.pages
    .filter((p) => p.slug !== opts.page.slug)
    .map((p) => `- /${p.slug} — ${p.title}${p.requiresAuth ? " (signed-in only)" : ""}`)
    .join("\n");
  const tablesBlock = opts.plan.tables.length
    ? opts.plan.tables.map((t) => `- ${t.name}(${t.fields.map((f) => `${f.name}: ${f.type}`).join(", ")})`).join("\n")
    : "(no app tables)";
  const flowsBlock = opts.plan.flows.length
    ? opts.plan.flows.map((f) => `- ${f.slug} (${f.kind}${f.table ? ` on ${f.table}` : ""}): ${f.purpose}`).join("\n")
    : "(no app flows)";
  const templateLimit = opts.compact || opts.repair ? 0 : 8000;
  const templateBlock = opts.page.isHome && opts.templateHomeHtml && templateLimit
    ? `\n\nSTARTER TEMPLATE for the HOME page — adapt this HTML, keep the visual structure and sections, change the text/content to match the app (keep its layout, but not its made-up facts: no invented reviews, ratings, counts or prices):\n<starter-html>\n${opts.templateHomeHtml.slice(0, templateLimit)}\n</starter-html>`
    : "";

  const userMessage = `Project: ${opts.plan.project.name} — ${opts.plan.project.description}
Theme: ${opts.plan.theme} (use var(--nk-*) tokens)

THIS PAGE
slug: ${opts.page.slug}
title: ${opts.page.title}
isHome: ${opts.page.isHome}
requiresAuth: ${opts.page.requiresAuth}
purpose: ${opts.page.summary}

OTHER PAGES (link to these via <a href="/slug">):
${otherPages || "(none)"}

TABLES (use names exactly):
${tablesBlock}

FLOWS (reference by slug in data-nk-flow-ref / data-nk-bind-flow-ref):
${flowsBlock}${templateBlock}

Build THIS page only. Wire every form to a create/update flow from the FLOWS list and every list to a list flow; form fields use the table's exact column names. Wire every link to a real page slug or an external URL. Reply with the <style> block followed by the page markup.`;

  const repairBlock = opts.repair
    ? `\n\nYOUR PREVIOUS VERSION OF THIS PAGE:\n<style>\n${opts.repair.css}\n</style>\n${opts.repair.html}\n\nPROBLEMS FOUND IN IT:\n${formatViolationsForRepair(opts.repair.violations)}\n\nReturn the corrected page: fix every problem listed and keep everything else as it is (same sections, same text, same markers at the top). Reply with the <style> block followed by the complete page markup.`
    : "";
  const fullBudget = opts.compact ? 6000 : 12000;
  const maxTokens = opts.repair
    ? Math.min(fullBudget, Math.max(2000, Math.ceil(estimateTokens(opts.repair.html + opts.repair.css) * 1.3) + 800))
    : fullBudget;
  const system = opts.compact ? PAGE_SYSTEM_COMPACT : PAGE_SYSTEM_FULL;
  const attempts = opts.repair ? 1 : 2;
  for (let attempt = 0; attempt < attempts; attempt++) {
    const text = await providerComplete({
      systemPrompt: system,
      userMessage: attempt === 0 ? `${userMessage}${repairBlock}` : `${userMessage}\n\nYour previous answer was not usable HTML. Reply with a <style> block followed by the page markup only.`,
      task: "scaffold",
      maxTokens,
      onDelta: opts.onDelta,
    });
    const page = parsePageOutput(text);
    if (page) return page;
    console.error(`[multi-pass] page "${opts.page.slug}": unusable output (attempt ${attempt + 1})`, text.slice(0, 300));
  }
  throw new UnusableOutputError(`The AI couldn't produce the "${opts.page.title}" page. Please try again.`);
}

/* ─────────────────────────── Phase 3: FLOW ─────────────────────────── */

const FLOW_SYSTEM = `You are Nullkode's flow builder. You receive one custom flow's spec and return ONLY a JSON object with that flow's nodes and edges. A flow is a directed graph: one "trigger" node → processing nodes → one "response" node per path.

CRITICAL OUTPUT RULES:
- Reply with raw JSON ONLY. Start with "{" and end with "}". No prose.
- JSON shape: { "nodes": [...], "edges": [...] }.
- Every node is { "id": "n1", "type": "<node type>", "data": { ...config } } — data is a JSON object.
- Every edge is { "id": "e1", "source": "n1", "target": "n2", "sourceHandle": null }. For edges OUT of a branch node, sourceHandle MUST be "true" or "false". For all other edges, sourceHandle is null.
- Always exactly one trigger node and at least one response node. A response node ends every reachable path.

NODE TYPES (data config):
- trigger: {"label":"Trigger"}
- query: {"table":"<name>","where":{"col":"{{trigger.x}}"},"limit":50,"orderBy":"created_at desc","output":"rows"} — array result; first row via {{vars.rows.0.col}}
- insert: {"table":"<name>","values":{"col":"{{trigger.x}}"},"output":"inserted"} — {{vars.inserted.id}} is the new id
- update: {"table":"<name>","where":{"id":"{{trigger.id}}"},"values":{"col":"{{trigger.x}}"},"output":"updated"}
- delete: {"table":"<name>","where":{"id":"{{trigger.id}}"},"output":"deleted"}
- branch: {"left":"{{vars.x}}","op":"==","right":"true"} — operators: ==, !=, >, <, >=, <=, contains, exists
- set: {"name":"x","value":"..."}
- http_request: {"method":"POST","url":"...","body":"{\\"a\\":1}","output":"resp"}
- email: {"to":"{{trigger.email}}","subject":"...","body":"..."}
- send_push: {"title":"New offer","body":"...","url":"/offers"} — push notification to everyone subscribed to the app
- hash_password: {"input":"{{trigger.password}}","output":"hash"}
- verify_password: {"plain":"{{trigger.password}}","hash":"{{vars.user.0.password_hash}}","output":"verified"} — follow with branch on {{vars.verified}} == "true"
- set_session: {"userId":"{{vars.inserted.id}}"}
- get_session: {"output":"session"} — vars.session = {userId, role, email, name} if signed in, else {userId:null}
- clear_session: {}
- custom_js: {"code":"return { total: vars.rows.reduce((s,r)=>s+r.amount,0) };","output":"total"} — sandboxed, 3s timeout
- aggregate: {"table":"orders","groupBy":"status","aggregate":"COUNT(*)","output":"stats"} — COUNT/SUM/AVG/MIN/MAX; rows are {<groupBy>, value}
- check_role: {"role":"admin","output":"roleOk"}
- response: {"status":200,"body":"{\\"ok\\":true}"} — body is a string and supports {{trigger.*}} and {{vars.*}}. Include "redirect" to navigate after submit.

DATA IS SHARED. Do NOT filter queries by user_id or session.userId. Visibility is enforced by page-level role gating.

SIGNED-IN-ONLY FLOWS: start with get_session → branch on {{vars.session.userId}} op "exists". On false: respond {"status":401,"body":"{\\"error\\":\\"You must be signed in.\\"}"}. On true: continue.
ADMIN-ONLY FLOWS: get_session → branch on {{vars.session.role}} == "admin". On false: respond {"status":403}.
LIST-STYLE results that feed data-nk-bind-flow-ref containers MUST respond with body "{{vars.rows}}".`;

const FlowGraphSchema = z.object({
  nodes: z.array(z.object({
    id: z.string().min(1),
    // Well-known invented names ("send_email") become the real type.
    type: z.string().min(1).transform((t) => canonicalNodeType(t) ?? t),
    data: z.union([z.string(), z.record(z.unknown())]).default({}),
  })).min(2),
  edges: z.array(z.object({
    id: z.string().min(1),
    source: z.string().min(1),
    target: z.string().min(1),
    sourceHandle: z.string().nullable().optional(),
  })).min(1),
}).refine((g) => g.nodes.some((n) => n.type === "trigger") && g.nodes.some((n) => n.type === "response"), {
  message: "needs a trigger node and a response node",
}).refine((g) => g.edges.every((e) => g.nodes.some((n) => n.id === e.source) && g.nodes.some((n) => n.id === e.target)), {
  message: "every edge must connect existing node ids",
}).refine((g) => g.nodes.every((n) => isKnownNodeType(n.type)), (g) => ({
  // The runtime silently skips node types it doesn't know.
  message: `unknown node type ${g.nodes.filter((n) => !isKnownNodeType(n.type)).map((n) => `"${n.type}"`).join(", ")}; use only: ${NODE_TYPES.join(", ")}`,
}));
type FlowGraph = z.infer<typeof FlowGraphSchema>;

async function runCustomFlow(plan: Plan, flow: Plan["flows"][number], onDelta: (n: number) => void): Promise<FlowGraph> {
  const tablesBlock = plan.tables.length
    ? plan.tables.map((t) => `- ${t.name}(${t.fields.map((f) => `${f.name}: ${f.type}`).join(", ")})`).join("\n")
    : "(no app tables)";
  return completeJson(FlowGraphSchema, `flow "${flow.slug}"`, {
    systemPrompt: FLOW_SYSTEM,
    userMessage: `Project: ${plan.project.name}

THIS FLOW
slug: ${flow.slug}
name: ${flow.name}
purpose: ${flow.purpose}
${flow.table ? `main table: ${flow.table}\n` : ""}signed-in only: ${flow.auth ? "yes" : "no"}

TABLES (reference by name):
${tablesBlock}

Build the flow graph for THIS flow only. Reply with raw JSON: { "nodes": [...], "edges": [...] }.`,
    json: true, task: "scaffold",
    maxTokens: 4000,
    onDelta,
  });
}

/** Standard graph for a planned flow, or null when it needs custom logic. */
function plannedStandardFlow(plan: Plan, flow: Plan["flows"][number]): { graph: FlowGraph; info: StandardFlowInfo } | null {
  const kind = standardKind(flow.kind);
  const table = flow.table ? plan.tables.find((t) => t.name === flow.table) : undefined;
  if (!kind || !table) return null;
  const info: StandardFlowInfo = { kind, table: table.name, auth: Boolean(flow.auth) };
  return { graph: standardFlowGraph({ kind, table: table.name, fields: table.fields.map((f) => f.name), auth: info.auth }), info };
}

/* ─────────────────────── Orchestrator ─────────────────────── */

export async function* scaffoldMultiPass(
  userPrompt: string,
  opts: { plan?: AppPlan } = {},
): AsyncGenerator<MultiPassEvent> {
  const compact = await isCompactModel();
  const { homePage, context: templateContext } = templateContextFor(userPrompt);

  let plan: Plan;
  if (opts.plan) {
    // The user already reviewed (and maybe edited) this plan.
    plan = normalizePlan(opts.plan);
  } else {
    yield { type: "progress", message: "Designing app structure..." };
    const planOut: { value?: Plan } = {};
    yield* withProgress((d) => runPlan(userPrompt, templateContext, d), "Designing app structure", planOut);
    plan = planOut.value!;
  }

  yield {
    type: "progress",
    message: `Plan ready: ${plan.pages.length} page${plan.pages.length === 1 ? "" : "s"}, ${plan.tables.length} table${plan.tables.length === 1 ? "" : "s"}, ${plan.flows.length} flow${plan.flows.length === 1 ? "" : "s"}`,
  };
  yield {
    type: "plan",
    totalTables: plan.tables.length,
    totalPages: plan.pages.length,
    totalFlows: plan.flows.length,
  };
  for (const t of plan.tables) {
    yield { type: "milestone", kind: "table", label: t.name };
  }

  // Phase 2: pages
  const pages: ScaffoldResult["pages"] = [];
  for (let i = 0; i < plan.pages.length; i++) {
    const p = plan.pages[i];
    const label = `Building page ${i + 1}/${plan.pages.length}: ${p.title}`;
    yield { type: "progress", message: label };
    const out: { value?: { html: string; css: string } } = {};
    yield* withProgress((d) => runPage({
      plan,
      page: p,
      templateHomeHtml: p.isHome ? homePage?.html : undefined,
      compact,
      onDelta: d,
    }), label, out);
    let html = out.value!.html;
    // Gated pages always carry their markers (the model sometimes forgets);
    // the server also locks the flows only these pages use.
    const role = (p.requiresRole ?? "").toLowerCase().replace(/[^a-z0-9_-]/g, "");
    if ((p.requiresAuth || role) && !html.includes("<!--nk:require-auth-->")) {
      html = `<!--nk:require-auth-->\n${html}`;
    }
    if (role && !/<!--\s*nk:require-role:/.test(html)) {
      html = html.replace("<!--nk:require-auth-->", `<!--nk:require-auth-->\n<!--nk:require-role:${role}-->`);
    }
    pages.push({ title: p.title, slug: p.slug, isHome: p.isHome, html, css: out.value!.css ?? "" });
    yield { type: "milestone", kind: "page", label: p.title };
  }

  // Phase 3: flows
  const flows: ScaffoldResult["flows"] = [];
  for (let i = 0; i < plan.flows.length; i++) {
    const f = plan.flows[i];
    const planned = plannedStandardFlow(plan, f);
    let graph = planned?.graph ?? null;
    let standard = planned?.info;
    if (!graph) {
      const label = `Building flow ${i + 1}/${plan.flows.length}: ${f.name}`;
      yield { type: "progress", message: label };
      const out: { value?: FlowGraph } = {};
      try {
        yield* withProgress((d) => runCustomFlow(plan, f, d), label, out);
        graph = out.value!;
      } catch (err) {
        // One bad custom flow must not sink the whole app: keep a safe
        // placeholder the user can finish in the Flow editor.
        console.error(`[multi-pass] flow "${f.slug}" failed; using a placeholder`, err instanceof Error ? err.message : err);
        const fallback = standardFallback(plan, f);
        graph = fallback.graph;
        standard = fallback.info;
        yield { type: "progress", message: `"${f.name}" needs a finishing touch in the Flow editor — a simple version was added.` };
      }
    }
    flows.push({
      name: f.name,
      slug: f.slug,
      purpose: f.purpose,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      nodes: graph.nodes as any,
      edges: graph.edges.map((e) => ({ ...e, sourceHandle: e.sourceHandle ?? null })),
      ...(standard ? { standard } : {}),
    });
    yield { type: "milestone", kind: "flow", label: f.name };
  }

  const scaffold: ScaffoldResult = {
    project: plan.project,
    theme: plan.theme,
    datasource: { tables: plan.tables.map((t) => ({ name: t.name, fields: t.fields, seed: t.seed })) },
    pages,
    flows,
  };
  yield { type: "result", scaffold, plan, compact };
}

/** A runnable stand-in for a custom flow the model couldn't build. */
function standardFallback(plan: Plan, flow: Plan["flows"][number]): { graph: FlowGraph; info?: StandardFlowInfo } {
  const table = flow.table ? plan.tables.find((t) => t.name === flow.table) : undefined;
  if (table) {
    const info: StandardFlowInfo = { kind: /list|load|get|show|fetch/.test(flow.slug) ? "list" : "create", table: table.name, auth: Boolean(flow.auth) };
    return { graph: standardFlowGraph({ kind: info.kind, table: table.name, fields: table.fields.map((f) => f.name), auth: info.auth }), info };
  }
  return {
    graph: {
      nodes: [
        { id: "trigger", type: "trigger", data: { label: "Trigger" } },
        { id: "respond", type: "response", data: { status: 200, body: '{"ok":true}' } },
      ],
      edges: [{ id: "trigger-respond", source: "trigger", target: "respond", sourceHandle: null }],
    },
  };
}

/* ─────────────────────── Helpers ─────────────────────── */

/**
 * Run a model call while periodically reporting how much it has written, so
 * a slow local model visibly makes progress instead of looking frozen.
 */
async function* withProgress<T>(
  start: (onDelta: (chars: number) => void) => Promise<T>,
  label: string,
  out: { value?: T },
): AsyncGenerator<{ type: "progress"; message: string }> {
  let chars = 0;
  let reported = 0;
  let settled = false;
  let failure: unknown;
  const startedAt = Date.now();
  let lastReportAt = startedAt;
  const task = start((n) => { chars = n; }).then(
    (v) => { out.value = v; settled = true; },
    (e) => { failure = e; settled = true; },
  );
  while (!settled) {
    await Promise.race([task, new Promise((r) => setTimeout(r, 3000))]);
    if (settled) break;
    if (chars - reported >= 300) {
      reported = chars;
      lastReportAt = Date.now();
      yield { type: "progress", message: `${label} — ${chars.toLocaleString("en-US")} characters written` };
    } else if (Date.now() - lastReportAt >= 60_000) {
      // Slow (often local) models can read a prompt for minutes before the
      // first word; say so rather than look frozen.
      lastReportAt = Date.now();
      const minutes = Math.round((Date.now() - startedAt) / 60_000);
      yield { type: "progress", message: `${label} — still working (${minutes} min)${chars === 0 ? ", the AI is reading the request" : ""}` };
    }
  }
  if (failure) throw failure;
}
