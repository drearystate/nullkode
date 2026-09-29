import { hideOwnerLinks, isOwnerOnlyPage, withAdminMarkers } from "./owner-only";
import { db } from "../db";
import { ensureInternalTable } from "../datasources/postgres";
import { slugify } from "../utils";
import { syncProjectNav } from "../nav-sync";
import type { ModuleCapability, ModuleDefinition, ModuleFieldType } from "./types";
import { getModule } from "./registry";

const RESERVED_COLUMNS = new Set(["id", "created_at", "updated_at"]);

/**
 * For each capability provided by modules already installed in a project,
 * map it to the real database resources that back it. New installs use this
 * to resolve {{@<capability>.<field>}} references in their flow data and
 * page HTML.
 */
export type CapabilityResolution = {
  /** The module id that provides this capability (first wins on collision) */
  providerModuleId: string;
  /** The SQL-safe table-name prefix the provider used */
  providerPrefix: string;
  /** Real prefixed table name, if the provider declared a table ref */
  table?: string;
  /** Real prefixed flow slug, if the provider declared a flow ref */
  flowSlug?: string;
};

/**
 * Walk the project's installed modules, pull each one's `provides` +
 * `capabilityRefs`, and return a map of capability → real resources.
 */
export async function computeProvidedCapabilities(
  projectId: string
): Promise<Map<ModuleCapability, CapabilityResolution>> {
  const rows = await db.projectModule.findMany({
    where: { projectId },
    orderBy: { installedAt: "asc" },
  });
  const map = new Map<ModuleCapability, CapabilityResolution>();
  for (const row of rows) {
    const def = getModule(row.moduleId);
    if (!def || !def.provides) continue;
    const prefix = def.id.replace(/[^a-zA-Z0-9_]/g, "_");
    for (const cap of def.provides) {
      if (map.has(cap)) continue; // first provider wins
      const refs = def.capabilityRefs?.[cap] ?? {};
      map.set(cap, {
        providerModuleId: def.id,
        providerPrefix: prefix,
        table: refs.table ? `${prefix}_${refs.table}` : undefined,
        flowSlug: refs.flow ? `${def.id}-${refs.flow}` : undefined,
      });
    }
  }
  return map;
}

/**
 * Substitute {{@<capability>.<field>}} references in a string with the
 * corresponding real resource name from the project's installed modules.
 * Unknown references are left as empty strings so a missing provider
 * doesn't crash the flow.
 */
function resolveCapabilityRefs(
  input: string,
  provided: Map<ModuleCapability, CapabilityResolution>
): string {
  return input.replace(/\{\{\s*@([a-zA-Z0-9_-]+)\.([a-zA-Z0-9_]+)\s*\}\}/g, (_m, cap, field) => {
    const res = provided.get(cap as ModuleCapability);
    if (!res) return "";
    if (field === "table") return res.table ?? "";
    if (field === "flowSlug") return res.flowSlug ?? "";
    if (field === "provider") return res.providerModuleId;
    return "";
  });
}

function resolveCapRefsDeep(
  value: unknown,
  provided: Map<ModuleCapability, CapabilityResolution>
): unknown {
  if (typeof value === "string") return resolveCapabilityRefs(value, provided);
  if (Array.isArray(value)) return value.map((v) => resolveCapRefsDeep(v, provided));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = resolveCapRefsDeep(v, provided);
    }
    return out;
  }
  return value;
}

/** Error thrown when a module's requirements aren't met by the project. */
export class UnmetRequirementsError extends Error {
  unmet: ModuleCapability[];
  constructor(unmet: ModuleCapability[]) {
    super(
      `This module needs the following capabilities, which no installed module currently provides: ${unmet.join(
        ", "
      )}. Install a module that provides them first.`
    );
    this.unmet = unmet;
    this.name = "UnmetRequirementsError";
  }
}

/**
 * Install a module into a project. Creates the tables, flows, and pages
 * described by the module definition, rewriting local refs to the real
 * database ids that the new project gets.
 *
 * Returns the ids of everything that was created, so the UI can deep-link
 * straight into the installed module.
 */
