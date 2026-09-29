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

/**
 * What a standard flow does, carried on scaffold flows the builder made from
 * a standard graph (see ScaffoldResult in ./schema). The build checks use it
 * to compare form fields and list fields with the table's columns, and the
 * autofix rebuilds these flows when it adds a column.
 */
export type StandardFlowInfo = { kind: StandardKind; table: string; auth: boolean };

/** Columns every table has without declaring them. */
export const AUTO_COLUMNS = ["id", "created_at", "updated_at", "created_by"] as const;

/**
 * Fields a page may read from a standard flow's rows (data-nk-field and
 * friends): list and load return whole rows; the standard count returns
 * rows shaped { value } (plus the grouping column when there is one).
 */
export function rowFieldsFor(info: Pick<StandardFlowInfo, "kind">, columns: string[], groupBy?: string | null): string[] | null {
  if (info.kind === "list" || info.kind === "load") return [...columns, ...AUTO_COLUMNS];
  if (info.kind === "aggregate") return groupBy ? ["value", groupBy] : ["value"];
  return null;
}

/** Singular/plural spellings to try when matching a slug's noun to a table. */
function nounForms(noun: string): string[] {
  const n = noun.replace(/-/g, "_");
  const forms = new Set([n, `${n}s`, `${n}es`]);
  if (n.endsWith("ies")) forms.add(`${n.slice(0, -3)}y`);
  if (n.endsWith("y")) forms.add(`${n.slice(0, -1)}ies`);
  if (n.endsWith("es")) forms.add(n.slice(0, -2));
  if (n.endsWith("s")) forms.add(n.slice(0, -1));
  return [...forms];
}

const SLUG_VERBS: Record<string, StandardKind> = {
  list: "list", fetch: "list", all: "list",
  load: "load", get: "load", show: "load", view: "load",
  create: "create", add: "create", new: "create", submit: "create", save: "create",
  update: "update", edit: "update",
  delete: "delete", remove: "delete",
  count: "aggregate",
};

/**
 * The standard flow a slug names, when it follows the builder's naming
 * ("list-orders", "create-order", "load-booking", "update-task",
 * "delete-task", "count-orders") and its noun matches exactly one table.
 */
export function standardFlowFromSlug(slug: string, tableNames: string[]): { kind: StandardKind; table: string } | null {
  const m = /^([a-z]+)-([a-z0-9][a-z0-9-]*)$/.exec(slug.trim().toLowerCase());
  if (!m) return null;
  const kind = SLUG_VERBS[m[1]];
  if (!kind) return null;
  const forms = nounForms(m[2]);
  const matches = tableNames.filter((t) => forms.includes(t.toLowerCase()));
  return matches.length === 1 ? { kind, table: matches[0] } : null;
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
