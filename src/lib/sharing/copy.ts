import { Prisma, type User } from "@prisma/client";
import { Pool, type PoolClient } from "pg";
import { db } from "../db";
import { projectSlug } from "../utils";
import { ensureInternalTable, projectSchemaName, type FieldType } from "../datasources/postgres";
import { eraseProject } from "../erase";
import { syncProjectNav } from "../nav-sync";
import { newRedactionReport, redactFlowGraph, redactModuleConfig } from "../export-secrets";
import { SENSITIVE_COLUMN } from "../sensitive";
import { flowAccess } from "../flow/access";
import { checkProjectLimit } from "../guard";
import { limitsForUser } from "../plan-limits";
import { asFiles } from "../game-studio/store";
import { asFeatures } from "../game-studio/features";
import type { ShareKind } from "./access";

/**
 * "Share a copy": the recipient's own, independent copy of an app, a design
 * or a game (docs/sharing.md). Nothing links the copy to the original
 * afterwards, so changes never flow either way.
 *
 * An app copy has its pages (and their translations), flows, the structure of
 * its tables, its theme and icon, its installed features' settings and the
 * phone-app look (name, colours, permission wording). It starts unpublished,
 * on a fresh address, owned by the recipient, through the same steps as any
 * new app (plan limits, the shared menu).
 *
 * Never copied: AI keys, payment and other private keys (blanked wherever they
 * appear, as in the backup download), outside-database connections, Android
 * signing keys and store accounts, custom domains and the app's own address,
 * push subscribers and credentials, published versions, visitor runs and
 * analytics, owner alerts, SEO verification codes, privacy requests and the
 * phone app's store identity.
 *
 * Sample rows (only when the sharer ticked "include sample data") come from
 * tables the app shows on its public pages and nothing else; never from
 * tables visitors can add to (form submissions, sign-ups, comments, orders,
 * webhook deliveries: only the owner's own screens may write to a sampled
 * table), from sign-in/account tables or from tables with password, hash,
 * secret or token columns; never rows a signed-in visitor made; email, phone
 * and IP columns and links to the app's accounts are emptied.
 */

export class CopyError extends Error {
  constructor(
    readonly code: "limit" | "pages" | "not_found" | "failed",
    message: string,
    readonly response?: Response,
  ) {
    super(message);
  }
}

const IDENT = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
const q = (name: string) => {
  if (!IDENT.test(name)) throw new CopyError("failed", `invalid name ${name}`);
  return `"${name}"`;
};
const SAMPLE_ROWS = 500;
/** Tables never sampled whatever pages show them. */
const PRIVATE_TABLE = /(^|_)(auth_users|users?|sessions?|tokens?|otps?|passwords?|resets?|verifications?|push_subscriptions?|subscribers?|devices?|logins?|audit)(_|$)/i;
/** Columns emptied in sampled rows. */
const CONTACT_COLUMN = /e-?mail|phone|mobile|whatsapp|(^|_)(tel|telephone|cell|ip|ip_address|user_agent|address|street|postcode|zip|dob|birthday|birth_?date)(_|$)/i;
/** Columns pointing at the app's sign-in accounts (which never come along). */
const USER_REF = /^(user_id|owner_user_id|from_user_id|to_user_id|saver_user_id|author_id|member_id|account_id)$/i;
/** Steps that make a flow's answer depend on who is signed in: its data is per person, not public. */
const PERSONAL_STEPS = new Set(["get_session", "set_session", "check_role", "verify_password", "hash_password", "clear_session"]);
const READ_STEPS = new Set(["query", "lookup", "aggregate"]);
const WRITE_STEPS = new Set(["insert", "bulk_insert", "update", "bulk_update", "sheets_append"]);

/** Phone-app settings that are the app's look and wording; everything else (bundle id, team id, store data) stays behind. */
const NATIVE_KEEP = ["appName", "orientation", "backgroundColor", "themeColor", "androidEnabled", "iosEnabled", "permissionText"] as const;

type GraphNode = { id?: string; type?: string; data?: Record<string, unknown> };

function nodesOf(graph: unknown): GraphNode[] {
  const nodes = (graph as { nodes?: unknown } | null)?.nodes;
  return Array.isArray(nodes) ? (nodes as GraphNode[]) : [];
}

