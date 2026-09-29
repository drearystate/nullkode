import JSZip from "jszip";
import { Pool } from "pg";
import { mkdir, stat, writeFile } from "fs/promises";
import { dirname, resolve, sep } from "path";
import { db } from "./db";
import { ensureInternalDatasource } from "./ai/apply-scaffold";
import { ensureInternalTable } from "./datasources/postgres";
import { syncProjectNav } from "./nav-sync";
import { projectSlug } from "./utils";
import type { FieldType } from "./datasources/postgres";

/**
 * Imports an app from a backup made by "Export" (format version 2): pages,
 * flows, tables with their rows, theme, installed modules and the images
 * they use. The app arrives as a new, unpublished app owned by `ownerId`,
 * so apps can move between accounts and between NullKode servers.
 *
 * Passwords are never in a backup, so imported app accounts sign in again
 * through "Forgot password"; the owner can always use "Open as owner".
 */
export class ImportError extends Error {}

type ProjectJson = {
  name?: string;
  description?: string | null;
  theme?: unknown;
  icon?: string | null;
  schemaVersion?: number;
  modules?: Array<{ moduleId: string; version?: string; config?: unknown }>;
  pages?: Array<{ slug: string; title: string; isHome: boolean; file: string }>;
  datasources?: Array<{ id: string }>;
};

const MAX_ROWS_PER_TABLE = 50_000;
const IDENT = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
const qident = (name: string) => {
  if (!IDENT.test(name)) throw new ImportError(`This backup has an invalid name: ${name}`);
  return `"${name}"`;
};

export async function importApp(ownerId: string, zipData: Buffer, overrideName?: string): Promise<{ projectId: string; homePageId: string | null }> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(zipData);
  } catch {
    throw new ImportError("That file isn't a backup .zip.");
  }
  const meta = await readJson<ProjectJson>(zip, "project.json");
  if (!meta) throw new ImportError("That .zip isn't an app backup (project.json is missing).");
  if ((meta.schemaVersion ?? 1) < 2 || !Array.isArray(meta.pages)) {
    throw new ImportError("This backup was made by an older version. Export the app again, then import the new file.");
  }

  const name = (overrideName?.trim() || meta.name || "Imported app").slice(0, 80);
  const project = await db.project.create({
    data: {
      ownerId,
      name,
      slug: projectSlug(name),
      description: meta.description ?? null,
      theme: (meta.theme ?? undefined) as object | undefined,
      icon: typeof meta.icon === "string" && meta.icon.startsWith("/uploads/") ? meta.icon : null,
    },
  });

  try {
    // Images and files first, so pages and data can point at them.
    await restoreAssets(zip);

    // Tables and rows.
    const datasource = await ensureInternalDatasource(project.id);
    const schemaName = `proj_${project.id.replace(/[^a-zA-Z0-9_]/g, "")}`;
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
    try {
      for (const file of Object.keys(zip.files).filter((f) => /^tables\/[^/]+\.schema\.json$/.test(f))) {
        const def = await readJson<{ name: string; schema?: { fields?: Array<{ name: string; type: FieldType }> } }>(zip, file);
        if (!def?.name || !IDENT.test(def.name)) continue;
        const fields = (def.schema?.fields ?? []).filter((f) => IDENT.test(f.name));
        await ensureInternalTable(project.id, def.name, fields);
        await db.dataTable.create({ data: { datasourceId: datasource.id, name: def.name, schema: { fields } as object } });
        const rows = await readJson<unknown>(zip, file.replace(/\.schema\.json$/, ".rows.json"));
        if (Array.isArray(rows) && rows.length) await insertRows(pool, schemaName, def.name, rows.slice(0, MAX_ROWS_PER_TABLE) as Array<Record<string, unknown>>);
      }
    } finally {
      await pool.end().catch(() => {});
    }

    // Flows, with new ids; pages and other flows are rewired below.
    const oldDatasourceIds = (meta.datasources ?? []).map((d) => d.id).filter(Boolean);
    const flowIds = new Map<string, string>();
    const flowFiles = Object.keys(zip.files).filter((f) => /^flows\/[^/]+\.json$/.test(f));
    const flowDefs: Array<{ id?: string; slug: string; name: string; trigger?: string; httpPath?: string | null; httpMethod?: string | null; schedule?: string | null; enabled?: boolean; graph: unknown }> = [];
    for (const f of flowFiles) {
      const def = await readJson<(typeof flowDefs)[number]>(zip, f);
      if (def?.slug && def.graph) flowDefs.push(def);
    }
    const created = [];
    for (const def of flowDefs) {
      const flow = await db.flow.create({
        data: {
          projectId: project.id,
          name: def.name || def.slug,
          slug: def.slug,
          trigger: (def.trigger as never) ?? "HTTP",
          httpPath: def.httpPath ?? `/${def.slug}`,
          httpMethod: def.httpMethod ?? "POST",
          schedule: def.schedule ?? null,
          enabled: def.enabled ?? true,
          graph: {} as object,
        },
      });
      if (def.id) flowIds.set(def.id, flow.id);
      created.push({ flow, def });
    }
    const remap = (text: string) => {
      let out = text;
      for (const [from, to] of flowIds) out = out.split(from).join(to);
      for (const from of oldDatasourceIds) out = out.split(from).join(datasource.id);
      return out;
    };
    for (const { flow, def } of created) {
      await db.flow.update({ where: { id: flow.id }, data: { graph: JSON.parse(remap(JSON.stringify(def.graph))) as object } });
    }

    // Pages, in their original order, wired to the new flows.
    let homePageId: string | null = null;
    for (const p of meta.pages) {
      const html = (await zip.file(`pages/${p.file}.html`)?.async("string")) ?? "";
      const css = (await zip.file(`pages/${p.file}.css`)?.async("string")) ?? "";
      const makeHome = Boolean(p.isHome) && !homePageId;
      const page: { id: string } = await db.page.create({
        data: { projectId: project.id, title: p.title || p.slug, slug: p.slug, isHome: makeHome, html: remap(html), css },
        select: { id: true },
      });
      if (makeHome) homePageId = page.id;
    }
    if (!homePageId) {
      const first = await db.page.findFirst({ where: { projectId: project.id }, orderBy: { createdAt: "asc" } });
      if (first) homePageId = (await db.page.update({ where: { id: first.id }, data: { isHome: true } })).id;
    }

    // Installed modules, so the Features screen shows them as installed.
    for (const m of meta.modules ?? []) {
      if (typeof m.moduleId !== "string") continue;
      await db.projectModule.create({ data: { projectId: project.id, moduleId: m.moduleId, version: String(m.version ?? "1.0.0"), config: (m.config ?? {}) as object } });
    }

    await syncProjectNav(project.id).catch(() => 0);
    return { projectId: project.id, homePageId };
  } catch (err) {
    // Don't leave a half-imported app behind.
    await db.project.delete({ where: { id: project.id } }).catch(() => {});
    throw err;
  }
}

