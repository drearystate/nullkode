// After the Claude CLI agent finishes, walk the workspace for
// `meta/tables.json` and `meta/flows.json`. If present, push them through
// Nullkode's existing scaffold helpers so the resulting Project gets real
// DataTables and Flows — and the HTML's `data-nk-flow-ref` attributes get
// rewritten to point at the real Flow ids. This is what makes the
// Designer's output a wired app instead of a static mockup.

import { designerOwnsProject } from "./pages-mirror";
import { db } from "../db";
import {
  ensureInternalDatasource,
  persistFlows,
  persistTables,
  rewriteFlowRefsInHtml,
  type ScaffoldFlow,
  type ScaffoldTable,
} from "../ai/apply-scaffold";

export interface ScaffoldOutcome {
  tablesCreated: string[];
  flowsCreated: string[];
  pagesUpdated: string[];
}

function tryParseJson<T>(raw: string | undefined): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

interface MetaTablesFile {
  tables?: Array<{
    name?: string;
    fields?: Array<{ name?: string; type?: string }>;
  }>;
}

interface MetaFlowsFile {
  flows?: Array<{
    slug?: string;
    name?: string;
    purpose?: string;
    table?: string;
    kind?: string;
    fields?: string[];
  }>;
}

function coerceTables(raw: MetaTablesFile | null): ScaffoldTable[] {
  if (!raw?.tables) return [];
  const out: ScaffoldTable[] = [];
  for (const t of raw.tables) {
    if (typeof t?.name !== "string" || !Array.isArray(t.fields)) continue;
    const fields = t.fields
      .filter(
        (f): f is { name: string; type: string } =>
          typeof f?.name === "string" && typeof f?.type === "string",
      )
      .map((f) => ({
        name: f.name,
        type: (["text", "int", "float", "bool", "timestamp", "json"].includes(f.type)
          ? f.type
          : "text") as ScaffoldTable["fields"][number]["type"],
      }));
    if (fields.length === 0) continue;
    out.push({ name: t.name, fields });
  }
  return out;
}

function coerceFlows(raw: MetaFlowsFile | null, tables: ScaffoldTable[]): ScaffoldFlow[] {
  if (!raw?.flows) return [];
  const out: ScaffoldFlow[] = [];
  for (const f of raw.flows) {
    if (typeof f?.slug !== "string" || typeof f?.name !== "string") continue;
    // Build a minimal nodes graph for the requested kind. The applyScaffold
    // path expects a proper trigger + body + response. For the Designer's
    // emitted metadata, the agent typically only knows kind+table+fields;
    // we synthesize a working graph here so the user gets a runnable flow
    // without the agent having to spell out every node.
    const kind = (f.kind ?? "custom").toLowerCase();
    const table = typeof f.table === "string" ? f.table : null;
    const fieldNames = Array.isArray(f.fields)
      ? f.fields.filter((s): s is string => typeof s === "string")
      : (tables.find(t => t.name === table)?.fields.map(f => f.name) ?? []);

    const nodes: ScaffoldFlow["nodes"] = [];
    const edges: ScaffoldFlow["edges"] = [];

    nodes.push({
      id: "trigger",
      type: "trigger",
      data: { kind: "http", method: "POST", path: `/api/run/${f.slug}` },
    } as unknown as ScaffoldFlow["nodes"][number]);

    if (kind === "insert" && table) {
      nodes.push({
        id: "insert1",
        type: "insert",
        data: { table, skipEmpty: true, values: Object.fromEntries(fieldNames.map(name => [name, `{{trigger.${name}}}`])) },
      } as unknown as ScaffoldFlow["nodes"][number]);
      edges.push({ id: "trigger-insert1", source: "trigger", target: "insert1" } as unknown as ScaffoldFlow["edges"][number]);
      nodes.push({
        id: "respond",
        type: "response",
        data: { status: 200, body: '{"ok":true}' },
      } as unknown as ScaffoldFlow["nodes"][number]);
      edges.push({ id: "insert1-respond", source: "insert1", target: "respond" } as unknown as ScaffoldFlow["edges"][number]);
    } else if (kind === "query" && table) {
      nodes.push({
        id: "query1",
        type: "query",
        data: { table, limit: 100 },
      } as unknown as ScaffoldFlow["nodes"][number]);
      edges.push({ id: "trigger-query1", source: "trigger", target: "query1" } as unknown as ScaffoldFlow["edges"][number]);
      nodes.push({
        id: "respond",
        type: "response",
        data: { status: 200, body: "{{vars.rows}}" },
      } as unknown as ScaffoldFlow["nodes"][number]);
      edges.push({ id: "query1-respond", source: "query1", target: "respond" } as unknown as ScaffoldFlow["edges"][number]);
    } else if (kind === "update" && table) {
      nodes.push({
        id: "update1",
        type: "update",
        data: { table, skipEmpty: true, where: { id: "{{trigger.id}}" }, values: Object.fromEntries(fieldNames.map(name => [name, `{{trigger.${name}}}`])) },
      } as unknown as ScaffoldFlow["nodes"][number]);
      edges.push({ id: "trigger-update1", source: "trigger", target: "update1" } as unknown as ScaffoldFlow["edges"][number]);
      nodes.push({
        id: "respond",
        type: "response",
        data: { status: 200, body: '{"ok":true}' },
      } as unknown as ScaffoldFlow["nodes"][number]);
      edges.push({ id: "update1-respond", source: "update1", target: "respond" } as unknown as ScaffoldFlow["edges"][number]);
    } else if (kind === "delete" && table) {
      nodes.push({
        id: "delete1",
        type: "delete",
        data: { table, where: { id: "{{trigger.id}}" } },
      } as unknown as ScaffoldFlow["nodes"][number]);
      edges.push({ id: "trigger-delete1", source: "trigger", target: "delete1" } as unknown as ScaffoldFlow["edges"][number]);
      nodes.push({
        id: "respond",
        type: "response",
        data: { status: 200, body: '{"ok":true}' },
      } as unknown as ScaffoldFlow["nodes"][number]);
      edges.push({ id: "delete1-respond", source: "delete1", target: "respond" } as unknown as ScaffoldFlow["edges"][number]);
    } else {
      // Unknown kind / no table — terminator response only.
      nodes.push({
        id: "respond",
        type: "response",
        data: { status: 200, body: '{"ok":true}' },
      } as unknown as ScaffoldFlow["nodes"][number]);
      edges.push({ id: "trigger-respond", source: "trigger", target: "respond" } as unknown as ScaffoldFlow["edges"][number]);
    }

    out.push({
      slug: f.slug,
      name: f.name,
      purpose: f.purpose ?? f.name,
      nodes: nodes.map(n => ({ ...n, data: JSON.stringify(n.data) })),
      edges,
    } as ScaffoldFlow);
  }
  return out;
}

