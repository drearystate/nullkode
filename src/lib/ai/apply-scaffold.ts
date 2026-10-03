import { db } from "../db";
import { slugify, projectSlug } from "../utils";
import { isLanguageSlug } from "../app-translations";
import { ensureInternalTable } from "../datasources/postgres";
import { THEME_PRESETS, type ProjectTheme } from "../theme";
import { getModule } from "../modules/registry";
import { installModule } from "../modules/install";
import { syncProjectNav } from "../nav-sync";
import type { ScaffoldResult } from "./schema";
import { flowRefMap, resolveFlowRefsWith } from "./flow-refs";
import { setAppLocale } from "../app-locale";
import type { Locale } from "@/i18n/locales";

type FieldType = "text" | "int" | "float" | "bool" | "timestamp" | "json";

export type ScaffoldTable = ScaffoldResult["datasource"]["tables"][number];
export type ScaffoldFlow = ScaffoldResult["flows"][number];

/**
 * Ensure the project has an internal Postgres datasource, reusing the
 * existing one if any. Shared between scaffold and incremental edits.
 */
export async function ensureInternalDatasource(projectId: string) {
  const existing = await db.dataSource.findFirst({
    where: { projectId, kind: "POSTGRES_INTERNAL" },
  });
  if (existing) return existing;
  return db.dataSource.create({
    data: { projectId, name: "Main database", kind: "POSTGRES_INTERNAL" },
  });
}

const RESERVED_COLS = new Set(["id", "created_at", "updated_at"]);

/**
 * Create DB tables from a scaffold-style table list. Idempotent at the
 * Postgres level (CREATE TABLE IF NOT EXISTS) — we skip the DataTable
 * metadata row if a table of that name already exists for the datasource.
 * Returns the names of tables that were newly created in the metadata.
 */
export async function persistTables(
  projectId: string,
  datasourceId: string,
  tables: ScaffoldTable[]
): Promise<string[]> {
  const created: string[] = [];
  for (const table of tables) {
    const cleanName = sanitizeIdent(table.name);
    if (!cleanName) continue;
    const fields = table.fields
      .map((f) => ({ name: sanitizeIdent(f.name), type: f.type as FieldType }))
      .filter((f) => f.name && !RESERVED_COLS.has(f.name));
    if (fields.length === 0) continue;

    const existing = await db.dataTable.findFirst({
      where: { datasourceId, name: cleanName },
    });
    if (existing) continue;

    await ensureInternalTable(projectId, cleanName, fields);
    await db.dataTable.create({
      data: { datasourceId, name: cleanName, schema: { fields } },
    });
    created.push(cleanName);
    if (table.seed?.length) await insertSeedRows(projectId, cleanName, fields, table.seed).catch((err) => console.error(`[scaffold] couldn't add example rows to ${cleanName}:`, err instanceof Error ? err.message : err));
  }
  return created;
}

/**
 * Model output isn't always schema-checked (JSON mode on local models, Ask AI):
 * edges arrive as {source,target}, {from,to} or {sourceId,targetId}. Saving
 * them as-is left 399 flows whose edges pointed nowhere, so every run stopped
 * after the trigger and answered "ok" without doing anything. Keep the edges
 * that connect real nodes; if none do and the flow is a straight line (no
 * branch), connect the nodes in the order given.
 */
export function normalizeEdges(nodes: Array<{ id: string; type: string }>, raw: Array<Record<string, unknown>> | undefined) {
  const ids = new Set(nodes.map((n) => n.id));
  const pick = (e: Record<string, unknown>, keys: string[]) => {
    for (const k of keys) if (typeof e[k] === "string" && e[k]) return e[k] as string;
    return undefined;
  };
  const edges = (raw ?? []).flatMap((e, i) => {
    const source = pick(e, ["source", "from", "sourceId", "sourceNode"]);
    const target = pick(e, ["target", "to", "targetId", "targetNode"]);
    if (!source || !target || !ids.has(source) || !ids.has(target)) return [];
    const handle = pick(e, ["sourceHandle", "handle", "branch"]);
    return [{ id: pick(e, ["id"]) ?? `${source}-${target}-${i}`, source, target, sourceHandle: handle ?? null, targetHandle: null }];
  });
  if (edges.length > 0 || nodes.length < 2 || nodes.some((n) => n.type === "branch")) return edges;
  const ordered = [...nodes.filter((n) => n.type === "trigger"), ...nodes.filter((n) => n.type !== "trigger")];
  return ordered.slice(1).map((n, i) => ({ id: `${ordered[i].id}-${n.id}`, source: ordered[i].id, target: n.id, sourceHandle: null, targetHandle: null }));
}