export async function installModule(opts: {
  projectId: string;
  module: ModuleDefinition;
  config?: Record<string, string | number | boolean>;
  /** Skip the requirements check (used by install-all script). */
  allowUnmetRequirements?: boolean;
  /** Skip creating module pages — used when a template already provides
   *  the visual pages and only needs the backend (tables + flows). */
  skipPages?: boolean;
  /** Never make a module page the home page (the caller supplies its own). */
  neverHome?: boolean;
  /** Replacement sample rows per module table (by the module's table name). */
  seed?: Record<string, Array<Record<string, unknown>>>;
}): Promise<{
  tableIds: Map<string, string>;
  flowIds: Map<string, string>;
  pageIds: Map<string, string>;
  firstPageId: string | null;
}> {
  const { projectId, module } = opts;
  // Fields the caller left out (or blank) use the module's defaults, so pages
  // never render an empty "{{config.*}}" (e.g. "Book with " or prices with no
  // currency). Fields that name the business itself use the app's own name
  // rather than a generic default like "Your Business" or "Our shop".
  const config: Record<string, string | number | boolean> = {};
  let projectName: string | null = null;
  const BUSINESS_NAME = /^(?:app|business|shop|store|restaurant|cafe|brand|agency|gym|salon|studio|clinic|company|org|organization|site|school|church|practice|firm|club|venue|hotel|spa)Name$|^brand$/i;
  for (const field of module.config ?? []) {
    const given = opts.config?.[field.key];
    if (given !== undefined && given !== "") {
      config[field.key] = given;
      continue;
    }
    if (BUSINESS_NAME.test(field.key)) {
      projectName ??= (await db.project.findUnique({ where: { id: projectId }, select: { name: true } }))?.name ?? "";
      if (projectName) {
        config[field.key] = projectName;
        continue;
      }
    }
    if (field.default !== undefined && field.default !== "") config[field.key] = field.default;
  }
  for (const [k, v] of Object.entries(opts.config ?? {})) if (!(k in config) && v !== "") config[k] = v;

  // 0. Check requirements + compute existing capability resolutions so we
  //    can rewrite cross-module references like {{@auth-users.table}}
  const provided = await computeProvidedCapabilities(projectId);
  if (!opts.allowUnmetRequirements && module.requires && module.requires.length > 0) {
    const unmet = module.requires.filter((cap) => !provided.has(cap));
    if (unmet.length > 0) throw new UnmetRequirementsError(unmet);
  }

  // 1. Ensure the project has an internal datasource
  let datasource = await db.dataSource.findFirst({
    where: { projectId, kind: "POSTGRES_INTERNAL" },
  });
  if (!datasource) {
    datasource = await db.dataSource.create({
      data: {
        projectId,
        name: "Main database",
        kind: "POSTGRES_INTERNAL",
      },
    });
  }

  // 2. Create tables (prefixing with module id to avoid collisions if the
  //    user installs multiple modules or the same one twice). Dashes in
  //    module ids must become underscores so the SQL identifier is legal.
  const moduleSqlPrefix = module.id.replace(/[^a-zA-Z0-9_]/g, "_");
  const tableIds = new Map<string, string>();
  const tableNames = new Map<string, string>(); // local → real
  for (const t of module.tables) {
    const realName = await uniqueTableName(datasource.id, `${moduleSqlPrefix}_${t.name}`);
    const fields = t.fields
      .filter((f) => !RESERVED_COLUMNS.has(f.name.toLowerCase()))
      .map((f) => ({ name: f.name, type: f.type as ModuleFieldType }));
    await ensureInternalTable(projectId, realName, fields);
    const created = await db.dataTable.create({
      data: {
        datasourceId: datasource.id,
        name: realName,
        schema: { fields },
      },
    });
    tableIds.set(t.name, created.id);
    tableNames.set(t.name, realName);

    // Seed rows (interpolate {{config.*}} in every value)
    const seedRows_ = opts.seed?.[t.name] ?? t.seed;
    if (seedRows_ && seedRows_.length > 0) {
      const rendered = seedRows_.map((row) =>
        Object.fromEntries(
          Object.entries(row).map(([k, v]) => [
            k,
            typeof v === "string" ? interpolateConfig(v, config) : v,
          ])
        )
      );
      await seedRows(projectId, realName, rendered);
    }
  }

  // Page slugs are worked out before flows and pages are created, so both
  // can point at a sibling page ({{page.x}}, or a plain "/x" link) by its
  // installed slug. With skipPages the template supplies the pages, so
  // references keep their local slugs.
  const pageSlugMap = new Map<string, string>(); // local → real
  if (!opts.skipPages) {
    const reserved = new Set<string>();
    for (const p of module.pages) {
      const realSlug = await uniquePageSlug(
        projectId,
        module.bareSlugs ? p.slug : `${module.id}-${p.slug}`,
        reserved
      );
      reserved.add(realSlug);
      pageSlugMap.set(p.slug, realSlug);
    }
  }

  // 3. Create flows — rewrite node.data.table to real table names, inject
  //    datasource id, interpolate config
  const flowSlugMap = new Map<string, string>(); // local slug → real slug
  const flowIds = new Map<string, string>();
  for (const f of module.flows) {
    const rawSlug = module.bareSlugs ? f.slug : `${module.id}-${f.slug}`;
    const realSlug = await uniqueFlowSlug(projectId, rawSlug);
    flowSlugMap.set(f.slug, realSlug);

    const nodes = f.nodes.map((n, idx) => ({
      id: n.id,
      type: n.type,
      position: autoPosition(idx),
      // Resolve {{@capability.X}} references BEFORE config interpolation + table rewriting
      data: resolvePageLinksDeep(
        rewriteNodeData(
          resolveCapRefsDeep(n.data, provided) as Record<string, unknown>,
          tableNames,
          datasource!.id,
          config
        ),
        pageSlugMap
      ) as Record<string, unknown>,
    }));

    const created = await db.flow.create({
      data: {
        projectId,
        name: f.name,
        slug: realSlug,
        trigger: "HTTP",
        httpPath: `/${realSlug}`,
        httpMethod: f.httpMethod ?? "POST",
        graph: { nodes, edges: f.edges } as unknown as object,
      },
    });
    flowIds.set(f.slug, created.id);
  }

  // 4. Create pages — rewrite data-nk-flow-ref="<local-slug>" to real flow ids,
  //    interpolate config values with {{config.key}}, and resolve
  //    cross-page references of the form {{page.<local-slug>}} to the real
  //    installed slug. Page slugs are computed in a pre-pass so a page can
  //    link to a sibling page that hasn't been created yet.
  //    When skipPages is set (template already provides the visual pages),
  //    we skip this entire step — only the tables + flows are needed.
  const pageIds = new Map<string, string>();
  let firstPageId: string | null = null;

  if (!opts.skipPages) {
    const ownerSlugs = module.pages.filter((p) => isOwnerOnlyPage(module.id, p)).map((p) => pageSlugMap.get(p.slug)!);
    for (const p of module.pages) {
      const realSlug = pageSlugMap.get(p.slug)!;
      // Resolve capability refs first so downstream template/flow-ref
      // rewriting sees the real table/flow names
      const htmlWithCaps = resolveCapabilityRefs(p.html, provided);
      const htmlWithPages = resolveLocalPageLinks(interpolatePageRefs(htmlWithCaps, pageSlugMap), pageSlugMap);
      const rewritten = rewritePageHtml(htmlWithPages, flowSlugMap, flowIds, config);
      const html = isOwnerOnlyPage(module.id, p) ? withAdminMarkers(rewritten) : hideOwnerLinks(rewritten, ownerSlugs);
      const css = interpolateConfig(
        interpolatePageRefs(resolveCapabilityRefs(p.css ?? "", provided), pageSlugMap),
        config
      );

      // Pick home: only mark as home if the project currently has NO home page
      let isHome = !!p.isHome && !opts.neverHome;
      if (isHome) {
        const hasHome = await db.page.findFirst({
          where: { projectId, isHome: true },
        });
        if (hasHome) isHome = false;
      }

      const created = await db.page.create({
        data: {
          projectId,
          title: p.title,
          slug: realSlug,
          isHome,
          html,
          css,
        },
      });
      pageIds.set(p.slug, created.id);
      if (!firstPageId) firstPageId = created.id;
    }
  }

  // 5. Record the installation so future installs can discover which
  //    capabilities are already provided.
  await db.projectModule.create({
    data: {
      projectId,
      moduleId: module.id,
      version: module.version,
      config: config as unknown as object,
    },
  });

  // 6. The module added pages — refresh the shared menu on every page so
  //    the new pages are reachable everywhere. Never fail the install over
  //    a nav stamp.
  if (!opts.skipPages && module.pages.length > 0) {
    try {
      await syncProjectNav(projectId);
    } catch (err) {
      console.error("Nav sync after module install failed:", err);
    }
  }

  return { tableIds, flowIds, pageIds, firstPageId };
}