/**
 * The tables a copy may take sample rows from: ones the app's public pages
 * show (read by flows any visitor can run that don't depend on who is signed
 * in), minus every table a flow that visitors or outside services can run
 * writes to (only flows limited to the app's staff roles don't count).
 */
export async function publicTables(projectId: string): Promise<Set<string>> {
  const shown = new Set<string>();
  const written = new Set<string>();
  const flows = await db.flow.findMany({ where: { projectId }, select: { id: true, slug: true, projectId: true, graph: true, enabled: true } });
  for (const f of flows) {
    const nodes = nodesOf(f.graph);
    const writes = nodes.filter((n) => WRITE_STEPS.has(String(n.type)) && typeof n.data?.table === "string").map((n) => String(n.data!.table));
    const reads = nodes.filter((n) => READ_STEPS.has(String(n.type)) && typeof n.data?.table === "string").map((n) => String(n.data!.table));
    if (!writes.length && !reads.length) continue;
    const access = await flowAccess(f, false).catch(() => null);
    // Writable by visitors, signed-in members or outside services (anything but the app's staff roles).
    const staffOnly = Boolean(access?.signIn && access.roles && access.roles.length > 0);
    if (!staffOnly) for (const t of writes) written.add(t);
    if (!f.enabled || !access || access.signIn || access.unused) continue;
    if (nodes.some((n) => PERSONAL_STEPS.has(String(n.type)))) continue;
    for (const t of reads) shown.add(t);
  }
  return new Set([...shown].filter((t) => !written.has(t)));
}

type Column = { name: string; type: string };

function fieldType(dataType: string): FieldType {
  if (/^(integer|bigint|smallint)$/.test(dataType)) return "int";
  if (/^(double precision|real|numeric)$/.test(dataType)) return "float";
  if (dataType === "boolean") return "bool";
  if (dataType.startsWith("timestamp") || dataType === "date") return "timestamp";
  if (dataType === "jsonb" || dataType === "json") return "json";
  return "text";
}

async function columnsOf(client: PoolClient, schema: string): Promise<Map<string, Column[]>> {
  const r = await client.query<{ table_name: string; column_name: string; data_type: string }>(
    `SELECT c.table_name, c.column_name, c.data_type FROM information_schema.columns c
       JOIN information_schema.tables t ON t.table_schema = c.table_schema AND t.table_name = c.table_name
      WHERE c.table_schema = $1 AND t.table_type = 'BASE TABLE' ORDER BY c.table_name, c.ordinal_position`,
    [schema],
  );
  const out = new Map<string, Column[]>();
  for (const row of r.rows) {
    if (!IDENT.test(row.table_name) || !IDENT.test(row.column_name)) continue;
    const list = out.get(row.table_name) ?? [];
    list.push({ name: row.column_name, type: row.data_type });
    out.set(row.table_name, list);
  }
  return out;
}

/** Whether a table's rows may go into a copy at all (see the rules at the top). */
export function sampleableTable(name: string, cols: Column[], shownPublicly: Set<string>): boolean {
  if (!shownPublicly.has(name)) return false;
  if (PRIVATE_TABLE.test(name)) return false;
  if (cols.some((c) => SENSITIVE_COLUMN.test(c.name))) return false;
  return true;
}

/** A sampled row as it goes into the copy, or null when it isn't the owner's own (a visitor made it). */
export function sampleRow(row: Record<string, unknown>, recipientId: string): Record<string, unknown> | null {
  const by = row.created_by;
  if (by !== null && by !== undefined && by !== "" && !(typeof by === "string" && by.startsWith("owner:"))) return null;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if (k === "created_by") out[k] = by ? `owner:${recipientId}` : null;
    else if (SENSITIVE_COLUMN.test(k) || CONTACT_COLUMN.test(k) || USER_REF.test(k)) out[k] = null;
    else out[k] = v;
  }
  return out;
}

