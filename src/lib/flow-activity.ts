/**
 * Reading stored flow runs for owners: one plain-language line per run, the
 * fields a visitor sent, and "problem" counts (runs that failed, or finished
 * with a warning such as an email that wasn't sent) for the Problems card and
 * the dashboard's warning dot.
 *
 * The runtime stores each run in FlowRun: status (the HTTP status as text),
 * error, durationMs, the redacted input, and output = { body, meta } where
 * meta = { source, warnings: string[], failedNodeId, failedNodeLabel,
 * failedNodeType, steps: [{ nodeId, type, ok, table? }] }. Older rows kept
 * the response itself in output (with output.error and output.nodeId on
 * failure) and are read too.
 */
import { Prisma } from "@prisma/client";
import { db } from "./db";
import type { FlowGraph, FlowNode } from "./flow/types";

/**
 * What describing a run needs from the owner's language: a translator for
 * the "flows" messages (getTranslations) and a list formatter ("a, b and c").
 */
export type ActivityWords = {
  t: (key: string, values?: Record<string, string | number>) => string;
  list: (parts: string[]) => string;
};

/**
 * Runtime warnings and errors are stored in English (they're also logs).
 * The ones an owner sees often are shown in their language; anything else
 * stays as it was stored.
 */
const RUNTIME_TEXT: Array<[RegExp, string, string[]]> = [
  [/^Email isn't set up on this server, so the message was not sent\.$/, "emailOff", []],
  [/^The email couldn't be sent\.$/, "emailFailed", []],
  [/^(.+) has already been sent (\d+) emails by apps in the last hour, so this one was held back\.$/, "recipientLimit", ["to", "count"]],
  [/^This app has sent (\d+) emails in the last hour, so this one was held back to prevent spam\.$/, "appHourLimit", ["count"]],
  [/^This app has sent (\d+) emails today, so this one was held back to prevent spam\.$/, "appDayLimit", ["count"]],
  [/^The formula in step "(.+)" can't be worked out: ([\s\S]*)$/, "formula", ["step", "reason"]],
  [/^This app is receiving too many AI requests right now\. Please try again later\.$/, "aiBusy", []],
  [/^This app has reached its AI limit for the month\.$/, "aiLimit", []],
];

export function localizeRuntimeText(text: string, words: ActivityWords): string {
  for (const [re, key, names] of RUNTIME_TEXT) {
    const m = re.exec(text);
    if (m) return words.t(`runtime.${key}`, Object.fromEntries(names.map((n, i) => [n, m[i + 1]])));
  }
  return text;
}

export type RunSourceName = "test" | "live" | "schedule" | "event" | "test-submission";

type Step = { nodeId: string; type: string; ok: boolean; table?: string };

export type RunMeta = {
  warnings: string[];
  source: RunSourceName | null;
  failedNodeId: string | null;
  failedNodeLabel: string | null;
  failedNodeType: string | null;
  /** The steps that ran, in order; null for older rows. */
  steps: Step[] | null;
};

export type ActivityRun = {
  id: string;
  at: string;
  status: number;
  outcome: "ok" | "warning" | "answered" | "failed";
  durationMs: number | null;
  source: RunSourceName | null;
  summary: string;
  error: string | null;
  warnings: string[];
  failedNodeLabel: string | null;
  /** What was sent, field by field (secrets were hidden before it was stored). */
  fields: Array<{ name: string; value: string }>;
  /** The stored input as it is (already redacted and size-capped by the runtime). */
  input: unknown;
};

const SOURCES = new Set(["test", "live", "schedule", "event", "test-submission"]);
export const EMAIL_OFF_WARNING = /email isn't set up/i;

function asObject(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

const str = (v: unknown, max = 200) => (typeof v === "string" && v ? v.slice(0, max) : null);

export function runMeta(output: unknown): RunMeta {
  const out = asObject(output);
  const meta = asObject(out?.meta);
  const warnings = Array.isArray(meta?.warnings)
    ? (meta!.warnings as unknown[]).filter((w): w is string => typeof w === "string" && w.trim() !== "").map((w) => w.slice(0, 500))
    : [];
  const source = typeof meta?.source === "string" && SOURCES.has(meta.source) ? (meta.source as RunSourceName) : null;
  const steps = Array.isArray(meta?.steps)
    ? (meta!.steps as unknown[])
        .map((s) => asObject(s))
        .filter((s): s is Record<string, unknown> => Boolean(s && typeof s.type === "string"))
        .map((s) => ({ nodeId: String(s.nodeId ?? ""), type: String(s.type), ok: s.ok !== false, ...(typeof s.table === "string" ? { table: s.table } : {}) }))
    : null;
  return {
    warnings,
    source,
    failedNodeId: str(meta?.failedNodeId) ?? (meta ? null : str(out?.nodeId)),
    failedNodeLabel: str(meta?.failedNodeLabel),
    failedNodeType: str(meta?.failedNodeType, 40),
    steps,
  };
}

/** The flow's reply: output.body today, output itself for older rows. */
function replyOf(output: unknown): Record<string, unknown> | null {
  const out = asObject(output);
  if (out && asObject(out.meta)) return asObject(out.body);
  return out;
}

function replyText(output: unknown): string | null {
  const body = replyOf(output);
  for (const k of ["error", "message"]) {
    const v = body?.[k];
    if (typeof v === "string" && v.trim()) return v.replace(/\s+/g, " ").trim().slice(0, 160);
  }
  return null;
}

/* ── Plain-language lines ──────────────────────────────────── */

/** "contact_form_messages" → "contact form messages" (the Data tab's names, lower case). */
export function friendlyTable(name: string | undefined | null, words: ActivityWords): string {
  if (!name) return words.t("describe.yourData");
  const parts = name
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((w) => w.toLowerCase());
  const s = parts.filter((w, i) => i === 0 || w !== parts[i - 1]).join(" ");
  return s === "auth users" ? words.t("describe.signUps") : s || name;
}

function tableOf(n: FlowNode | undefined): string | undefined {
  const d = (n?.data ?? {}) as { table?: string; sheet?: string; lookupTable?: string };
  return d.table ?? d.sheet ?? d.lookupTable;
}

/** What a step did, as a phrase that fits "…, … and …" ("saved to bookings"). */
function doneText(type: string, table: string | undefined, node: FlowNode | undefined, input: Record<string, unknown> | null, w: ActivityWords): string | null {
  const { t } = w;
  switch (type) {
    case "insert":
    case "bulk_insert":
      return t("describe.done.saved", { table: friendlyTable(table, w) });
    case "update":
    case "bulk_update":
      return t("describe.done.updated", { table: friendlyTable(table, w) });
    case "delete":
    case "bulk_delete":
      return t("describe.done.deleted", { table: friendlyTable(table, w) });
    case "sheets_append":
      return t("describe.done.sheetsAppend");
    case "email": {
      const to = String((node?.data as { to?: string } | undefined)?.to ?? "");
      const m = to.match(/^\s*\{\{\s*(?:trigger|input)\.([A-Za-z0-9_]+)\s*\}\}\s*$/);
      const fromInput = m && input && typeof input[m[1]] === "string" ? (input[m[1]] as string) : "";
      const address = fromInput || (/^[^\s{}@]+@[^\s{}]+$/.test(to.trim()) ? to.trim() : "");
      return address && address !== "[hidden]" ? t("describe.done.emailed", { address: address.slice(0, 80) }) : t("describe.done.sentEmail");
    }
    case "send_push":
      return t("describe.done.sentPush");
    case "http_request":
      return t("describe.done.http");
    case "ai_prompt":
      return t("describe.done.ai");
    case "set_session":
      return t("describe.done.signedIn");
    case "clear_session":
      return t("describe.done.signedOut");
    default:
      return null;
  }
}

/** Why a step failed, as the start of a sentence ("Couldn't save to bookings"). */
function failedText(type: string | null, table: string | undefined, label: string | null, w: ActivityWords): string {
  const { t } = w;
  switch (type) {
    case "insert":
    case "bulk_insert":
      return t("describe.failed.save", { table: friendlyTable(table, w) });
    case "update":
    case "bulk_update":
      return t("describe.failed.update", { table: friendlyTable(table, w) });
    case "delete":
    case "bulk_delete":
      return t("describe.failed.delete", { table: friendlyTable(table, w) });
    case "query":
    case "aggregate":
    case "lookup":
    case "sheets_read":
      return t("describe.failed.read", { table: friendlyTable(table, w) });
    case "email":
      return t("describe.failed.email");
    case "send_push":
      return t("describe.failed.push");
    case "http_request":
      return t("describe.failed.http");
    case "ai_prompt":
      return t("describe.failed.ai");
    default:
      return label ? t("describe.failed.stoppedAt", { label: label.slice(0, 60) }) : t("describe.failed.didntFinish");
  }
}

/**
 * For older rows without the list of steps: the steps every run goes through,
 * from the trigger up to the first branch (after a branch it depends on the
 * answer, so those steps aren't claimed).
 */
function certainSteps(graph: FlowGraph): Step[] {
  const nodes = Array.isArray(graph?.nodes) ? graph.nodes : [];
  const edges = Array.isArray(graph?.edges) ? graph.edges : [];
  const start = nodes.find((n) => n.type === "trigger") ?? nodes[0];
  const out: Step[] = [];
  const seen = new Set<string>();
  let frontier = start ? [start.id] : [];
  while (frontier.length && out.length < 50) {
    const next: string[] = [];
    for (const id of frontier) {
      if (seen.has(id)) continue;
      seen.add(id);
      const node = nodes.find((n) => n.id === id);
      if (!node) continue;
      out.push({ nodeId: node.id, type: node.type, ok: true, table: tableOf(node) });
      if (node.type === "branch") continue;
      for (const e of edges) if (e.source === id) next.push(e.target);
    }
    frontier = next;
  }
  return out;
}

function capital(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

/**
 * One line a non-technical owner can read, e.g.
 * "Saved to bookings; the email wasn't sent because email isn't set up."
 */
export function describeRun(
  graph: FlowGraph,
  run: { status: number; error: string | null; output: unknown; input: unknown },
  meta: RunMeta,
  w: ActivityWords,
): string {
  const { t } = w;
  const input = asObject(run.input);
  const nodes = Array.isArray(graph?.nodes) ? graph.nodes : [];
  const nodeById = (id: string | null | undefined) => (id ? nodes.find((n) => n.id === id) : undefined);

  if (run.status >= 500) {
    const node = nodeById(meta.failedNodeId);
    const failedStep = meta.steps?.find((s) => !s.ok);
    const type = meta.failedNodeType ?? node?.type ?? failedStep?.type ?? null;
    const table = failedStep?.table ?? tableOf(node);
    const why = localizeRuntimeText((run.error ?? replyText(run.output) ?? "").replace(/\s+/g, " ").trim(), w).slice(0, 200);
    const failed = failedText(type, table, meta.failedNodeLabel ?? ((node?.data as { label?: string } | undefined)?.label ?? null), w);
    if (!why) return t("describe.failedOnly", { failed });
    return t(/[.!?。！？]$/.test(why) ? "describe.failedWhy" : "describe.failedWhyPeriod", { failed, why });
  }

  if (run.status >= 400) {
    const msg = replyText(run.output);
    return msg ? t("describe.answered", { message: msg }) : t("describe.answeredCode", { status: run.status });
  }

  const emailOff = meta.warnings.some((w) => EMAIL_OFF_WARNING.test(w));
  const otherWarnings = meta.warnings.filter((w) => !EMAIL_OFF_WARNING.test(w));
  const steps = meta.steps ?? certainSteps(graph);
  const phrases: string[] = [];
  let emailNote = "";
  for (const s of steps) {
    if (!s.ok) continue;
    if (s.type === "email") {
      // The runtime keeps a warning when an email step didn't send.
      if (emailOff) {
        emailNote = t("describe.emailOff");
        continue;
      }
      if (otherWarnings.length) {
        emailNote = t("describe.emailNotSent", { reason: localizeRuntimeText(otherWarnings[0], w).replace(/[.。\s]+$/, "") });
        continue;
      }
    }
    const p = doneText(s.type, s.table ?? tableOf(nodeById(s.nodeId)), nodeById(s.nodeId), input, w);
    if (p && !phrases.includes(p)) phrases.push(p);
  }
  if (!emailNote && meta.warnings.length) {
    // A warning from something other than an email step (or an older row).
    emailNote = emailOff ? t("describe.anEmailOff") : localizeRuntimeText(otherWarnings[0], w).replace(/[.。\s]+$/, "");
  }
  const did = w.list(phrases.slice(0, 4));
  if (did && emailNote) return t("describe.didAndNote", { did: capital(did), note: emailNote });
  if (emailNote) return t("describe.sentence", { text: capital(emailNote) });
  return did ? t("describe.sentence", { text: capital(did) }) : t("describe.noProblems");
}

const INTERNAL_FIELD = /^(?:_nk_|__)|^test$/;

/** The top-level fields of the stored input, for showing who sent what. */
export function submittedFields(input: unknown, w: ActivityWords): Array<{ name: string; value: string }> {
  const o = asObject(input);
  if (!o) return typeof input === "string" && input.trim() ? [{ name: w.t("describe.sent"), value: input.slice(0, 500) }] : [];
  const out: Array<{ name: string; value: string }> = [];
  for (const [k, v] of Object.entries(o)) {
    if (INTERNAL_FIELD.test(k) || v === null || v === undefined || v === "") continue;
    let value: string;
    if (typeof v === "object") {
      try {
        value = JSON.stringify(v);
      } catch {
        continue;
      }
    } else value = String(v);
    out.push({ name: capital(friendlyTable(k, w)), value: value.length > 300 ? `${value.slice(0, 300)}…` : value });
    if (out.length >= 25) break;
  }
  return out;
}

export function toActivityRun(
  graph: FlowGraph,
  r: { id: string; status: string; input: unknown; output: unknown; error: string | null; durationMs: number | null; createdAt: Date },
  w: ActivityWords,
): ActivityRun {
  const status = Number.parseInt(r.status, 10) || 0;
  const meta = runMeta(r.output);
  const error = r.error ?? (status >= 500 ? replyText(r.output) : null);
  const outcome: ActivityRun["outcome"] = status >= 500 ? "failed" : meta.warnings.length ? "warning" : status >= 400 ? "answered" : "ok";
  return {
    id: r.id,
    at: r.createdAt.toISOString(),
    status,
    outcome,
    durationMs: r.durationMs,
    source: meta.source,
    summary: describeRun(graph, { status, error, output: r.output, input: r.input }, meta, w),
    error: error === null ? null : localizeRuntimeText(error, w),
    // "Email isn't set up" is already in the summary line.
    warnings: meta.warnings.filter((x) => !EMAIL_OFF_WARNING.test(x)).map((x) => localizeRuntimeText(x, w)),
    failedNodeLabel: meta.failedNodeLabel,
    fields: submittedFields(r.input, w),
    input: r.input ?? null,
  };
}

/* ── Problem counts ────────────────────────────────────────── */

/** A run that failed (5xx) or finished with a warning. */
export const PROBLEM_RUN_SQL = Prisma.sql`(
  r."status" LIKE '5%'
  OR (jsonb_typeof(r."output"->'meta'->'warnings') = 'array' AND r."output"->'meta'->'warnings' <> '[]'::jsonb)
)`;
/** Started by the app's visitors (not the owner's tests, the scheduler or a test submission). */
export const VISITOR_RUN_SQL = Prisma.sql`COALESCE(r."output"->'meta'->>'source', 'live') NOT IN ('test', 'schedule', 'test-submission')`;

export const PROBLEM_WINDOW_MS = 24 * 60 * 60 * 1000;

/** Visitor runs with a problem in the last 24 hours, per app (one grouped query). */
export async function problemCountsByProject(projectIds: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (!projectIds.length) return out;
  const since = new Date(Date.now() - PROBLEM_WINDOW_MS);
  const rows = await db.$queryRaw<Array<{ projectId: string; n: number }>>`
    SELECT f."projectId" AS "projectId", count(*)::int AS n
      FROM "FlowRun" r JOIN "Flow" f ON f."id" = r."flowId"
     WHERE f."projectId" IN (${Prisma.join(projectIds)})
       AND r."createdAt" >= ${since}
       AND ${PROBLEM_RUN_SQL}
       AND ${VISITOR_RUN_SQL}
     GROUP BY f."projectId"`;
  for (const r of rows) out.set(r.projectId, Number(r.n));
  return out;
}

export type FlowProblem = {
  flowId: string;
  flowName: string;
  failed: number;
  warned: number;
  emailOff: number;
  lastAt: string;
  lastError: string | null;
  lastWarning: string | null;
};

/** Visitor runs with a problem in the last 24 hours, grouped by flow, newest first. */
export async function problemsByFlow(projectId: string): Promise<FlowProblem[]> {
  const since = new Date(Date.now() - PROBLEM_WINDOW_MS);
  const rows = await db.$queryRaw<Array<{ flowId: string; flowName: string; failed: number; warned: number; emailOff: number; lastAt: Date; lastError: string | null; lastWarning: string | null }>>`
    SELECT f."id" AS "flowId", f."name" AS "flowName",
           count(*) FILTER (WHERE r."status" LIKE '5%')::int AS failed,
           count(*) FILTER (WHERE r."status" NOT LIKE '5%')::int AS warned,
           count(*) FILTER (WHERE r."status" NOT LIKE '5%' AND (r."output"->'meta'->'warnings')::text ILIKE '%email isn''t set up%')::int AS "emailOff",
           max(r."createdAt") AS "lastAt",
           (array_agg(COALESCE(r."error", r."output"->'body'->>'error', r."output"->>'error') ORDER BY r."createdAt" DESC) FILTER (WHERE r."status" LIKE '5%'))[1] AS "lastError",
           (array_agg(r."output"->'meta'->'warnings'->>0 ORDER BY r."createdAt" DESC)
              FILTER (WHERE r."status" NOT LIKE '5%' AND COALESCE(r."output"->'meta'->'warnings'->>0, '') NOT ILIKE '%email isn''t set up%'))[1] AS "lastWarning"
      FROM "FlowRun" r JOIN "Flow" f ON f."id" = r."flowId"
     WHERE f."projectId" = ${projectId}
       AND r."createdAt" >= ${since}
       AND ${PROBLEM_RUN_SQL}
       AND ${VISITOR_RUN_SQL}
     GROUP BY f."id", f."name"
     ORDER BY max(r."createdAt") DESC
     LIMIT 20`;
  return rows.map((r) => ({
    flowId: r.flowId,
    flowName: r.flowName,
    failed: Number(r.failed),
    warned: Number(r.warned),
    emailOff: Number(r.emailOff),
    lastAt: (r.lastAt instanceof Date ? r.lastAt : new Date(r.lastAt)).toISOString(),
    lastError: r.lastError,
    lastWarning: r.lastWarning,
  }));
}

/** Visitor runs of one flow with a problem in the last 24 hours (the Activity tab's badge). */
export async function flowProblemCount(flowId: string): Promise<number> {
  const since = new Date(Date.now() - PROBLEM_WINDOW_MS);
  const rows = await db.$queryRaw<Array<{ n: number }>>`
    SELECT count(*)::int AS n FROM "FlowRun" r
     WHERE r."flowId" = ${flowId} AND r."createdAt" >= ${since}
       AND ${PROBLEM_RUN_SQL} AND ${VISITOR_RUN_SQL}`;
  return Number(rows[0]?.n ?? 0);
}
