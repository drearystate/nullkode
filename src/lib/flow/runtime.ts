import { publicFetch } from "../public-url";
import argon2 from "argon2";
import type { FlowGraph, FlowNode, RunContext, RunResult } from "./types";
import { interpolate, interpolateObject, cmp } from "./expr";
import { getAdapter as loadAdapter } from "../datasources";
import { db } from "../db";
import { liveSnapshot } from "../deployments";
import { signAppSession, verifyAppSession, sessionCookieName } from "./session";
import { checkFlowAccess } from "./access";

export async function runFlow(
  flowId: string,
  trigger: unknown,
  cookies: Record<string, string> = {},
  // trusted: the owner testing in the builder, or the platform itself
  // (schedules). Everyone else must pass the same sign-in and role checks as
  // the pages that use the flow.
  opts: { live?: boolean; trusted?: boolean } = {}
): Promise<RunResult> {
  const flow = await db.flow.findUnique({ where: { id: flowId } });
  if (!flow) throw new Error("Flow not found");
  if (!opts.trusted) {
    const denied = await checkFlowAccess(flow, cookies, Boolean(opts.live));
    if (denied) return { status: denied.status, body: denied.body, vars: {}, setCookies: [], trace: [] };
  }
  let graph = flow.graph as unknown as FlowGraph;
  // Published apps, webhooks and schedules run the version frozen at the last
  // publish; the builder runs the draft. A flow created since then has no
  // published version yet, so it runs as saved.
  if (opts.live) {
    const published = (await liveSnapshot(flow.projectId))?.flows.find((f) => f.id === flow.id);
    if (published) graph = published.graph as unknown as FlowGraph;
  }

  const ctx: RunContext = {
    trigger,
    vars: {},
    projectId: flow.projectId,
    flowId: flow.id,
    cookies,
  };

  const start = findTrigger(graph);
  if (!start) {
    return {
      status: 500,
      body: { error: "Flow has no trigger node" },
      vars: ctx.vars,
      setCookies: [],
      trace: [],
    };
  }

  const result: RunResult = {
    status: 200,
    body: { ok: true },
    vars: ctx.vars,
    setCookies: [],
    trace: [],
  };

  const startedAt = Date.now();
  await walk(start.id, graph, ctx, result, new Set());

  const failed = result.trace.find((t) => !t.ok);
  const run = await db.flowRun.create({
    data: {
      flowId: flow.id,
      status: String(result.status),
      input: trigger as object,
      output: result.body as object,
      error: failed?.error ? String(failed.error).slice(0, 2000) : null,
      durationMs: Date.now() - startedAt,
    },
  });
  void run;
  return result;
}

// Postgres invalid text/datetime/number, not-null, check and foreign-key
// violations, plus the adapters' own refusals.
const BAD_INPUT_CODES = new Set(["22P02", "22007", "22008", "22003", "23502", "23503", "23514", "NK_BAD_INPUT"]);

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
  visited: Set<string>
): Promise<void> {
  if (visited.has(nodeId)) return;
  visited.add(nodeId);

  const node = graph.nodes.find((n) => n.id === nodeId);
  if (!node) return;

  const t0 = Date.now();
  try {
    const handle = await executeNode(node, ctx, result);
    result.trace.push({
      nodeId: node.id,
      type: node.type,
      durationMs: Date.now() - t0,
      ok: true,
    });
    const nexts = nextOf(graph, nodeId, handle);
    for (const n of nexts) {
      await walk(n, graph, ctx, result, visited);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    result.trace.push({
      nodeId: node.id,
      type: node.type,
      durationMs: Date.now() - t0,
      ok: false,
      error: message,
    });
    // A value the database can't store (text in a number column, a blank
    // required field, a duplicate) is the caller's mistake, not a crash:
    // answer 400/409 in plain words. The database's own text is kept on the
    // run for the owner, never sent to visitors.
    const code = (err as { code?: unknown } | null)?.code;
    if (code === "23505") {
      result.status = 409;
      result.body = { error: "That already exists.", nodeId: node.id };
    } else if (typeof code === "string" && BAD_INPUT_CODES.has(code)) {
      result.status = 400;
      result.body = { error: "Some of the information is missing or in the wrong format.", nodeId: node.id };
    } else {
      result.status = 500;
      result.body = { error: message, nodeId: node.id };
    }
  }
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
        parsed = JSON.parse(interpolate(node.data.values, ctx) || "{}");
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
      const body =
        method === "GET" || method === "DELETE"
          ? undefined
          : interpolate(node.data.body, ctx);
      const res = await publicFetch(url, { method, headers, body });
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
      result.status = node.data.status ?? 200;
      try {
        const body = interpolate(node.data.body, ctx);
        result.body = body ? JSON.parse(body) : ctx.vars;
      } catch {
        result.body = interpolate(node.data.body, ctx);
      }
      return;
    }

    case "email": {
      const to = interpolate(node.data.to, ctx);
      const subject = interpolate(node.data.subject, ctx);
      const body = interpolate(node.data.body, ctx);
      if (!to) throw new Error("Email node missing 'to'");
      let from = interpolate(node.data.from, ctx);
      if (!from) {
        // Send as the app (its own name) from the server's configured address.
        const configured = process.env.DEFAULT_EMAIL_FROM;
        if (!configured) throw new Error("Set DEFAULT_EMAIL_FROM on the server, or a From address on this step.");
        const address = configured.match(/<([^>]+)>/)?.[1] ?? configured;
        const app = await db.project.findUnique({ where: { id: ctx.projectId }, select: { name: true } });
        from = app?.name ? `${app.name.replace(/[<>"]/g, "")} <${address}>` : configured;
      }

      const apiKey = process.env.RESEND_API_KEY;
      if (!apiKey) {
        // Soft-fail in dev — log and move on so flows remain testable
        console.warn("[email node] RESEND_API_KEY not set; skipping send", { to, subject });
        if (node.data.output) ctx.vars[node.data.output] = { ok: false, skipped: true };
        return;
      }
      const { Resend } = await import("resend");
      const resend = new Resend(apiKey);
      const send = await resend.emails.send({
        from,
        to,
        subject,
        html: body,
      });
      if (node.data.output) ctx.vars[node.data.output] = send;
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
      const { hitLimit } = await import("../rate-limit");
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
      const left = Number(interpolate(node.data.left, ctx));
      const right = Number(interpolate(node.data.right, ctx));
      let out = 0;
      switch (node.data.op) {
        case "+":
          out = left + right;
          break;
        case "-":
          out = left - right;
          break;
        case "*":
          out = left * right;
          break;
        case "/":
          out = right === 0 ? 0 : left / right;
          break;
        case "%":
          out = right === 0 ? 0 : left % right;
          break;
        default:
          out = left + right;
      }
      if (node.data.output) ctx.vars[node.data.output] = out;
      else ctx.vars.result = out;
      return;
    }

    case "hash_password": {
      const plain = interpolate(node.data.input, ctx);
      if (!plain) throw new Error("hash_password node missing 'input'");
      const hashed = await argon2.hash(plain, { type: argon2.argon2id });
      const out = node.data.output ?? "hash";
      ctx.vars[out] = hashed;
      return;
    }

    case "verify_password": {
      const plain = interpolate(node.data.plain, ctx);
      const hashed = interpolate(node.data.hash, ctx);
      let ok = false;
      if (plain && hashed) {
        try {
          ok = await argon2.verify(hashed, plain);
        } catch {
          ok = false;
        }
      }
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
