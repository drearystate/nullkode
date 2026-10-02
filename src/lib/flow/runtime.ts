import { Prisma, type Flow } from "@prisma/client";
import { publicFetch } from "../public-url";
import argon2 from "argon2";
import type { FlowGraph, FlowNode, RunContext, RunResult, RunSource } from "./types";
import {
  interpolate,
  interpolateObject,
  interpolateJson,
  interpolateDeep,
  cmp,
  evaluateFormula,
  FormulaSyntaxError,
  secureRandomInt,
} from "./expr";
import { getAdapter as loadAdapter } from "../datasources";
import { db } from "../db";
import { liveSnapshot } from "../deployments";
import { signAppSession, verifyAppSession, sessionCookieName } from "./session";
import { flowAccessDecision } from "./access";
import { redactForLog, scrubResponseBody } from "./redact";
import { hitLimit, undoHit } from "../rate-limit";
import { appRuntimeText, getAppLocale, offeredLocale } from "../app-locale";

/** What a visitor sees when a step fails. The owner sees the real reason in the flow's activity. */
export const VISITOR_ERROR = "Sorry, that didn't send. Please try again; the owner has been told.";
export const EMAIL_NOT_SET_UP_WARNING = "Email isn't set up on this server, so the message was not sent.";

/**
 * The platform's own messages to visitors, by their English text, and their
 * key in messages/<locale>/runtime.json: visitors read them in the app's
 * language (lib/app-locale.ts). Messages a flow's owner wrote are left as
 * they are.
 */
const VISITOR_TEXT_KEYS: Record<string, string> = {
  [VISITOR_ERROR]: "visitorError",
  "That already exists.": "alreadyExists",
  "Some of the information is missing or in the wrong format.": "badInput",
  "Please sign in first.": "signInFirst",
  "You don't have access to this.": "noAccess",
};

async function forVisitor(projectId: string, text: string, lang?: string | null): Promise<string> {
  const key = VISITOR_TEXT_KEYS[text];
  if (!key) return text;
  try {
    return (await appRuntimeText(projectId, lang))(key);
  } catch {
    return text;
  }
}

/**
 * The language a member of a multilingual app signed up in (the sign-in
 * feature's users table, `locale`, lib/app-translations.ts), when the app
 * offers it. Null when unknown.
 */
async function recipientLanguage(projectId: string, email: string | undefined): Promise<string | null> {
  if (!email) return null;
  try {
    const app = await getAppLocale(projectId);
    if (app.locales.length < 2) return null;
    const table = await db.dataTable.findFirst({ where: { name: "auth_users", datasource: { projectId, kind: "POSTGRES_INTERNAL" } }, select: { id: true } });
    if (!table) return null;
    const { Pool } = await import("pg");
    const { projectSchemaName } = await import("../datasources/postgres");
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
    try {
      const r = await pool.query(`SELECT "locale" FROM "${projectSchemaName(projectId)}"."auth_users" WHERE lower("email") = lower($1) AND "locale" IS NOT NULL LIMIT 1`, [email]);
      const lang = r.rows[0]?.locale as string | undefined;
      return lang && (app.locales as string[]).includes(lang) ? lang : null;
    } finally {
      await pool.end();
    }
  } catch {
    return null;
  }
}

/** Flows that only the platform starts. Visitors can't call them. */
export const HIDDEN_TRIGGERS: ReadonlySet<string> = new Set(["SCHEDULE", "EVENT"]);

export type RunOptions = {
  /** The visitor's language (x-nk-lang): a multilingual app answers in it ({{request.lang}}). */
  lang?: string | null;
  /** Run the version frozen at the last publish (visitors, webhooks, schedules); otherwise the saved draft. */
  live?: boolean;
  /**
   * The owner testing in the builder, or the platform itself (schedules).
   * Everyone else must pass the same sign-in and role checks as the pages
   * that use the flow, and gets the visitor limits and friendly errors.
   */
  trusted?: boolean;
  /** The visitor's address (X-Real-IP), when a request started the run. */
  clientIp?: string | null;
  /** Defaults to "test" for trusted draft runs, "schedule" for trusted live runs, else "live". */
  source?: RunSource;
  /** The graph to run, when the caller already loaded it with runnableFlow. */
  graph?: FlowGraph;
};

function normalizeGraph(g: unknown): FlowGraph {
  const graph = (g ?? {}) as Partial<FlowGraph>;
  return { nodes: Array.isArray(graph.nodes) ? graph.nodes : [], edges: Array.isArray(graph.edges) ? graph.edges : [] };
}

/**
 * The graph a run uses, and the trigger it was published with. Published
 * apps, webhooks and schedules run the version frozen at the last publish;
 * the builder runs the draft. A flow created since then has no published
 * version yet, so it runs as saved.
 */
export async function runnableFlow(flow: Pick<Flow, "id" | "projectId" | "graph" | "trigger">, live: boolean): Promise<{ graph: FlowGraph; trigger: string }> {
  if (live) {
    const published = (await liveSnapshot(flow.projectId))?.flows.find((f) => f.id === flow.id);
    if (published) return { graph: normalizeGraph(published.graph), trigger: String(published.trigger ?? flow.trigger) };
  }
  return { graph: normalizeGraph(flow.graph), trigger: flow.trigger };
}

const WRITE_STEPS = new Set(["insert", "update", "delete", "bulk_insert", "bulk_update", "bulk_delete", "email", "send_push", "sheets_append", "http_request"]);

/** Whether the flow saves, changes or sends anything (the kind visitors are rate-limited on). */
export function flowWrites(graph: FlowGraph): boolean {
  return graph.nodes.some((n) => WRITE_STEPS.has(n.type));
}