async function insertRows(client: PoolClient, schema: string, table: string, rows: Array<Record<string, unknown>>, existing: Set<string>): Promise<number> {
  let n = 0;
  for (const row of rows) {
    const cols = Object.keys(row).filter((c) => IDENT.test(c) && existing.has(c));
    if (!cols.length) continue;
    const values = cols.map((c) => {
      const v = row[c];
      return v !== null && typeof v === "object" && !(v instanceof Date) ? JSON.stringify(v) : v;
    });
    await client.query(`INSERT INTO ${q(schema)}.${q(table)} (${cols.map(q).join(", ")}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(", ")})`, values);
    n++;
  }
  if (existing.has("id")) {
    await client.query(`SELECT setval(pg_get_serial_sequence($1, 'id'), GREATEST((SELECT COALESCE(MAX(id), 0) FROM ${q(schema)}.${q(table)}), 1))`, [`${schema}.${table}`]);
  }
  return n;
}

/** Replaces every old id in a text (flows, data sources, the app itself) with its copy's. */
function remapper(ids: Map<string, string>): (text: string) => string {
  const pairs = [...ids].filter(([from, to]) => from && to && from !== to).sort((a, b) => b[0].length - a[0].length);
  return (text: string) => {
    let out = text;
    for (const [from, to] of pairs) if (out.includes(from)) out = out.split(from).join(to);
    return out;
  };
}

export type AppCopyResult = { projectId: string; homePageId: string | null; rows: number; tablesWithRows: string[] };

/**
 * Copies an app into `recipient`'s account. Refused (CopyError "limit" with the
 * plan's own words in `response`) when the recipient has no room for another
 * app or the copy has more pages than their plan allows.
 */
