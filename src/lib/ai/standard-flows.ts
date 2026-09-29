/**
 * Deterministic flow graphs for the standard data operations.
 *
 * The AI decides WHAT an app needs (tables, pages, which flows); for the
 * common CRUD shapes there is exactly one right graph, so we build it in code
 * instead of asking a model to spell out nodes and edges. That makes the
 * backend correct by construction on any model — small local models skip the
 * flow step entirely, and larger ones fall back to these graphs whenever
 * their own output fails validation.
 */

export type StandardKind = "list" | "load" | "create" | "update" | "delete" | "aggregate";

export type GraphNode = { id: string; type: string; data: Record<string, unknown> };
export type GraphEdge = { id: string; source: string; target: string; sourceHandle: string | null };

const KIND_ALIASES: Record<string, StandardKind> = {
  list: "list", query: "list", read: "list", search: "list", fetch: "list",
  load: "load", get: "load", detail: "load", show: "load",
  create: "create", insert: "create", add: "create", submit: "create", save: "create",
  update: "update", edit: "update",
  delete: "delete", remove: "delete",
  aggregate: "aggregate", count: "aggregate", kpi: "aggregate", stats: "aggregate",
};

export function standardKind(kind: string | undefined): StandardKind | null {
  return KIND_ALIASES[(kind ?? "").trim().toLowerCase()] ?? null;
}

export function standardFlowGraph(opts: {
  kind: StandardKind;
  table: string;
  fields: string[];
  /** Require a signed-in visitor (writes on member-only pages). */
  auth?: boolean;
}): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = [{ id: "trigger", type: "trigger", data: { label: "Trigger" } }];
  const edges: GraphEdge[] = [];
  let last = "trigger";
  const link = (target: string, sourceHandle: string | null = null) => {
    edges.push({ id: `${last}-${target}${sourceHandle ? `-${sourceHandle}` : ""}`, source: last, target, sourceHandle });
  };

  if (opts.auth) {
    nodes.push({ id: "session", type: "get_session", data: { output: "session" } });
    link("session");
    last = "session";
    nodes.push({ id: "signedIn", type: "branch", data: { left: "{{vars.session.userId}}", op: "exists", right: "" } });
    link("signedIn");
    last = "signedIn";
    nodes.push({ id: "denied", type: "response", data: { status: 401, body: '{"error":"Please sign in first."}' } });
    link("denied", "false");
  }
  const next = (node: GraphNode) => {
    nodes.push(node);
    link(node.id, last === "signedIn" ? "true" : null);
    last = node.id;
  };
  const values = Object.fromEntries(opts.fields.map((f) => [f, `{{trigger.${f}}}`]));
  const ok = { status: 200, body: '{"ok":true}' };

  switch (opts.kind) {
    case "list":
      next({ id: "query", type: "query", data: { table: opts.table, limit: 200, orderBy: "created_at desc", output: "rows" } });
      next({ id: "respond", type: "response", data: { status: 200, body: "{{vars.rows}}" } });
      break;
    case "load":
      next({ id: "query", type: "query", data: { table: opts.table, where: { id: "{{trigger.id}}" }, limit: 1, output: "rows" } });
      next({ id: "respond", type: "response", data: { status: 200, body: "{{vars.rows}}" } });
      break;
    case "create":
      next({ id: "insert", type: "insert", data: { table: opts.table, values, skipEmpty: true, output: "inserted" } });
      next({ id: "respond", type: "response", data: { status: 200, body: '{"ok":true,"id":"{{vars.inserted.id}}"}' } });
      break;
    case "update":
      next({ id: "update", type: "update", data: { table: opts.table, where: { id: "{{trigger.id}}" }, values, skipEmpty: true, output: "updated" } });
      next({ id: "respond", type: "response", data: ok });
      break;
    case "delete":
      next({ id: "delete", type: "delete", data: { table: opts.table, where: { id: "{{trigger.id}}" }, output: "deleted" } });
      next({ id: "respond", type: "response", data: ok });
      break;
    case "aggregate":
      next({ id: "count", type: "aggregate", data: { table: opts.table, aggregate: "COUNT(*)", output: "stats" } });
      next({ id: "respond", type: "response", data: { status: 200, body: "{{vars.stats}}" } });
      break;
  }
  return { nodes, edges };
}