/** Whether the flow checks a password (sign-in), which gets its own attempt limits. */
export function flowChecksPassword(graph: FlowGraph): boolean {
  return graph.nodes.some((n) => n.type === "verify_password");
}

type Failure = {
  message: string;
  nodeId?: string;
  nodeLabel?: string | null;
  nodeType?: string;
  /** 400/409 when the visitor's input was the problem; 500 otherwise. */
  status?: number;
  /** What visitors are told instead of VISITOR_ERROR (their input was the problem). */
  visitorMessage?: string;
};

// Postgres invalid text/datetime/number, not-null, check and foreign-key
// violations, plus the adapters' own refusals.
const BAD_INPUT_CODES = new Set(["22P02", "22007", "22008", "22003", "23502", "23503", "23514", "NK_BAD_INPUT"]);

/**
 * A value the database can't store (text in a number column, a blank
 * required field, a duplicate) is the caller's mistake, not a crash: it gets
 * 400/409 in plain words. The database's own text stays on the run for the
 * owner and is never sent to visitors.
 */
function inputProblem(err: unknown): Pick<Failure, "status" | "visitorMessage"> {
  const code = (err as { code?: unknown } | null)?.code;
  if (code === "23505") return { status: 409, visitorMessage: "That already exists." };
  if (typeof code === "string" && BAD_INPUT_CODES.has(code)) return { status: 400, visitorMessage: "Some of the information is missing or in the wrong format." };
  return {};
}
type RunState = { failure: Failure | null };

const MAX_WARNINGS = 20;
const MAX_STEPS_KEPT = 60;
const TABLE_STEPS = new Set(["query", "insert", "update", "delete", "bulk_insert", "bulk_update", "bulk_delete", "aggregate"]);

function errorText(err: unknown): string {
  const s = err instanceof Error ? err.message : String(err);
  return s.length > 2000 ? `${s.slice(0, 2000)}…` : s;
}

function labelOf(node: FlowNode): string | null {
  const label = (node.data as { label?: unknown } | undefined)?.label;
  return typeof label === "string" && label.trim() ? label.trim().slice(0, 120) : null;
}

function warn(ctx: RunContext, message: string) {
  const m = message.replace(/\s+/g, " ").trim().slice(0, 300);
  if (m && !ctx.warnings.includes(m) && ctx.warnings.length < MAX_WARNINGS) ctx.warnings.push(m);
}

function toJsonInput(v: unknown): Prisma.InputJsonValue | typeof Prisma.DbNull {
  return v === null || v === undefined ? Prisma.DbNull : (v as Prisma.InputJsonValue);
}

export async function runFlow(
  flowId: string,
  trigger: unknown,
  cookies: Record<string, string> = {},
  opts: RunOptions = {}
): Promise<RunResult> {
  const flow = await db.flow.findUnique({ where: { id: flowId } });
  if (!flow) throw new Error("Flow not found");
  const trusted = Boolean(opts.trusted);
  const live = Boolean(opts.live);
  const started = Date.now();

  const ctx: RunContext = {
    trigger,
    vars: {},
    projectId: flow.projectId,
    flowId: flow.id,
    cookies,
    trusted,
    clientIp: opts.clientIp ?? null,
    source: opts.source ?? (trusted ? (live ? "schedule" : "test") : "live"),
    secrets: new Set(),
    warnings: [],
    // The visitor's language among the app's (its default otherwise).
    request: { lang: offeredLocale(await getAppLocale(flow.projectId), opts.lang) },
  };
  const result: RunResult = {
    status: 200,
    body: { ok: true },
    vars: ctx.vars,
    setCookies: [],
    trace: [],
  };
  const state: RunState = { failure: null };
  let graph: FlowGraph | null = null;

  // Everything that can fail sits in here, so every run leaves exactly one
  // FlowRun row (the scheduler reads the newest one), even when loading the
  // published version or the database fails before any step runs.
  try {
    if (!trusted) {
      // Scheduled and event flows only run for the platform (see /api/run).
      if (HIDDEN_TRIGGERS.has(flow.trigger)) return { status: 404, body: { error: "Flow not found or disabled" }, vars: {}, setCookies: [], trace: [] };
      const { access, denied } = await flowAccessDecision(flow, cookies, live);
      // Turned away before anything ran: not a run, nothing to record.
      if (denied) return { status: denied.status, body: scrubResponseBody({ ...denied.body, error: await forVisitor(flow.projectId, denied.body.error, opts.lang) }), vars: {}, setCookies: [], trace: [] };
      ctx.staffOnly = Boolean(access.signIn && access.roles && access.roles.length > 0);
    }
    graph = opts.graph ? normalizeGraph(opts.graph) : (await runnableFlow(flow, live)).graph;
    const start = findTrigger(graph);
    if (!start) throw new Error("Flow has no trigger node");
    await walk(start.id, graph, ctx, result, new Set(), state);
  } catch (err) {
    state.failure ??= { message: errorText(err) };
  }

  const failure = state.failure;
  if (failure) {
    result.status = failure.status ?? 500;
    result.failed = true;
    result.body = { error: failure.message, ...(failure.nodeId ? { nodeId: failure.nodeId } : {}) };
    console.error(`[flow] ${flow.id} (${ctx.source}) failed${failure.nodeId ? ` at step ${failure.nodeId}` : ""}: ${failure.message}`);
  }

  // Stored for the owner's activity view: redacted input and response, plus
  // what happened (output.meta) so no extra columns are needed.
  const nodes = new Map((graph?.nodes ?? []).map((n) => [n.id, n] as const));
  const meta = {
    source: ctx.source,
    warnings: ctx.warnings,
    failedNodeId: failure?.nodeId ?? null,
    failedNodeLabel: failure?.nodeLabel ?? null,
    failedNodeType: failure?.nodeType ?? null,
    steps: result.trace.slice(0, MAX_STEPS_KEPT).map((t) => {
      const table = (nodes.get(t.nodeId)?.data as { table?: unknown } | undefined)?.table;
      return { nodeId: t.nodeId, type: t.type, ok: t.ok, durationMs: t.durationMs, ...(TABLE_STEPS.has(t.type) && typeof table === "string" ? { table } : {}) };
    }),
  };
  try {
    const row = await db.flowRun.create({
      data: {
        flowId: flow.id,
        status: String(result.status),
        input: toJsonInput(redactForLog(trigger, ctx.secrets)),
        output: toJsonInput({ body: redactForLog(result.body, ctx.secrets), meta }),
        error: failure ? failure.message : null,
        durationMs: Date.now() - started,
      },
      select: { id: true },
    });
    result.runId = row.id;
  } catch (err) {
    console.error(`[flow] couldn't record a run of ${flow.id}:`, errorText(err));
  }
  result.warnings = ctx.warnings;

  if (failure) {
    const ref = result.runId ? { ref: result.runId } : {};
    // The owner testing in the builder sees what went wrong; visitors get a
    // plain apology and a reference the owner can look up.
    result.body = trusted ? { error: failure.message, ...(failure.nodeId ? { nodeId: failure.nodeId } : {}), ...ref } : { error: await forVisitor(flow.projectId, failure.visitorMessage ?? VISITOR_ERROR, ctx.request?.lang), ...ref };
  }
  // Password fields and hashes never leave the server, whatever the flow returns.
  result.body = scrubResponseBody(result.body);
  return result;
}