async function uniqueTableName(datasourceId: string, base: string): Promise<string> {
  let candidate = base;
  let n = 1;
  while (
    await db.dataTable.findFirst({ where: { datasourceId, name: candidate } })
  ) {
    n += 1;
    candidate = `${base}_${n}`;
  }
  return candidate;
}

async function uniqueFlowSlug(projectId: string, base: string): Promise<string> {
  let candidate = base;
  let n = 1;
  while (
    await db.flow.findFirst({ where: { projectId, slug: candidate } })
  ) {
    n += 1;
    candidate = `${base}-${n}`;
  }
  return candidate;
}

async function uniquePageSlug(
  projectId: string,
  base: string,
  reserved?: Set<string>
): Promise<string> {
  const slug = slugify(base) || "page";
  let candidate = slug;
  let n = 1;
  while (
    (reserved && reserved.has(candidate)) ||
    (await db.page.findFirst({ where: { projectId, slug: candidate } }))
  ) {
    n += 1;
    candidate = `${slug}-${n}`;
  }
  return candidate;
}

function interpolatePageRefs(
  s: string,
  pageSlugMap: Map<string, string>
): string {
  return s.replace(/\{\{\s*page\.([a-zA-Z0-9_-]+)\s*\}\}/g, (_m, local: string) => {
    return pageSlugMap.get(local) ?? local;
  });
}