/**
 * Create flows from a scaffold-style flow list. Enforces unique slugs
 * per-project (if a collision is found, appends a numeric suffix).
 * Returns a map of the slug the AI asked for → the real flow id,
 * so callers can rewrite HTML `data-nk-flow-ref="<slug>"` attributes.
 */
export async function persistFlows(
  projectId: string,
  datasourceId: string,
  flows: ScaffoldFlow[],
  replaceExisting = false
): Promise<Map<string, string>> {
  const slugToId = new Map<string, string>();
  const existingSlugs = new Set(
    (
      await db.flow.findMany({
        where: { projectId },
        select: { slug: true },
      })
    ).map((f) => f.slug)
  );

  let idx = 0;
  for (const f of flows) {
    const requested =
      sanitizeSlug(f.slug) || slugify(f.name) || `flow-${idx + 1}`;
    const existing = replaceExisting ? await db.flow.findFirst({ where: { projectId, slug: requested } }) : null;
    let flowSlug = requested;
    let bump = 2;
    while ((!existing && existingSlugs.has(flowSlug)) || slugToId.has(flowSlug)) {
      flowSlug = `${requested}-${bump++}`;
    }
    existingSlugs.add(flowSlug);

    const nodes = f.nodes.map((n, nIdx) => {
      let parsed: Record<string, unknown> = {};
      try {
        parsed =
          typeof n.data === "string"
            ? JSON.parse(n.data)
            : (n.data as Record<string, unknown>);
      } catch {
        parsed = {};
      }
      return {
        id: n.id,
        type: n.type,
        position: autoPosition(nIdx, f.nodes.length),
        data: injectDatasourceId(parsed, datasourceId),
      };
    });
    const edges = normalizeEdges(nodes, f.edges as unknown as Array<Record<string, unknown>>);

    const created = existing ? await db.flow.update({ where: { id: existing.id }, data: { name: f.name, graph: { nodes, edges } as unknown as object } }) : await db.flow.create({
      data: {
        projectId,
        name: f.name,
        slug: flowSlug,
        trigger: "HTTP",
        httpPath: `/${flowSlug}`,
        httpMethod: "POST",
        graph: { nodes, edges } as unknown as object,
      },
    });
    // Map both the AI's original slug AND the final slug, so rewrites work
    // whether the HTML referenced the requested or the de-duplicated name.
    slugToId.set(requested, created.id);
    slugToId.set(flowSlug, created.id);
    idx++;
  }
  return slugToId;
}

export {
  buildFlowRefMap,
  flowRefMap,
  resolveFlowRefs,
  resolveFlowRefsWith,
  unconnectedNote,
  type FlowRefMap,
} from "./flow-refs";

/** Kept for callers that only need the rewritten HTML. */
export function rewriteFlowRefsInHtml(
  html: string,
  flowSlugToId: Map<string, string>
): string {
  return resolveFlowRefsWith(html, flowSlugToId).html;
}