/**
 * Run after the agent finishes and DesignerFile rows are synced. Walks
 * the meta/*.json files in the design's workspace, persists Tables and
 * Flows on the Project, and rewrites data-nk-flow-ref="<slug>" in every
 * HTML file to data-nk-flow="<real-id>". Returns a summary the renderer
 * can surface in chat.
 */
export async function applyScaffoldFromWorkspace(
  userId: string,
  designId: string,
  projectId: string,
): Promise<ScaffoldOutcome> {
  // Apps that moved to the page builder are never changed by the Designer.
  if (!(await designerOwnsProject(projectId))) return { tablesCreated: [], flowsCreated: [], pagesUpdated: [] };
  // Read the two meta files from the virtual workspace.
  const [tablesRow, flowsRow] = await Promise.all([
    db.designerFile.findUnique({
      where: { designId_path: { designId, path: "meta/tables.json" } },
      select: { content: true },
    }),
    db.designerFile.findUnique({
      where: { designId_path: { designId, path: "meta/flows.json" } },
      select: { content: true },
    }),
  ]);

  const tables = coerceTables(tryParseJson<MetaTablesFile>(tablesRow?.content));
  const flows = coerceFlows(tryParseJson<MetaFlowsFile>(flowsRow?.content), tables);

  const outcome: ScaffoldOutcome = {
    tablesCreated: [],
    flowsCreated: [],
    pagesUpdated: [],
  };

  if (tables.length === 0 && flows.length === 0) return outcome;

  const datasource = await ensureInternalDatasource(projectId);

  if (tables.length > 0) {
    outcome.tablesCreated = await persistTables(projectId, datasource.id, tables);
  }

  const flowSlugToId = new Map<string, string>();
  if (flows.length > 0) {
    const map = await persistFlows(projectId, datasource.id, flows, true);
    for (const [slug, id] of map) flowSlugToId.set(slug, id);
    outcome.flowsCreated = Array.from(map.keys());
  }

  // Rewrite data-nk-flow-ref="slug" → data-nk-flow="<id>" in every HTML
  // file of the workspace, so the runtime knows which Flow to invoke.
  if (flowSlugToId.size > 0) {
    const htmlFiles = await db.designerFile.findMany({
      where: { designId, kind: "HTML" },
      select: { id: true, path: true, content: true },
    });
    for (const f of htmlFiles) {
      const rewritten = rewriteFlowRefsInHtml(f.content, flowSlugToId);
      if (rewritten !== f.content) {
        await db.designerFile.update({
          where: { id: f.id },
          data: { content: rewritten, size: Buffer.byteLength(rewritten, "utf8") },
        });
        outcome.pagesUpdated.push(f.path);
      }
    }
  }

  void userId; // ownership already verified upstream by ensureOwned/etc.
  return outcome;
}