async function readJson<T>(zip: JSZip, path: string): Promise<T | null> {
  const file = zip.file(path);
  if (!file) return null;
  try {
    return JSON.parse(await file.async("string")) as T;
  } catch {
    throw new ImportError(`${path} in the backup is damaged.`);
  }
}

/** Writes assets/uploads/… (and templates/…, assets/…) back under public/, never overwriting. */
async function restoreAssets(zip: JSZip): Promise<void> {
  const root = resolve(process.cwd(), "public");
  for (const [path, entry] of Object.entries(zip.files)) {
    const m = /^assets\/((?:uploads|templates|assets)\/.+)$/.exec(path);
    if (!m || entry.dir) continue;
    // Only ordinary files; never pages or scripts.
    if (!/\.(png|jpe?g|gif|webp|avif|ico|bmp|mp3|wav|m4a|ogg|mp4|webm|mov|pdf|txt|csv|json|woff2?|ttf|otf|docx?|xlsx?|pptx?|zip)$/i.test(m[1])) continue;
    const target = resolve(root, m[1]);
    if (!target.startsWith(root + sep)) continue;
    if (await stat(target).then(() => true, () => false)) continue;
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, await entry.async("nodebuffer"));
  }
}

async function insertRows(pool: Pool, schema: string, table: string, rows: Array<Record<string, unknown>>): Promise<void> {
  const target = `${qident(schema)}.${qident(table)}`;
  const client = await pool.connect();
  try {
    const existing = new Set(
      (await client.query("SELECT column_name FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2", [schema, table])).rows.map((r: { column_name: string }) => r.column_name),
    );
    await client.query("BEGIN");
    for (const row of rows) {
      const cols = Object.keys(row).filter((c) => IDENT.test(c) && existing.has(c));
      if (!cols.length) continue;
      const values = cols.map((c) => {
        const v = row[c];
        return v !== null && typeof v === "object" && !(v instanceof Date) ? JSON.stringify(v) : v;
      });
      await client.query(`INSERT INTO ${target} (${cols.map(qident).join(", ")}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(", ")})`, values);
    }
    // Keep ids as they were (links between rows rely on them), and carry on
    // numbering after the highest one.
    await client.query(`SELECT setval(pg_get_serial_sequence($1, 'id'), GREATEST((SELECT COALESCE(MAX(id), 0) FROM ${target}), 1))`, [`${schema}.${table}`]);
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw new ImportError(`Couldn't restore the rows of "${table}": ${err instanceof Error ? err.message : "unknown error"}`);
  } finally {
    client.release();
  }
}