export async function copyApp(sourceId: string, recipient: User, opts: { includeData: boolean; name?: string | null }): Promise<AppCopyResult> {
  const src = await db.project.findUnique({
    where: { id: sourceId },
    include: {
      pages: { orderBy: [{ isHome: "desc" }, { createdAt: "asc" }], include: { translations: true } },
      flows: { orderBy: { createdAt: "asc" } },
      datasources: { include: { tables: true }, orderBy: { createdAt: "asc" } },
      modules: { orderBy: { installedAt: "asc" } },
    },
  });
  if (!src) throw new CopyError("not_found", "not found");

  const limits = await limitsForUser(recipient);
  if (limits.maxPagesPerProject !== Infinity && src.pages.length > limits.maxPagesPerProject) throw new CopyError("pages", "too many pages");

  const name = (opts.name?.trim() || src.name).slice(0, 80);
  const savedNative = src.native && typeof src.native === "object" && !Array.isArray(src.native) ? (src.native as Record<string, unknown>) : null;
  const native = savedNative ? Object.fromEntries(NATIVE_KEEP.filter((k) => savedNative[k] !== undefined).map((k) => [k, savedNative[k]])) : null;

  // The limit check and the new app happen under the same lock as transfers
  // into this account, so two copies at once can't both take the last slot.
  const created = await db.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`nk-transfer:${recipient.id}`}))`;
      const refused = await checkProjectLimit(recipient);
      if (refused) return { refused };
      const project = await tx.project.create({
        data: {
          ownerId: recipient.id,
          name,
          slug: projectSlug(name),
          description: src.description,
          kind: "EDITOR",
          theme: (src.theme ?? undefined) as Prisma.InputJsonValue | undefined,
          icon: typeof src.icon === "string" && src.icon.startsWith("/") && !src.icon.startsWith("//") ? src.icon : null,
          ...(native && Object.keys(native).length ? { native: native as Prisma.InputJsonValue } : {}),
        },
      });
      return { project };
    },
    { timeout: 20_000 },
  );
  if ("refused" in created) throw new CopyError("limit", "limit", created.refused ?? undefined);
  const project = created.project;

  try {
    // ── Data sources and tables ───────────────────────────────
    const ids = new Map<string, string>([[src.id, project.id]]);
    const schemaFrom = projectSchemaName(src.id);
    const schemaTo = projectSchemaName(project.id);
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
    let rows = 0;
    const tablesWithRows: string[] = [];
    try {
      const client = await pool.connect();
      try {
        const physical = await columnsOf(client, schemaFrom);
        const shown = opts.includeData ? await publicTables(src.id) : new Set<string>();
        for (const ds of src.datasources) {
          const internal = ds.kind === "POSTGRES_INTERNAL";
          // Outside databases keep their name and tables (so the flows still
          // point somewhere), never their connection details.
          const copy = await db.dataSource.create({ data: { projectId: project.id, name: ds.name, kind: ds.kind, config: {} } });
          ids.set(ds.id, copy.id);
          for (const t of ds.tables) {
            await db.dataTable.create({ data: { datasourceId: copy.id, name: t.name, schema: (t.schema ?? { fields: [] }) as Prisma.InputJsonValue } });
            if (!internal || !IDENT.test(t.name)) continue;
            const declared = ((t.schema as { fields?: Array<{ name?: unknown; type?: unknown }> } | null)?.fields ?? [])
              .filter((f): f is { name: string; type: FieldType } => typeof f.name === "string" && IDENT.test(f.name))
              .map((f) => ({ name: f.name, type: (["text", "int", "float", "bool", "timestamp", "json"].includes(String(f.type)) ? f.type : "text") as FieldType }));
            const cols = physical.get(t.name) ?? [];
            // Columns the table really has but the metadata missed.
            const extra = cols.filter((c) => !["id", "created_at", "updated_at", "created_by"].includes(c.name) && !declared.some((f) => f.name === c.name)).map((c) => ({ name: c.name, type: fieldType(c.type) }));
            await ensureInternalTable(project.id, t.name, [...declared, ...extra]);
            if (!opts.includeData || !cols.length || !sampleableTable(t.name, cols, shown)) continue;
            const r = await client.query(`SELECT * FROM ${q(schemaFrom)}.${q(t.name)} ORDER BY id ASC LIMIT ${SAMPLE_ROWS}`).catch(() => null);
            const kept = (r?.rows ?? []).map((row: Record<string, unknown>) => sampleRow(row, recipient.id)).filter((x): x is Record<string, unknown> => Boolean(x));
            if (!kept.length) continue;
            const target = await client.query<{ column_name: string }>("SELECT column_name FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2", [schemaTo, t.name]);
            await client.query("BEGIN");
            try {
              const n = await insertRows(client, schemaTo, t.name, kept, new Set(target.rows.map((x) => x.column_name)));
              await client.query("COMMIT");
              rows += n;
              if (n) tablesWithRows.push(t.name);
            } catch (err) {
              await client.query("ROLLBACK").catch(() => {});
              throw err;
            }
          }
        }
      } finally {
        client.release();
      }
    } finally {
      await pool.end().catch(() => {});
    }

    // ── Features' settings, private keys blanked ──────────────
    const report = newRedactionReport();
    const secrets = new Set<string>();
    const modules = src.modules.map((m) => ({ m, config: redactModuleConfig(m.config, secrets, report) }));

    // ── Flows (new ids; pages and other flows rewired below) ──
    const createdFlows: Array<{ id: string; graph: unknown }> = [];
    for (const f of src.flows) {
      const copy = await db.flow.create({
        data: {
          projectId: project.id,
          name: f.name,
          slug: f.slug,
          trigger: f.trigger,
          httpPath: f.httpPath,
          httpMethod: f.httpMethod,
          schedule: f.schedule,
          enabled: f.enabled,
          graph: {},
        },
      });
      ids.set(f.id, copy.id);
      createdFlows.push({ id: copy.id, graph: redactFlowGraph(f.graph, secrets, report) });
    }
    const remap = remapper(ids);
    for (const f of createdFlows) {
      await db.flow.update({ where: { id: f.id }, data: { graph: JSON.parse(remap(JSON.stringify(f.graph))) as Prisma.InputJsonValue } });
    }

    // ── Pages and their translations ──────────────────────────
    let homePageId: string | null = null;
    for (const p of src.pages) {
      const makeHome: boolean = p.isHome && !homePageId;
      const page: { id: string } = await db.page.create({
        data: {
          projectId: project.id,
          slug: p.slug,
          title: p.title,
          isHome: makeHome,
          html: remap(p.html),
          css: p.css,
          ...(p.components !== null ? { components: JSON.parse(remap(JSON.stringify(p.components))) as Prisma.InputJsonValue } : {}),
          ...(p.styles !== null ? { styles: p.styles as Prisma.InputJsonValue } : {}),
        },
        select: { id: true },
      });
      if (makeHome) homePageId = page.id;
      if (p.translations.length) {
        await db.pageTranslation.createMany({
          data: p.translations.map((tr) => ({ pageId: page.id, locale: tr.locale, title: tr.title, html: remap(tr.html), sourceHash: tr.sourceHash, origin: tr.origin })),
        });
      }
    }
    if (!homePageId) {
      const first = await db.page.findFirst({ where: { projectId: project.id }, orderBy: { createdAt: "asc" } });
      if (first) homePageId = (await db.page.update({ where: { id: first.id }, data: { isHome: true } })).id;
    }

    for (const { m, config } of modules) {
      await db.projectModule.create({ data: { projectId: project.id, moduleId: m.moduleId, version: m.version, config: JSON.parse(remap(JSON.stringify(config))) as Prisma.InputJsonValue } });
    }

    // The app's languages (multilingual apps): plain settings, no secrets.
    const locale = await db.setting.findUnique({ where: { key: `locale:${src.id}` } });
    if (locale) await db.setting.upsert({ where: { key: `locale:${project.id}` }, create: { key: `locale:${project.id}`, value: locale.value as Prisma.InputJsonValue }, update: { value: locale.value as Prisma.InputJsonValue } });

    await syncProjectNav(project.id).catch((err) => console.error("[sharing] nav sync after copy failed", err));
    return { projectId: project.id, homePageId, rows, tablesWithRows };
  } catch (err) {
    // No half-made app (or its tables) left counting against the plan.
    await eraseProject(project.id, project.slug).catch((e) => console.error("[sharing] copy rollback failed", e));
    throw err;
  }
}

/* ── Designs ─────────────────────────────────────────────────── */

/** A design's files in the recipient's Designer, with no app yet (it gets its own on its first build), like Duplicate. */
export async function copyDesign(sourceId: string, recipient: Pick<User, "id">, opts: { name?: string | null } = {}): Promise<{ designId: string }> {
  const d = await db.designerDesign.findFirst({ where: { id: sourceId, deletedAt: null } });
  if (!d) throw new CopyError("not_found", "not found");
  const files = await db.designerFile.findMany({ where: { designId: sourceId } });
  const copy = await db.designerDesign.create({
    data: {
      userId: recipient.id,
      name: (opts.name?.trim() || d.name).slice(0, 120),
      files: { create: files.map((f) => ({ path: f.path, kind: f.kind, content: f.content, size: f.size })) },
    },
  });
  return { designId: copy.id };
}

/* ── Games ───────────────────────────────────────────────────── */

/**
 * A game's current files and plan (brief, art direction, assets, brand,
 * content and phases, the feature list with every feature "built"), with one
 * starting version carrying the newest screenshot. No chat, notes, jobs or
 * feature history; not published.
 */
export async function copyGame(sourceId: string, recipient: Pick<User, "id">, opts: { name?: string | null; label: string }): Promise<{ gameId: string }> {
  const g = await db.gameProject.findFirst({ where: { id: sourceId, deletedAt: null } });
  if (!g) throw new CopyError("not_found", "not found");
  const files = asFiles(g.files);
  const plan = g.plan && typeof g.plan === "object" && !Array.isArray(g.plan) ? { ...(g.plan as Record<string, unknown>) } : null;
  const features = asFeatures(plan?.features)?.map(({ last: _last, ...f }) => ({ ...f, status: "built" as const })) ?? null;
  if (plan) {
    delete plan.featureLog;
    if (features) plan.features = features;
  }
  const shot = await db.gameVersion.findFirst({ where: { gameId: g.id, shot: { not: null } }, orderBy: { seq: "desc" }, select: { shot: true } });
  const copy = await db.gameProject.create({
    data: {
      ownerId: recipient.id,
      name: (opts.name?.trim() || g.name).slice(0, 120),
      engine: g.engine,
      kitVersion: g.kitVersion,
      status: Object.keys(files).length ? "ready" : "new",
      genreId: g.genreId,
      files,
      seq: 1,
      ...(plan ? { plan: plan as Prisma.InputJsonValue } : {}),
      versions: {
        create: {
          seq: 1,
          files,
          stepLabel: opts.label.slice(0, 200),
          kind: "copy",
          ...(shot?.shot ? { shot: shot.shot } : {}),
          ...(features ? { features: features as unknown as Prisma.InputJsonValue } : {}),
        },
      },
    },
  });
  return { gameId: copy.id };
}

export type CopyTarget = { kind: ShareKind; id: string };