export async function applyScaffold(
  ownerId: string,
  scaffold: ScaffoldResult,
  /** locale: the language the app was built in; saved as the app's language before any module installs. */
  /** themeTokens: colours and fonts from the person's reference images (lib/ai/vision.ts paletteTheme), laid over the preset. */
  opts: { locale?: Locale; themeTokens?: Partial<ProjectTheme> } = {},
): Promise<{ projectId: string; homePageId: string }> {
  // 1. Create project
  const baseSlug = slugify(scaffold.project.name) || "project";
  const newSlug = projectSlug(baseSlug);

  // Resolve the AI's theme pick to a real preset, fall back to first preset.
  const themePreset =
    THEME_PRESETS.find(
      (t) => t.name.toLowerCase() === (scaffold.theme ?? "").toLowerCase()
    ) ?? THEME_PRESETS[0];

  const project = await db.project.create({
    data: {
      ownerId,
      name: scaffold.project.name,
      description: scaffold.project.description,
      slug: newSlug,
      theme: (opts.themeTokens ? { ...themePreset, ...opts.themeTokens } : themePreset) as unknown as object,
    },
  });

  // The app's language first: the sign-in pages and their emails below are
  // installed in it (lib/modules/install.ts).
  if (opts.locale) {
    await setAppLocale(project.id, opts.locale).catch((err) => console.error("Saving the app's language failed:", err));
  }

  // 2. Pre-install the auth module — every app gets login, register,
  //    profile, forgot-password pages + users table + auth flows for free.
  //    This is done BEFORE the AI's content so the AI can focus entirely
  //    on building the app's unique pages and features.
  try {
    const authModule = getModule("auth");
    if (authModule) {
      await installModule({
        projectId: project.id,
        module: authModule,
        allowUnmetRequirements: true,
      });
    }
  } catch (err) {
    console.error("Auto-install auth failed:", err);
  }

  // 3. Datasource + tables (the AI's app-specific tables)
  const datasource = await ensureInternalDatasource(project.id);
  await persistTables(project.id, datasource.id, scaffold.datasource.tables);

  // 3. Create flows FIRST so we know their real IDs before writing page HTML
  const flowSlugToId = await persistFlows(
    project.id,
    datasource.id,
    scaffold.flows
  );

  // Resolve against every flow in the project, including the ones the auth
  // module pre-installed (login, register, logout, me, update-profile) and
  // their "auth-" spellings; the flows this build made win on collisions.
  const refMap = await flowRefMap(project.id, flowSlugToId);

  // Safety net: detect which scaffold flows read the current user's session
  //    (via a get_session node). Any page that references one of these flows
  //    is user-specific and MUST be auth-protected — otherwise an unauthed
  //    visitor hits a broken page and gets stuck. We auto-inject the
  //    <!--nk:require-auth--> marker when the AI forgot to add it.
  const authRequiredFlowSlugs = new Set<string>();
  for (const f of scaffold.flows) {
    const usesSession = f.nodes.some((n) => n.type === "get_session");
    if (!usesSession) continue;
    // Track both the AI's requested slug and the slugified name — the page
    // HTML may reference either form, and `flowSlugToId` holds both.
    const requested = sanitizeSlug(f.slug) || slugify(f.name);
    if (requested) authRequiredFlowSlugs.add(requested);
  }
  function pageReferencesAuthFlow(html: string): boolean {
    if (authRequiredFlowSlugs.size === 0) return false;
    for (const slug of authRequiredFlowSlugs) {
      // Match any of the slug-based binding attributes. Use a boundary-ish
      // check so "list-tasks" doesn't accidentally match "list-tasks-admin".
      const esc = slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(
        `data-nk-(?:flow|bind-flow|update-flow|reorder-flow|logout|calendar-flow)-ref=["']${esc}["']`,
      );
      if (re.test(html)) return true;
    }
    return false;
  }

  // 4. Create pages — rewrite `data-nk-flow-ref="<slug>"` and
  //    `data-nk-bind-flow-ref="<slug>"` to real flow ids.
  //    Load existing slugs (from auth module etc.) to avoid collisions.
  let homePageId: string | null = null;
  const existingPages = await db.page.findMany({
    where: { projectId: project.id },
    select: { slug: true, id: true, isHome: true },
  });
  const pageSlugs = new Set<string>(existingPages.map((p) => p.slug));
  // If auth already created a home page, note it
  for (const ep of existingPages) {
    if (ep.isHome && !homePageId) homePageId = ep.id;
  }
  let pageIdx = 0;
  for (const p of scaffold.pages) {
    let pageSlug = sanitizeSlug(p.slug) || slugify(p.title) || `page-${pageIdx + 1}`;
    // A language code (/es) is reserved for the app's other languages.
    if (isLanguageSlug(pageSlug)) pageSlug = `${pageSlug}-page`;
    // Skip auth pages the AI might have generated despite being told not to
    const authSlugs = new Set(["login", "register", "profile", "forgot-password"]);
    if (authSlugs.has(pageSlug) && pageSlugs.has(pageSlug)) {
      pageIdx++;
      continue;
    }
    while (pageSlugs.has(pageSlug)) {
      pageIdx++;
      pageSlug = `${pageSlug}-${pageIdx}`;
    }
    pageSlugs.add(pageSlug);

    const resolved = resolveFlowRefsWith(p.html, refMap);
    if (resolved.leftover.length > 0) {
      console.warn(`[scaffold] page "${pageSlug}" has unconnected parts: ${resolved.leftover.slice(0, 5).join(", ")}`);
    }
    let rewrittenHtml = resolved.html;

    // Belt-and-braces: if this page uses a session-reading flow but the AI
    // forgot the auth marker, inject it so users don't land on a broken
    // empty view. The home page is exempt — marketing home pages commonly
    // show a "recent items" teaser without needing auth.
    const hasMarker = rewrittenHtml.includes("<!--nk:require-auth-->");
    if (!hasMarker && !p.isHome && pageReferencesAuthFlow(p.html)) {
      rewrittenHtml = `<!--nk:require-auth-->\n${rewrittenHtml}`;
    }

    const page = await db.page.create({
      data: {
        projectId: project.id,
        title: p.title,
        slug: pageSlug,
        isHome: p.isHome,
        html: rewrittenHtml,
        css: p.css ?? "",
      },
    });
    if (p.isHome && !homePageId) homePageId = page.id;
    pageIdx++;
  }

  // Fallback: if nothing was marked as home, promote the first page
  if (!homePageId) {
    const first = await db.page.findFirst({
      where: { projectId: project.id },
      orderBy: { createdAt: "asc" },
    });
    if (first) {
      await db.page.update({ where: { id: first.id }, data: { isHome: true } });
      homePageId = first.id;
    }
  }

  if (!homePageId) throw new Error("Scaffold produced no pages");

  // Stamp the shared responsive menu into every page (replacing whatever
  // per-page nav the AI generated) BEFORE the publish snapshot below, so
  // the first live version already has the uniform menu.
  try {
    await syncProjectNav(project.id);
  } catch (err) {
    console.error("Nav sync after scaffold failed:", err);
  }

  // Not published automatically: the owner checks the app first and
  // publishes when ready (the launch checklist walks them through it).

  return { projectId: project.id, homePageId };
}