function findTrigger(graph: FlowGraph): FlowNode | undefined {
  return graph.nodes.find((n) => n.type === "trigger") ?? graph.nodes[0];
}

function nextOf(graph: FlowGraph, nodeId: string, handle?: string): string[] {
  return graph.edges
    .filter((e) => e.source === nodeId && (!handle || e.sourceHandle === handle))
    .map((e) => e.target);
}

async function walk(
  nodeId: string,
  graph: FlowGraph,
  ctx: RunContext,
  result: RunResult,
  visited: Set<string>,
  state: RunState
): Promise<void> {
  if (state.failure || visited.has(nodeId)) return;
  visited.add(nodeId);

  const node = graph.nodes.find((n) => n.id === nodeId);
  if (!node) return;

  const t0 = Date.now();
  let handle: string | undefined;
  try {
    handle = await executeNode(node, ctx, result);
  } catch (err) {
    const message = errorText(err);
    result.trace.push({ nodeId: node.id, type: node.type, durationMs: Date.now() - t0, ok: false, error: message });
    // A failed step ends the run: later steps (including a success reply on
    // another branch) must not cover it up.
    state.failure = { message, nodeId: node.id, nodeLabel: labelOf(node), nodeType: node.type, ...inputProblem(err) };
    return;
  }
  result.trace.push({
    nodeId: node.id,
    type: node.type,
    durationMs: Date.now() - t0,
    ok: true,
  });
  for (const n of nextOf(graph, nodeId, handle)) {
    await walk(n, graph, ctx, result, visited, state);
    if (state.failure) return;
  }
}

/* ── Visitor email limits ──────────────────────────────────────────────── */

const HOUR = 60 * 60 * 1000;
const EMAIL_LIMITS = { appPerHour: 50, appPerDay: 200, recipientPerHour: 5 };

/**
 * Counts a visitor-started email against the app's and each recipient's
 * allowance. Returns why it must be held back, or null when it may go out.
 * `perRecipient` is false for addresses the owner typed into the step (their
 * own inbox, say): only addresses that come from a {{value}} could be used to
 * aim emails at someone else.
 */
function takeEmailAllowance(projectId: string, recipients: string[], perRecipient: boolean): string | null {
  const taken: string[] = [];
  const take = (key: string, limit: number, windowMs: number) => {
    const ok = hitLimit(key, limit, windowMs).ok;
    taken.push(key);
    return ok;
  };
  let problem: string | null = null;
  for (const to of recipients) {
    if (perRecipient && !take(`flow-email:to:${to}`, EMAIL_LIMITS.recipientPerHour, HOUR)) {
      problem = `${to} has already been sent ${EMAIL_LIMITS.recipientPerHour} emails by apps in the last hour, so this one was held back.`;
    } else if (!take(`flow-email:app-hour:${projectId}`, EMAIL_LIMITS.appPerHour, HOUR)) {
      problem = `This app has sent ${EMAIL_LIMITS.appPerHour} emails in the last hour, so this one was held back to prevent spam.`;
    } else if (!take(`flow-email:app-day:${projectId}`, EMAIL_LIMITS.appPerDay, 24 * HOUR)) {
      problem = `This app has sent ${EMAIL_LIMITS.appPerDay} emails today, so this one was held back to prevent spam.`;
    }
    if (problem) break;
  }
  if (problem) for (const key of taken) undoHit(key);
  return problem;
}

function giveBackEmailAllowance(projectId: string, recipients: string[], perRecipient: boolean) {
  for (const to of recipients) {
    if (perRecipient) undoHit(`flow-email:to:${to}`);
    undoHit(`flow-email:app-hour:${projectId}`);
    undoHit(`flow-email:app-day:${projectId}`);
  }
}