/**
 * Module pages often link to a sibling by its local slug ("/admin"), but the
 * page installs as "<module>-admin". Point those links (and flow redirects)
 * at the installed slug; links to anything else are left alone.
 */
function resolveLocalPageLinks(s: string, pageSlugMap: Map<string, string>): string {
  if (pageSlugMap.size === 0) return s;
  const swap = (whole: string, lead: string, slug: string) => {
    const real = pageSlugMap.get(slug);
    return real && real !== slug ? `${lead}${real}` : whole;
  };
  return s
    .replace(/(\b(?:href|action|data-nk-redirect|data-nk-attr-href)=["']\.?\/)([a-z0-9][a-z0-9-]*)(?=["'?#/])/g, swap)
    .replace(/("redirect"\s*:\s*"\.?\/)([a-z0-9][a-z0-9-]*)(?=["?#/])/g, swap);
}

function resolvePageLinksDeep(value: unknown, pageSlugMap: Map<string, string>): unknown {
  if (typeof value === "string") return resolveLocalPageLinks(interpolatePageRefs(value, pageSlugMap), pageSlugMap);
  if (Array.isArray(value)) return value.map((v) => resolvePageLinksDeep(v, pageSlugMap));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, resolvePageLinksDeep(v, pageSlugMap)]));
  }
  return value;
}

function autoPosition(i: number) {
  return { x: 80 + i * 240, y: 140 + (i % 2 === 0 ? 0 : 60) };
}

function rewriteNodeData(
  data: Record<string, unknown>,
  tableNames: Map<string, string>,
  datasourceId: string,
  config: Record<string, unknown>
): Record<string, unknown> {
  // Deep clone + interpolate {{config.key}}, rewrite table refs
  const cloned = JSON.parse(JSON.stringify(data)) as Record<string, unknown>;
  const out = interpolateDeep(cloned, config) as Record<string, unknown>;
  if (typeof out.table === "string" && tableNames.has(out.table)) {
    out.table = tableNames.get(out.table)!;
  }
  // Strip reserved columns from values/where
  if (out.values && typeof out.values === "object") {
    out.values = Object.fromEntries(
      Object.entries(out.values as Record<string, unknown>).filter(
        ([k]) => !RESERVED_COLUMNS.has(k.toLowerCase())
      )
    );
  }
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

function rewritePageHtml(
  html: string,
  flowSlugMap: Map<string, string>,
  flowIds: Map<string, string>,
  config: Record<string, unknown>
): string {
  let out = interpolateConfig(html, config);
  for (const [localSlug, _realSlug] of flowSlugMap) {
    const realId = flowIds.get(localSlug);
    if (!realId) continue;
    const flowRef = new RegExp(
      `data-nk-flow-ref=["']${escapeRegex(localSlug)}["']`,
      "g"
    );
    out = out.replace(flowRef, `data-nk-flow="${realId}"`);
    const bindRef = new RegExp(
      `data-nk-bind-flow-ref=["']${escapeRegex(localSlug)}["']`,
      "g"
    );
    out = out.replace(bindRef, `data-nk-bind-flow="${realId}"`);
  }
  return out;
}

function interpolateConfig(s: string, config: Record<string, unknown>): string {
  return s.replace(/\{\{config\.([a-zA-Z0-9_]+)\}\}/g, (_, key: string) => {
    const v = config[key];
    return v == null ? "" : String(v);
  });
}

function interpolateDeep(value: unknown, config: Record<string, unknown>): unknown {
  if (typeof value === "string") return interpolateConfig(value, config);
  if (Array.isArray(value)) return value.map((v) => interpolateDeep(v, config));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = interpolateDeep(v, config);
    }
    return out;
  }
  return value;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function seedRows(
  projectId: string,
  tableName: string,
  rows: Array<Record<string, unknown>>
): Promise<void> {
  if (rows.length === 0) return;
  const { Pool } = await import("pg");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
  try {
    const schema = `proj_${projectId.replace(/[^a-zA-Z0-9_]/g, "")}`;
    for (const row of rows) {
      const keys = Object.keys(row).filter((k) => !RESERVED_COLUMNS.has(k.toLowerCase()));
      if (keys.length === 0) continue;
      const cols = keys.map((k) => `"${k}"`).join(", ");
      const placeholders = keys.map((_, i) => `$${i + 1}`).join(", ");
      const values = keys.map((k) => row[k]);
      await pool.query(
        `INSERT INTO "${schema}"."${tableName}" (${cols}) VALUES (${placeholders})`,
        values
      );
    }
  } finally {
    await pool.end();
  }
}