function sanitizeIdent(s: string): string {
  return (s ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/__+/g, "_")
    .slice(0, 50);
}

function sanitizeSlug(s: string): string {
  return (s ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/--+/g, "-")
    .slice(0, 60);
}

function autoPosition(i: number, _total: number) {
  // Lay nodes out left-to-right for a nice default canvas
  return { x: 80 + i * 240, y: 140 + (i % 2 === 0 ? 0 : 60) };
}

const RESERVED_IN_VALUES = new Set(["id", "created_at", "updated_at"]);
const RESERVED_IN_WHERE = new Set(["created_at", "updated_at"]);

function injectDatasourceId(
  data: Record<string, unknown>,
  datasourceId: string
): Record<string, unknown> {
  const out = { ...data };
  // Strip reserved columns — the AI sometimes references created_at even
  // though we auto-manage it. Silently drop those references so inserts work.
  if (out.values && typeof out.values === "object") {
    out.values = Object.fromEntries(
      Object.entries(out.values as Record<string, unknown>).filter(
        ([k]) => !RESERVED_IN_VALUES.has(k.toLowerCase())
      )
    );
  }
  if (out.where && typeof out.where === "object") {
    out.where = Object.fromEntries(
      Object.entries(out.where as Record<string, unknown>).filter(
        ([k]) => !RESERVED_IN_WHERE.has(k.toLowerCase())
      )
    );
  }
  // Only data-access nodes need a datasource id; leave others alone
  if (
    out.table != null ||
    out.values != null ||
    out.where != null ||
    typeof out.output === "string"
  ) {
    out.datasourceId = datasourceId;
  }
  return out;
}

/** Example rows from the plan; only known columns, values as parameters. */
async function insertSeedRows(
  projectId: string,
  table: string,
  fields: Array<{ name: string; type: FieldType }>,
  rows: Array<Record<string, unknown>>,
): Promise<void> {
  const { Pool } = await import("pg");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  const schema = `proj_${projectId.replace(/[^a-zA-Z0-9_]/g, "")}`;
  const types = new Map(fields.map((f) => [f.name, f.type]));
  try {
    for (const row of rows.slice(0, 8)) {
      const keys = Object.keys(row).filter((k) => types.has(k));
      if (!keys.length) continue;
      const values = keys.map((k) => {
        const v = row[k];
        const t = types.get(k);
        if (v === null || v === undefined) return null;
        if (t === "int") return Number.isFinite(Number(v)) ? Math.round(Number(v)) : null;
        if (t === "float") return Number.isFinite(Number(v)) ? Number(v) : null;
        if (t === "bool") return v === true || v === "true" || v === 1;
        if (t === "json") return JSON.stringify(v);
        if (t === "timestamp") return Number.isNaN(Date.parse(String(v))) ? null : new Date(String(v));
        return String(v);
      });
      await pool.query(
        `INSERT INTO "${schema}"."${table}" (${keys.map((k) => `"${k}"`).join(", ")}) VALUES (${keys.map((_, i) => `$${i + 1}`).join(", ")})`,
        values,
      );
    }
  } finally {
    await pool.end().catch(() => {});
  }
}