/** Sample sender addresses from feature defaults (no-reply@example.com) are never used. */
function realSender(from: string): string | undefined {
  const address = (from.match(/<([^>]+)>/)?.[1] ?? from).trim().toLowerCase();
  if (!address.includes("@")) return undefined;
  if (/@(?:[^@]+\.)?example\.(?:com|org|net)$|\.(?:example|invalid|test|localhost)$|@localhost$/.test(address)) return undefined;
  return from;
}

/* ── Outgoing requests ─────────────────────────────────────────────────── */

async function outboundFetch(url: string, init: RequestInit): Promise<Response> {
  // Test runs only: the e2e tests point flows at a mock server on this
  // machine. Never honoured by a production build.
  if (process.env.NK_FLOW_HTTP_ALLOW_PRIVATE === "1" && process.env.NODE_ENV !== "production") {
    return fetch(url, { ...init, redirect: "manual", signal: init.signal ?? AbortSignal.timeout(20000) });
  }
  return publicFetch(url, init);
}

function requestBody(template: string | undefined, contentType: string, ctx: RunContext): string {
  // A body that is one {{value}} is sent as it is (the flow built it).
  if (template == null || /^\s*\{\{[^}]+\}\}\s*$/.test(template)) return interpolate(template, ctx);
  // Each value is encoded on its own, so visitor text like
  // "a@b.com&line_items[0][price_data][unit_amount]=1" stays one value and
  // can't add or change fields of the request (a Stripe price, say).
  if (contentType.includes("application/x-www-form-urlencoded")) return interpolate(template, ctx, { urlEncode: true });
  if (/[/+]json\b/.test(contentType)) return interpolateJson(template, ctx);
  return interpolate(template, ctx);
}

/* ── Steps ─────────────────────────────────────────────────────────────── */

function wholeNumber(raw: unknown, ctx: RunContext, what: string): number {
  const s = interpolate(raw == null ? "" : String(raw), ctx).trim();
  const n = Number(s);
  if (s === "" || !Number.isSafeInteger(n)) throw new Error(`A random number needs a whole number for its ${what} value.`);
  return n;
}

function plainMath(node: Extract<FlowNode, { type: "math" }>, ctx: RunContext): number {
  const left = Number(interpolate(node.data.left, ctx));
  const right = Number(interpolate(node.data.right, ctx));
  switch (node.data.op) {
    case "+":
      return left + right;
    case "-":
      return left - right;
    case "*":
      return left * right;
    case "/":
      return right === 0 ? 0 : left / right;
    case "%":
      return right === 0 ? 0 : left % right;
    default:
      return left + right;
  }
}

/** Tell the owner about a visitor's new row, after the reply and without waiting. */
function alertOwner(ctx: RunContext, table: string, row: unknown, values: Record<string, unknown>) {
  if (!((!ctx.trusted && !ctx.staffOnly) || ctx.source === "test-submission")) return;
  const saved = row && typeof row === "object" && !Array.isArray(row) ? (row as Record<string, unknown>) : values;
  void import("../owner-alerts")
    .then(({ notifyVisitorInsert }) => notifyVisitorInsert({ projectId: ctx.projectId, table, row: saved, source: ctx.source }))
    .catch((err) => console.error("[flow] owner alert failed:", errorText(err)));
}

async function executeNode(
  node: FlowNode,
  ctx: RunContext,
  result: RunResult
): Promise<string | undefined> {
  switch (node.type) {
    case "trigger":
      return undefined;

    case "set": {
      const name = node.data.name?.trim();
      if (!name) return;
      ctx.vars[name] = interpolate(node.data.value, ctx);
      return;
    }

    case "query": {
      if (!node.data.datasourceId || !node.data.table)
        throw new Error("Query node missing datasource or table");
      const { source, adapter } = await getAdapter(node.data.datasourceId, ctx.projectId);
      const rows = await adapter.list(source, node.data.table, {
        where: interpolateObject(node.data.where, ctx),
        limit: node.data.limit,
        orderBy: node.data.orderBy,
      });
      if (node.data.output) ctx.vars[node.data.output] = rows;
      else ctx.vars.rows = rows;
      return;
    }

    case "insert": {
      if (!node.data.datasourceId || !node.data.table)
        throw new Error("Insert node missing datasource or table");
      const { source, adapter } = await getAdapter(node.data.datasourceId, ctx.projectId);
      const values = dropEmpty(interpolateObject(node.data.values, ctx) as Record<string, unknown>, node.data.skipEmpty);
      // Auto-attribution: fill created_by from the current session if one
      // exists in vars and the flow didn't already set it. This is the
      // audit trail — no flow has to remember to write it.
      if (values && values.created_by == null) {
        const session = ctx.vars.session as { userId?: string | null } | undefined;
        if (session?.userId) values.created_by = session.userId;
      }
      const row = await adapter.insert(source, node.data.table, values);
      if (node.data.output) ctx.vars[node.data.output] = row;
      else ctx.vars.inserted = row;
      alertOwner(ctx, node.data.table, row, values);
      return;
    }

    case "update": {
      if (!node.data.datasourceId || !node.data.table)
        throw new Error("Update node missing datasource or table");
      const { source, adapter } = await getAdapter(node.data.datasourceId, ctx.projectId);
      const count = await adapter.update(
        source,
        node.data.table,
        interpolateObject(node.data.where, ctx),
        dropEmpty(interpolateObject(node.data.values, ctx) as Record<string, unknown>, node.data.skipEmpty)
      );
      if (node.data.output) ctx.vars[node.data.output] = count;
      else ctx.vars.updated = count;
      return;
    }

    case "delete": {
      if (!node.data.datasourceId || !node.data.table)
        throw new Error("Delete node missing datasource or table");
      const { source, adapter } = await getAdapter(node.data.datasourceId, ctx.projectId);
      const count = await adapter.remove(
        source,
        node.data.table,
        interpolateObject(node.data.where, ctx)
      );
      if (node.data.output) ctx.vars[node.data.output] = count;
      else ctx.vars.deleted = count;
      return;
    }

    case "sheets_read": {
      if (!node.data.datasourceId || !node.data.sheet)
        throw new Error("Sheets read missing datasource or sheet");
      const { source, adapter } = await getAdapter(node.data.datasourceId, ctx.projectId);
      const rows = await adapter.list(source, node.data.sheet, { limit: 1000 });
      if (node.data.output) ctx.vars[node.data.output] = rows;
      else ctx.vars.rows = rows;
      return;
    }

    case "sheets_append": {
      if (!node.data.datasourceId || !node.data.sheet)
        throw new Error("Sheets append missing datasource or sheet");
      const { source, adapter } = await getAdapter(node.data.datasourceId, ctx.projectId);
      let parsed: Record<string, unknown> = {};
      try {
        // Values inside the JSON template are escaped, so visitor text can't add fields.
        parsed = JSON.parse(interpolateJson(node.data.values, ctx) || "{}");
      } catch {
        parsed = {};
      }
      await adapter.insert(source, node.data.sheet, parsed);
      return;
    }

    case "http_request": {
      if (!node.data.url) throw new Error("HTTP node missing url");
      const url = interpolate(node.data.url, ctx);
      const headers: Record<string, string> = {};
      for (const [k, v] of Object.entries(node.data.headers ?? {})) {
        headers[k] = interpolate(v, ctx);
      }
      const method = node.data.method ?? "GET";
      const contentType = (Object.entries(headers).find(([k]) => k.toLowerCase() === "content-type")?.[1] ?? "").toLowerCase();
      const body =
        method === "GET" || method === "DELETE"
          ? undefined
          : requestBody(node.data.body, contentType, ctx);
      const res = await outboundFetch(url, { method, headers, body });
      const ct = res.headers.get("content-type") ?? "";
      const parsed = ct.includes("json") ? await res.json() : await res.text();
      const val = { status: res.status, body: parsed };
      if (node.data.output) ctx.vars[node.data.output] = val;
      else ctx.vars.response = val;
      return;
    }

    case "branch": {
      const left = interpolate(node.data.left, ctx);
      const right = interpolate(node.data.right, ctx);
      const ok = cmp(left, node.data.op ?? "==", right);
      return ok ? "true" : "false";
    }

    case "response": {
      const status = Number(node.data.status ?? 200);
      result.status = Number.isInteger(status) && status >= 200 && status <= 599 ? status : 200;
      // A feature's built-in reply in the visitor's language (lib/app-translations.ts).
      const variants = (node.data as { body_i18n?: Record<string, unknown> }).body_i18n;
      const variant = ctx.request && variants && typeof variants[ctx.request.lang] === "string" ? variants[ctx.request.lang] : undefined;
      const raw = (variant ?? node.data.body) as unknown;
      if (raw !== null && typeof raw === "object") {
        // A reply written as an object: each text in it is filled in.
        result.body = interpolateDeep(raw, ctx);
        return;
      }
      const template = raw == null ? undefined : String(raw);
      // Values inside JSON strings are escaped, so quotes and line breaks in
      // what visitors typed keep the reply valid JSON.
      const body = interpolateJson(template, ctx);
      try {
        result.body = body ? JSON.parse(body) : ctx.vars;
      } catch {
        result.body = interpolate(template, ctx);
      }
      return;
    }

    case "email": {
      const to = interpolate(node.data.to, ctx).replace(/[\r\n]+/g, " ").trim();
      if (!to) throw new Error("Email node missing 'to'");
      const out = node.data.output?.trim();
      const { emailEnabled, sendEmailDetailed } = await import("../mailer");
      if (!emailEnabled()) {
        // Not a failure of the flow: the visitor still gets the flow's reply,
        // and the owner sees why no email went out.
        warn(ctx, EMAIL_NOT_SET_UP_WARNING);
        if (out) ctx.vars[out] = { ok: false, skipped: true };
        return;
      }
      const recipients = [...new Set(to.split(/[,;]/).map((s) => (s.match(/<([^>]+)>/)?.[1] ?? s).trim().toLowerCase()).filter(Boolean))];
      const chosenByValue = /\{\{/.test(String(node.data.to ?? ""));
      if (!ctx.trusted) {
        const held = takeEmailAllowance(ctx.projectId, recipients, chosenByValue);
        if (held) {
          warn(ctx, held);
          if (out) ctx.vars[out] = { ok: false, skipped: true, error: held };
          return;
        }
      }
      // A feature's built-in email (verification code, login code…) in the
      // recipient's language: the one they signed up in, else the visitor's.
      const i18n = node.data as { subject_i18n?: Record<string, unknown>; body_i18n?: Record<string, unknown> };
      let emailLang: string | null = null;
      if (i18n.subject_i18n || i18n.body_i18n) emailLang = (await recipientLanguage(ctx.projectId, recipients[0])) ?? ctx.request?.lang ?? null;
      const pick = (v: Record<string, unknown> | undefined) => (emailLang && v && typeof v[emailLang] === "string" ? (v[emailLang] as string) : undefined);
      const subject = interpolate(pick(i18n.subject_i18n) ?? node.data.subject, ctx).replace(/[\r\n]+/g, " ").trim();
      const template = pick(i18n.body_i18n) ?? node.data.body ?? "";
      const isHtml = /<[a-z!/][^>]*>/i.test(template);
      // Values are escaped for HTML, so what a visitor typed shows as text
      // and can't add links or markup to the email.
      const escaped = interpolate(template, ctx, { escapeHtml: true });
      const html = isHtml ? escaped : escaped.replace(/\r?\n/g, "<br>\n");
      const text = isHtml ? undefined : interpolate(template, ctx);
      const from = realSender(interpolate(node.data.from, ctx).trim());
      const app = await db.project.findUnique({ where: { id: ctx.projectId }, select: { name: true } });
      const sent = await sendEmailDetailed({ to, subject, html, text, from, fromName: app?.name || undefined });
      if (!sent.ok) {
        if (!ctx.trusted) giveBackEmailAllowance(ctx.projectId, recipients, chosenByValue);
        warn(ctx, sent.skipped ? EMAIL_NOT_SET_UP_WARNING : sent.error || "The email couldn't be sent.");
      }
      if (out) ctx.vars[out] = { ok: sent.ok, ...(sent.skipped ? { skipped: true } : {}), ...(sent.error ? { error: sent.error } : {}) };
      return;
    }

    case "send_push": {
      const title = interpolate(node.data.title, ctx).trim();
      if (!title) throw new Error("Push step needs a title");
      const project = await db.project.findUnique({ where: { id: ctx.projectId }, select: { id: true, slug: true, ownerId: true, icon: true } });
      if (!project) throw new Error("App not found");
      const { appPublicUrl } = await import("../reseller");
      const { appIconUrl } = await import("../app-icon");
      const { sendPushToProject } = await import("../push");
      const base = await appPublicUrl(project);
      const link = interpolate(node.data.url, ctx).trim();
      const url = !link ? base : /^https?:\/\//i.test(link) ? link : `${base}${link.startsWith("/") ? "" : "/"}${link}`;
      const result = await sendPushToProject(ctx.projectId, { title, body: interpolate(node.data.body, ctx), url, icon: appIconUrl(project, 192) });
      ctx.vars[node.data.output?.trim() || "push"] = result;
      return;
    }

    case "ai_prompt": {
      const prompt = interpolate(node.data.prompt, ctx);
      const system =
        interpolate(node.data.system, ctx) ||
        "You are a helpful assistant inside an app's backend workflow. Respond concisely.";
      if (!prompt) throw new Error("AI prompt node is missing a prompt");
      // Anyone visiting a published app can trigger this step, so it is both
      // rate-limited per app and counted against the app owner's AI allowance.
      if (!hitLimit(`ai-flow:${ctx.projectId}`, Number(process.env.AI_FLOW_HOURLY_LIMIT || 120), 3_600_000).ok) {
        throw new Error("This app is receiving too many AI requests right now. Please try again later.");
      }
      const owner = await db.project.findUnique({ where: { id: ctx.projectId }, select: { owner: { select: { id: true, plan: true, role: true, resellerId: true } } } });
      const { aiQuotaProblem, recordAiUsage } = await import("../ai-quota");
      if (owner && (await aiQuotaProblem(owner.owner))) throw new Error("This app has reached its AI limit for the month.");
      if (owner) await recordAiUsage(owner.owner.id, "flow", ctx.projectId);

      const { providerComplete } = await import("../ai/provider");
      // Public visitors can trigger this, so bound it like a request, not a build.
      const text = await providerComplete({ systemPrompt: system, userMessage: prompt, maxTokens: 2000, signal: AbortSignal.timeout(90_000) });
      if (node.data.output) ctx.vars[node.data.output] = text;
      else ctx.vars.ai = text;
      return;
    }

    case "delay": {
      const s = Math.max(0, Math.min(60, Number(node.data.seconds ?? 0)));
      if (s > 0) await new Promise((r) => setTimeout(r, s * 1000));
      return;
    }

    case "parse_json": {
      const raw = interpolate(node.data.input, ctx);
      if (!raw) throw new Error("Parse JSON node missing 'input'");
      try {
        const parsed = JSON.parse(raw);
        if (node.data.output) ctx.vars[node.data.output] = parsed;
        else ctx.vars.parsed = parsed;
      } catch (err) {
        throw new Error(
          `Parse JSON failed: ${err instanceof Error ? err.message : "invalid JSON"}`
        );
      }
      return;
    }

    case "math": {
      let out: number;
      if (node.data.op === "random_int") {
        // A whole number from min to max, from the system's secure generator.
        out = secureRandomInt(wholeNumber(node.data.min, ctx, "smallest"), wholeNumber(node.data.max, ctx, "largest"));
      } else if (typeof node.data.expression === "string" && node.data.expression.trim()) {
        try {
          out = evaluateFormula(node.data.expression, ctx);
        } catch (err) {
          if (!(err instanceof FormulaSyntaxError)) throw err;
          // A formula this step can't work out keeps the step's plain
          // numbers, as before, and tells the owner why.
          warn(ctx, `The formula in step "${labelOf(node) ?? node.id}" can't be worked out: ${err.message}`);
          out = plainMath(node, ctx);
        }
      } else {
        out = plainMath(node, ctx);
      }
      if (node.data.output) ctx.vars[node.data.output] = out;
      else ctx.vars.result = out;
      return;
    }

    case "hash_password": {
      const plain = interpolate(node.data.input, ctx);
      if (!plain) throw new Error("hash_password node missing 'input'");
      // Masked wherever it appears in the stored run.
      ctx.secrets.add(plain);
      const hashed = await argon2.hash(plain, { type: argon2.argon2id });
      const out = node.data.output ?? "hash";
      ctx.vars[out] = hashed;
      return;
    }

    case "verify_password": {
      const plain = interpolate(node.data.plain, ctx);
      if (plain) ctx.secrets.add(plain);
      const hashed = interpolate(node.data.hash, ctx);
      let ok = false;
      if (plain && hashed) {
        try {
          ok = await argon2.verify(hashed, plain);
        } catch {
          ok = false;
        }
      }
      if (!ok) result.authFailed = true;
      const out = node.data.output ?? "verified";
      ctx.vars[out] = ok;
      return;
    }

    case "set_session": {
      const userId = interpolate(node.data.userId, ctx);
      if (!userId) throw new Error("set_session node missing 'userId'");
      const { token, expiresAt } = await signAppSession(ctx.projectId, userId);
      result.setCookies.push({
        name: sessionCookieName(),
        value: token,
        expires: expiresAt,
      });
      ctx.vars.session = { userId };
      return;
    }

    case "get_session": {
      const token = ctx.cookies[sessionCookieName()];
      const session = await verifyAppSession(ctx.projectId, token);
      const out = node.data.output ?? "session";
      if (!session) {
        ctx.vars[out] = { userId: null, role: null, email: null, name: null };
        return;
      }
      // Enrich the session with the user's row so flows can read role/email/name
      // and pages can gate on role without each flow having to do its own lookup.
      // Looks for the auth_users table (the auth module's convention) in this
      // project's internal datasource. Best-effort — if the lookup fails we
      // still return userId so existing flows don't break.
      let enriched: Record<string, unknown> = {
        userId: session.userId,
        role: null,
        email: null,
        name: null,
      };
      try {
        const ds = await db.dataSource.findFirst({
          where: { projectId: ctx.projectId, kind: "POSTGRES_INTERNAL" },
          select: { id: true },
        });
        if (ds) {
          const { source, adapter } = await getAdapter(ds.id, ctx.projectId);
          const rows = await adapter.list(source, "auth_users", {
            where: { id: session.userId },
            limit: 1,
          });
          const row = rows[0] as Record<string, unknown> | undefined;
          if (row) {
            enriched = {
              userId: session.userId,
              role: (row.role as string | null) ?? null,
              email: (row.email as string | null) ?? null,
              name: (row.name as string | null) ?? null,
            };
          }
        }
      } catch {
        // Swallow — keep the userId-only fallback above.
      }
      ctx.vars[out] = enriched;
      return;
    }

    case "clear_session": {
      result.setCookies.push({
        name: sessionCookieName(),
        value: "",
        maxAge: 0,
      });
      ctx.vars.session = { userId: null };
      return;
    }

    case "lookup": {
      const sourceVar = node.data.sourceVar?.trim();
      if (!sourceVar) throw new Error("Lookup node missing sourceVar");
      const sourceRows = ctx.vars[sourceVar];
      if (!Array.isArray(sourceRows)) throw new Error(`Lookup: ${sourceVar} is not an array`);
      if (!node.data.datasourceId || !node.data.lookupTable)
        throw new Error("Lookup node missing datasource or lookupTable");
      const { source: ds, adapter: ad } = await getAdapter(node.data.datasourceId, ctx.projectId);
      const srcField = node.data.sourceField ?? "id";
      const lkpField = node.data.lookupField ?? "id";
      const asField = node.data.as ?? "lookup";
      // Fetch all matching lookup rows in one query per unique key
      const keys = [...new Set(sourceRows.map((r: Record<string, unknown>) => r[srcField]).filter(Boolean))];
      const enriched = [];
      for (const row of sourceRows) {
        const key = (row as Record<string, unknown>)[srcField];
        if (key) {
          const matched = await ad.list(ds, node.data.lookupTable, {
            where: { [lkpField]: String(key) },
            limit: 10,
          });
          (row as Record<string, unknown>)[asField] = matched.length === 1 ? matched[0] : matched;
        }
        enriched.push(row);
      }
      const outName = node.data.output?.trim() || sourceVar;
      ctx.vars[outName] = enriched;
      return;
    }

    case "check_role": {
      const expected = interpolate(node.data.role, ctx)?.trim();
      if (!expected) throw new Error("check_role node missing role");
      const src = node.data.source?.trim() || "session.role";
      // Navigate dot-path into vars (e.g. "session.role")
      let actual: unknown = ctx.vars;
      for (const part of src.split(".")) {
        actual = (actual as Record<string, unknown>)?.[part];
      }
      const matches = String(actual ?? "").toLowerCase() === expected.toLowerCase();
      const outName = node.data.output?.trim() || "roleOk";
      ctx.vars[outName] = matches;
      return;
    }

    case "bulk_insert": {
      if (!node.data.datasourceId || !node.data.table)
        throw new Error("bulk_insert node missing datasource or table");
      const rowsVar = node.data.rowsVar?.trim();
      if (!rowsVar) throw new Error("bulk_insert missing rowsVar");
      const rows = ctx.vars[rowsVar];
      if (!Array.isArray(rows)) throw new Error(`bulk_insert: ${rowsVar} is not an array`);
      const { source: bs, adapter: ba } = await getAdapter(node.data.datasourceId, ctx.projectId);
      let count = 0;
      for (const row of rows) {
        await ba.insert(bs, node.data.table, row as Record<string, unknown>);
        count++;
      }
      const outName = node.data.output?.trim() || "inserted";
      ctx.vars[outName] = count;
      return;
    }

    case "bulk_update": {
      if (!node.data.datasourceId || !node.data.table)
        throw new Error("bulk_update node missing datasource or table");
      const { source: bus, adapter: bua } = await getAdapter(node.data.datasourceId, ctx.projectId);
      const count = await bua.update(
        bus,
        node.data.table,
        interpolateObject(node.data.where, ctx),
        interpolateObject(node.data.values, ctx)
      );
      const outName = node.data.output?.trim() || "updated";
      ctx.vars[outName] = count;
      return;
    }

    case "bulk_delete": {
      if (!node.data.datasourceId || !node.data.table)
        throw new Error("bulk_delete node missing datasource or table");
      const { source: bds, adapter: bda } = await getAdapter(node.data.datasourceId, ctx.projectId);
      const count = await bda.remove(
        bds,
        node.data.table,
        interpolateObject(node.data.where, ctx)
      );
      const outName = node.data.output?.trim() || "deleted";
      ctx.vars[outName] = count;
      return;
    }

    case "aggregate": {
      if (!node.data.datasourceId || !node.data.table)
        throw new Error("aggregate node missing datasource or table");
      const { source: ags, adapter: aga } = await getAdapter(node.data.datasourceId, ctx.projectId);
      // Use a custom query via the adapter's raw method if available,
      // otherwise fall back to list + custom_js-style aggregation
      const groupBy = interpolate(node.data.groupBy, ctx) ?? "";
      const agg = interpolate(node.data.aggregate, ctx) ?? "COUNT(*)";
      const where = interpolateObject(node.data.where, ctx);
      const orderBy = interpolate(node.data.orderBy, ctx) ?? "";
      const limit = node.data.limit ?? 100;
      // Build and execute raw SQL through the adapter
      if ("rawQuery" in aga && typeof aga.rawQuery === "function") {
        const rows = await aga.rawQuery(ags, node.data.table, {
          groupBy,
          aggregate: agg,
          where,
          orderBy,
          limit,
        });
        const outName = node.data.output?.trim() || "aggregated";
        ctx.vars[outName] = rows;
      } else {
        // Fallback: fetch all rows and aggregate in JS
        const allRows = await aga.list(ags, node.data.table, { where, limit: 10000 });
        const outName = node.data.output?.trim() || "aggregated";
        ctx.vars[outName] = allRows;
      }
      return;
    }

    case "custom_js": {
      const code = node.data.code?.trim();
      if (!code) return;
      const outName = node.data.output?.trim() || "result";
      const vm = await import("node:vm");
      // Scripts get `vars` (writable — mutations persist to the flow's vars)
      // and `trigger` (frozen). Whatever the script returns is stored in
      // `vars[outName]`.
      //
      // No host-realm object may enter the context: any one of them (even the
      // sandbox itself, via `this`) leads to the host's Function constructor
      // through `.constructor.constructor` and from there to `process`. So
      // only a JSON string crosses in, the script's objects are built from the
      // context's own JSON/Object, and only a JSON string crosses back out.
      const toJson = (v: unknown) =>
        JSON.stringify(v, (_k, x) => (typeof x === "bigint" ? x.toString() : x));
      // Per-key snapshot so only vars the script actually changed are written
      // back — untouched ones keep their original types (Dates, BigInts).
      const before = new Map(Object.entries(ctx.vars).map(([k, v]) => [k, toJson(v)]));
      const sandbox = Object.create(null) as Record<string, unknown>;
      sandbox.__nkIn = toJson({
        vars: ctx.vars,
        trigger: structuredCloneSafe(ctx.trigger),
      });
      const context = vm.createContext(sandbox, {
        name: `flow:${ctx.flowId}:${node.id}`,
        codeGeneration: { strings: false, wasm: false },
        microtaskMode: "afterEvaluate",
      });
      // Wrap in an IIFE so the user code can freely `return` a value.
      const wrapped =
        `(function(){const __d=JSON.parse(__nkIn);delete globalThis.__nkIn;` +
        `const __r=(function(vars,trigger,console){\n${code}\n})` +
        `(__d.vars,Object.freeze(__d.trigger),{log(){},warn(){},error(){}});` +
        `return JSON.stringify({vars:__d.vars,has:__r!==undefined,value:__r});})()`;
      let out: { vars?: Record<string, unknown>; has?: boolean; value?: unknown };
      try {
        const script = new vm.Script(wrapped, {
          filename: `flow:${ctx.flowId}:${node.id}`,
          lineOffset: -1,
        });
        const raw = script.runInContext(context, { timeout: 3000 });
        out = typeof raw === "string" ? JSON.parse(raw) : {};
      } catch (err) {
        throw new Error(
          `Custom JS failed: ${err instanceof Error ? err.message : String(err)}`
        );
      }
      if (out.vars && typeof out.vars === "object") {
        for (const k of Object.keys(ctx.vars)) if (!(k in out.vars)) delete ctx.vars[k];
        for (const [k, v] of Object.entries(out.vars)) {
          if (before.get(k) !== toJson(v)) ctx.vars[k] = v;
        }
      }
      if (out.has) {
        ctx.vars[outName] = out.value;
      }
      return;
    }

    default:
      throw new Error(`Unknown node type: ${(node as FlowNode).type}`);
  }
}

function dropEmpty(values: Record<string, unknown>, skip: boolean | undefined): Record<string, unknown> {
  if (!skip || !values) return values;
  return Object.fromEntries(Object.entries(values).filter(([, v]) => v !== "" && v !== undefined && v !== null));
}

function structuredCloneSafe(value: unknown): unknown {
  // structuredClone throws on things like functions — fall back to a JSON
  // round-trip so scripts get a plain-data copy of the trigger payload.
  try {
    return structuredClone(value);
  } catch {
    try {
      return JSON.parse(JSON.stringify(value ?? null));
    } catch {
      return null;
    }
  }
}

async function getAdapter(id: string, projectId: string) {
  const result = await loadAdapter(id);
  if (result.source.projectId !== projectId) throw new Error("Data source does not belong to this app.");
  return result;
}
