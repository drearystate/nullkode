/**
 * Server helpers for the owner's data view: which tables an app has, their
 * rows, and safe writes to them.
 *
 * Every table and column name used in SQL is checked against the project's
 * DataTable records and the table's real columns (information_schema) before
 * it is quoted; every value is a query parameter. Columns that look like
 * secrets (password hashes, tokens) are never selected, so they can't reach
 * the browser.
 */
import { Pool } from "pg";
import type { DataSource } from "@prisma/client";
import { db } from "@/lib/db";
import { getAdapter } from "@/lib/datasources";
import { json } from "@/lib/utils";

export const SENSITIVE_COLUMN = /password|_hash$|secret|token/i;
const IDENT = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
const READ_ONLY_COLUMNS = new Set(["id", "created_at", "updated_at", "created_by"]);
export const MAX_PAGE_SIZE = 200;
export const CSV_ROW_CAP = 50_000;
/** Rows read from Google Sheets / outside databases (read-only, in memory). */
const OUTSIDE_ROW_CAP = 1000;

export type ColType = "text" | "int" | "float" | "bool" | "timestamp" | "date" | "json" | "other";
export type Column = { name: string; label: string; type: ColType; readOnly: boolean };
type RawColumn = { name: string; dataType: string; udt: string };

export class DataError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

export function errorResponse(err: unknown) {
  if (err instanceof DataError) return json({ error: err.message }, { status: err.status });
  console.error("[data]", err);
  return json({ error: "Something went wrong reading your data. Please try again." }, { status: 500 });
}

const g = globalThis as unknown as { __nkDataPool?: Pool };
function pool(): Pool {
  if (!g.__nkDataPool) g.__nkDataPool = new Pool({ connectionString: process.env.DATABASE_URL, max: 3 });
  return g.__nkDataPool;
}

export function schemaFor(projectId: string) {
  return `proj_${projectId.replace(/[^a-zA-Z0-9_]/g, "")}`;
}

function q(name: string) {
  if (!IDENT.test(name)) throw new DataError("That name isn't allowed.");
  return `"${name}"`;
}

/* ── Friendly names ─────────────────────────────────────────── */

const TABLE_LABELS: Record<string, string> = {
  auth_users: "People who signed up",
};
const COLUMN_LABELS: Record<string, string> = {
  id: "ID",
  created_at: "Added",
  updated_at: "Last changed",
  created_by: "Added by",
  email: "Email",
  url: "Link",
};

function words(name: string) {
  const parts = name
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((w) => w.toLowerCase());
  // "bookings_bookings" -> "bookings"
  const deduped = parts.filter((w, i) => i === 0 || w !== parts[i - 1]);
  const s = deduped.join(" ");
  return s ? s[0].toUpperCase() + s.slice(1) : name;
}

export function tableLabel(name: string) {
  return TABLE_LABELS[name] ?? words(name);
}

export function columnLabel(name: string) {
  return COLUMN_LABELS[name] ?? words(name).replace(/\bid\b/i, "ID");
}

/* ── Tables ─────────────────────────────────────────────────── */

export type TableSummary = {
  id: string;
  name: string;
  label: string;
  sourceName: string;
  sourceKind: string;
  /** null when the count isn't known (outside sources) or the table is missing. */
  rows: number | null;
  editable: boolean;
  missing: boolean;
};

type Resolved = {
  id: string;
  name: string;
  label: string;
  source: DataSource;
  fields: Array<{ name: string; type: string }>;
};

async function internalColumnsByTable(schema: string, names: string[]) {
  const map = new Map<string, RawColumn[]>();
  if (names.length === 0) return map;
  const r = await pool().query<{ table_name: string; column_name: string; data_type: string; udt_name: string }>(
    `SELECT table_name, column_name, data_type, udt_name FROM information_schema.columns
      WHERE table_schema = $1 AND table_name = ANY($2::text[]) ORDER BY table_name, ordinal_position`,
    [schema, names],
  );
  for (const row of r.rows) {
    const list = map.get(row.table_name) ?? [];
    list.push({ name: row.column_name, dataType: row.data_type, udt: row.udt_name });
    map.set(row.table_name, list);
  }
  return map;
}

export async function listTables(projectId: string): Promise<TableSummary[]> {
  const tables = await db.dataTable.findMany({
    where: { datasource: { projectId } },
    include: { datasource: true },
    orderBy: { createdAt: "asc" },
  });
  const schema = schemaFor(projectId);
  const internal = tables.filter((t) => t.datasource.kind === "POSTGRES_INTERNAL" && IDENT.test(t.name));
  const cols = await internalColumnsByTable(schema, internal.map((t) => t.name));
  const counts = new Map<string, number>();
  await Promise.all(
    internal
      .filter((t) => cols.has(t.name))
      .map(async (t) => {
        const r = await pool().query<{ n: string }>(`SELECT count(*)::bigint AS n FROM ${q(schema)}.${q(t.name)}`);
        counts.set(t.id, Number(r.rows[0].n));
      }),
  );
  return tables.map((t) => {
    const isInternal = t.datasource.kind === "POSTGRES_INTERNAL";
    const missing = isInternal && !cols.has(t.name);
    return {
      id: t.id,
      name: t.name,
      label: tableLabel(t.name),
      sourceName: t.datasource.name,
      sourceKind: t.datasource.kind,
      rows: counts.get(t.id) ?? null,
      editable: isInternal && !missing,
      missing,
    };
  });
}

/** Finds a table by its DataTable id or its name, only within this project. */
export async function resolveTable(projectId: string, key: string): Promise<Resolved> {
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(key)) throw new DataError("We couldn't find that table.", 404);
  const matches = await db.dataTable.findMany({
    where: { datasource: { projectId }, OR: [{ id: key }, { name: key }] },
    include: { datasource: true },
  });
  const t =
    matches.find((m) => m.id === key) ??
    matches.find((m) => m.datasource.kind === "POSTGRES_INTERNAL") ??
    matches[0];
  if (!t || !IDENT.test(t.name)) throw new DataError("We couldn't find that table.", 404);
  const fields = ((t.schema as { fields?: Array<{ name: string; type: string }> } | null)?.fields ?? []).filter(
    (f) => f && typeof f.name === "string",
  );
  return { id: t.id, name: t.name, label: tableLabel(t.name), source: t.datasource, fields };
}

function mapType(c: RawColumn): ColType {
  const t = c.dataType.toLowerCase();
  if (t === "text" || t.startsWith("character") || t === "uuid" || t === "citext" || c.udt === "citext") return "text";
  if (t === "integer" || t === "bigint" || t === "smallint") return "int";
  if (t === "double precision" || t === "real" || t === "numeric") return "float";
  if (t === "boolean") return "bool";
  if (t.startsWith("timestamp")) return "timestamp";
  if (t === "date") return "date";
  if (t === "json" || t === "jsonb") return "json";
  return "other";
}

type Shape = {
  table: Resolved;
  /** Columns the owner may see (never secrets). */
  columns: Column[];
  raw: Map<string, RawColumn>;
  editable: boolean;
  hasId: boolean;
  hasCreatedAt: boolean;
  note?: string;
};

async function internalShape(projectId: string, table: Resolved): Promise<Shape> {
  const cols = (await internalColumnsByTable(schemaFor(projectId), [table.name])).get(table.name);
  if (!cols) throw new DataError("This table hasn't been set up in your app's database yet.", 404);
  const raw = new Map<string, RawColumn>();
  const columns: Column[] = [];
  for (const c of cols) {
    if (SENSITIVE_COLUMN.test(c.name) || !IDENT.test(c.name)) continue;
    raw.set(c.name, c);
    const type = mapType(c);
    columns.push({ name: c.name, label: columnLabel(c.name), type, readOnly: READ_ONLY_COLUMNS.has(c.name) || type === "other" });
  }
  const hasId = raw.has("id");
  return {
    table,
    columns,
    raw,
    editable: hasId,
    hasId,
    hasCreatedAt: raw.has("created_at"),
    note: hasId ? undefined : "This table has no ID column, so its rows can only be viewed here.",
  };
}

/* ── Reading rows ───────────────────────────────────────────── */

export type RowQuery = { page: number; pageSize: number; search: string; sort: string; dir: "asc" | "desc" };

export function parseRowQuery(url: URL, { csv = false } = {}): RowQuery {
  const page = csv ? 1 : Math.max(1, Math.floor(Number(url.searchParams.get("page")) || 1));
  const size = Math.floor(Number(url.searchParams.get("pageSize")) || 50);
  const pageSize = csv ? CSV_ROW_CAP : Math.max(1, Math.min(MAX_PAGE_SIZE, size));
  const search = (url.searchParams.get("search") ?? "").slice(0, 200).trim();
  const sort = url.searchParams.get("sort") ?? "";
  const dir = url.searchParams.get("dir") === "asc" ? "asc" : "desc";
  return { page, pageSize, search, sort, dir };
}

export type RowsResult = {
  table: { id: string; name: string; label: string; sourceKind: string };
  columns: Column[];
  rows: Array<Record<string, unknown>>;
  total: number;
  page: number;
  pageSize: number;
  sort: string | null;
  dir: "asc" | "desc";
  editable: boolean;
  note?: string;
};

export async function readRows(projectId: string, key: string, opts: RowQuery): Promise<RowsResult> {
  const table = await resolveTable(projectId, key);
  if (table.source.projectId !== projectId) throw new DataError("We couldn't find that table.", 404);
  if (table.source.kind !== "POSTGRES_INTERNAL") return readOutsideRows(table, opts);

  const shape = await internalShape(projectId, table);
  if (opts.sort && !shape.raw.has(opts.sort)) throw new DataError("You can't sort by that column.");
  const from = `${q(schemaFor(projectId))}.${q(table.name)}`;

  const params: unknown[] = [];
  let where = "";
  if (opts.search) {
    const textCols = shape.columns.filter((c) => c.type === "text").map((c) => c.name);
    const parts: string[] = [];
    if (textCols.length) {
      params.push(`%${opts.search.replace(/[\\%_]/g, "\\$&")}%`);
      for (const c of textCols) parts.push(`${q(c)}::text ILIKE $${params.length}`);
    }
    if (shape.hasId) {
      params.push(opts.search);
      parts.push(`${q("id")}::text = $${params.length}`);
    }
    where = parts.length ? ` WHERE (${parts.join(" OR ")})` : " WHERE false";
  }

  const sort = opts.sort || (shape.hasCreatedAt ? "created_at" : shape.hasId ? "id" : "");
  const dir = opts.sort ? opts.dir : "desc";
  const order = sort
    ? ` ORDER BY ${q(sort)} ${dir === "asc" ? "ASC" : "DESC"} NULLS LAST${shape.hasId && sort !== "id" ? `, ${q("id")} DESC` : ""}`
    : "";
  const select = shape.columns
    .map((c) => (c.type === "date" ? `${q(c.name)}::text AS ${q(c.name)}` : q(c.name)))
    .join(", ") || "1 AS _";
  const offset = (opts.page - 1) * opts.pageSize;

  const [rows, count] = await Promise.all([
    pool().query(`SELECT ${select} FROM ${from}${where}${order} LIMIT ${opts.pageSize} OFFSET ${offset}`, params),
    pool().query<{ n: string }>(`SELECT count(*)::bigint AS n FROM ${from}${where}`, params),
  ]);
  return {
    table: { id: table.id, name: table.name, label: table.label, sourceKind: table.source.kind },
    columns: shape.columns,
    rows: rows.rows.map(clean),
    total: Number(count.rows[0].n),
    page: opts.page,
    pageSize: opts.pageSize,
    sort: sort || null,
    dir,
    editable: shape.editable,
    note: shape.note,
  };
}

function clean(row: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if (SENSITIVE_COLUMN.test(k)) continue;
    out[k] = typeof v === "bigint" ? v.toString() : v;
  }
  return out;
}

/** Google Sheets and outside databases: read-only, first rows only. */
async function readOutsideRows(table: Resolved, opts: RowQuery): Promise<RowsResult> {
  let all: Array<Record<string, unknown>>;
  try {
    const { source, adapter } = await getAdapter(table.source.id);
    all = await Promise.race([
      adapter.list(source, table.name, { limit: OUTSIDE_ROW_CAP }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 15_000)),
    ]);
  } catch {
    throw new DataError("We couldn't reach this data source. Check its settings under Advanced.", 502);
  }
  all = all.map(clean);
  const names: string[] = [];
  for (const f of table.fields) if (!SENSITIVE_COLUMN.test(f.name) && !names.includes(f.name)) names.push(f.name);
  for (const row of all) for (const k of Object.keys(row)) if (!names.includes(k)) names.push(k);
  const columns: Column[] = names.map((n) => ({ name: n, label: columnLabel(n), type: "text", readOnly: true }));
  if (opts.sort && !names.includes(opts.sort)) throw new DataError("You can't sort by that column.");

  let rows = all;
  if (opts.search) {
    const s = opts.search.toLowerCase();
    rows = rows.filter((r) => Object.values(r).some((v) => v != null && String(typeof v === "object" ? JSON.stringify(v) : v).toLowerCase().includes(s)));
  }
  if (opts.sort) {
    const k = opts.sort;
    const m = opts.dir === "asc" ? 1 : -1;
    rows = [...rows].sort((a, b) => String(a[k] ?? "").localeCompare(String(b[k] ?? ""), undefined, { numeric: true }) * m);
  }
  const offset = (opts.page - 1) * opts.pageSize;
  return {
    table: { id: table.id, name: table.name, label: table.label, sourceKind: table.source.kind },
    columns,
    rows: rows.slice(offset, offset + opts.pageSize),
    total: rows.length,
    page: opts.page,
    pageSize: opts.pageSize,
    sort: opts.sort || null,
    dir: opts.dir,
    editable: false,
    note:
      table.source.kind === "GOOGLE_SHEETS"
        ? `This table lives in Google Sheets, so you can look at it here but make changes in the sheet itself. Showing up to the first ${OUTSIDE_ROW_CAP} rows.`
        : `This table lives in your own database, so you can look at it here but not change it. Showing up to the first ${OUTSIDE_ROW_CAP} rows.`,
  };
}

/* ── Writing rows (built-in database only) ──────────────────── */

async function writableShape(projectId: string, key: string) {
  const table = await resolveTable(projectId, key);
  if (table.source.kind !== "POSTGRES_INTERNAL") {
    throw new DataError("This table lives outside NullKode, so it can't be changed here.", 400);
  }
  const shape = await internalShape(projectId, table);
  if (!shape.editable) throw new DataError(shape.note ?? "This table can't be changed here.");
  return shape;
}

function coerce(col: Column, raw: RawColumn, v: unknown): { value: unknown; cast: string } {
  const label = col.label;
  if (v === null || v === undefined) return { value: null, cast: "" };
  if (typeof v === "string" && v.trim() === "" && col.type !== "text") return { value: null, cast: "" };
  switch (col.type) {
    case "text":
      return { value: typeof v === "object" ? JSON.stringify(v) : String(v), cast: "" };
    case "int": {
      const n = typeof v === "number" ? v : Number(String(v).trim());
      if (!Number.isSafeInteger(n)) throw new DataError(`"${label}" needs a whole number.`);
      return { value: n, cast: "" };
    }
    case "float": {
      const n = typeof v === "number" ? v : Number(String(v).trim());
      if (!Number.isFinite(n)) throw new DataError(`"${label}" needs a number.`);
      return { value: n, cast: "" };
    }
    case "bool": {
      const s = String(v).trim().toLowerCase();
      if (v === true || ["true", "yes", "1"].includes(s)) return { value: true, cast: "" };
      if (v === false || ["false", "no", "0"].includes(s)) return { value: false, cast: "" };
      throw new DataError(`"${label}" needs Yes or No.`);
    }
    case "timestamp": {
      const d = new Date(String(v));
      if (typeof v === "object" || Number.isNaN(d.getTime())) throw new DataError(`"${label}" needs a date and time.`);
      return { value: d.toISOString(), cast: "" };
    }
    case "date": {
      const s = String(v).trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || Number.isNaN(new Date(s).getTime())) throw new DataError(`"${label}" needs a date.`);
      return { value: s, cast: "" };
    }
    case "json": {
      let parsed = v;
      if (typeof v === "string") {
        try {
          parsed = JSON.parse(v);
        } catch {
          throw new DataError(`"${label}" isn't valid JSON.`);
        }
      }
      return { value: JSON.stringify(parsed), cast: raw.udt === "json" ? "::json" : "::jsonb" };
    }
    default:
      throw new DataError(`"${label}" can't be changed here.`);
  }
}

function valuesFor(shape: Shape, values: unknown) {
  if (!values || typeof values !== "object" || Array.isArray(values)) throw new DataError("Nothing to save.");
  const out: Array<{ name: string; value: unknown; cast: string }> = [];
  for (const [k, v] of Object.entries(values as Record<string, unknown>)) {
    const col = shape.columns.find((c) => c.name === k);
    const raw = shape.raw.get(k);
    if (SENSITIVE_COLUMN.test(k)) throw new DataError("Passwords and secret keys can't be changed here.");
    if (!col || !raw) throw new DataError(`There's no column called "${k.slice(0, 60)}".`);
    if (col.readOnly) throw new DataError(`"${col.label}" is filled in automatically and can't be changed.`);
    out.push({ name: k, ...coerce(col, raw, v) });
  }
  return out;
}

function idValue(shape: Shape, id: unknown) {
  const col = shape.columns.find((c) => c.name === "id")!;
  if (col.type === "int") {
    const n = typeof id === "number" ? id : Number(id);
    if (!Number.isSafeInteger(n)) throw new DataError("That row ID isn't valid.");
    return n;
  }
  if (typeof id !== "string" && typeof id !== "number") throw new DataError("That row ID isn't valid.");
  return String(id);
}

function selectList(shape: Shape) {
  return shape.columns.map((c) => (c.type === "date" ? `${q(c.name)}::text AS ${q(c.name)}` : q(c.name))).join(", ");
}

export async function insertRow(projectId: string, key: string, values: unknown) {
  const shape = await writableShape(projectId, key);
  const vals = valuesFor(shape, values ?? {});
  const from = `${q(schemaFor(projectId))}.${q(shape.table.name)}`;
  const sql = vals.length
    ? `INSERT INTO ${from} (${vals.map((v) => q(v.name)).join(", ")}) VALUES (${vals.map((v, i) => `$${i + 1}${v.cast}`).join(", ")}) RETURNING ${selectList(shape)}`
    : `INSERT INTO ${from} DEFAULT VALUES RETURNING ${selectList(shape)}`;
  const r = await pool().query(sql, vals.map((v) => v.value));
  return clean(r.rows[0]);
}

export async function updateRow(projectId: string, key: string, id: unknown, values: unknown) {
  const shape = await writableShape(projectId, key);
  const vals = valuesFor(shape, values);
  if (vals.length === 0) throw new DataError("Nothing to save.");
  const idv = idValue(shape, id);
  const from = `${q(schemaFor(projectId))}.${q(shape.table.name)}`;
  const set = vals.map((v, i) => `${q(v.name)} = $${i + 1}${v.cast}`).join(", ");
  const r = await pool().query(
    `UPDATE ${from} SET ${set} WHERE ${q("id")} = $${vals.length + 1} RETURNING ${selectList(shape)}`,
    [...vals.map((v) => v.value), idv],
  );
  if (r.rowCount === 0) throw new DataError("That row isn't there any more.", 404);
  return clean(r.rows[0]);
}

export async function deleteRows(projectId: string, key: string, ids: unknown) {
  const shape = await writableShape(projectId, key);
  if (!Array.isArray(ids) || ids.length === 0) throw new DataError("Pick at least one row to delete.");
  if (ids.length > 500) throw new DataError("You can delete up to 500 rows at a time.");
  const idvs = ids.map((i) => idValue(shape, i));
  const col = shape.columns.find((c) => c.name === "id")!;
  const from = `${q(schemaFor(projectId))}.${q(shape.table.name)}`;
  const r = await pool().query(
    `DELETE FROM ${from} WHERE ${q("id")} = ANY($1${col.type === "int" ? "::bigint[]" : "::text[]"})`,
    [col.type === "int" ? idvs : idvs.map(String)],
  );
  return r.rowCount ?? 0;
}

/* ── CSV ────────────────────────────────────────────────────── */

function csvCell(v: unknown, col: Column) {
  if (v === null || v === undefined) return "";
  let s: string;
  if (v instanceof Date) s = v.toISOString();
  else if (typeof v === "object") s = JSON.stringify(v);
  else s = String(v);
  // Stop spreadsheet apps treating customer text as a formula.
  if (col.type === "text" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(result: RowsResult) {
  const lines = [result.columns.map((c) => csvCell(c.label, { ...c, type: "text" })).join(",")];
  for (const row of result.rows) lines.push(result.columns.map((c) => csvCell(row[c.name], c)).join(","));
  return "﻿" + lines.join("\r\n") + "\r\n";
}

/* ── Latest submissions ─────────────────────────────────────── */

export type Submission = { tableId: string; tableLabel: string; rowId: string | null; createdAt: string; summary: string };

/**
 * The newest rows across the app's form-style tables: built-in tables with a
 * created_at column, not sign-up accounts, and not the sample rows put in
 * when the table was made.
 */
export async function latestSubmissions(projectId: string, limit = 5): Promise<Submission[]> {
  const tables = await db.dataTable.findMany({
    where: { datasource: { projectId, kind: "POSTGRES_INTERNAL" } },
    orderBy: { createdAt: "desc" },
    take: 40,
  });
  const candidates = tables.filter((t) => IDENT.test(t.name) && !/^auth_/.test(t.name));
  const schema = schemaFor(projectId);
  const cols = await internalColumnsByTable(schema, candidates.map((t) => t.name));
  const found: Array<Submission & { at: number }> = [];
  await Promise.all(
    candidates.map(async (t) => {
      const raw = cols.get(t.name);
      if (!raw || !raw.some((c) => c.name === "created_at")) return;
      const visible = raw.filter((c) => !SENSITIVE_COLUMN.test(c.name) && IDENT.test(c.name));
      const text = visible.filter((c) => mapType(c) === "text" && !READ_ONLY_COLUMNS.has(c.name)).slice(0, 3);
      const hasId = visible.some((c) => c.name === "id");
      const select = [
        `${q("created_at")} AS "__at"`,
        hasId ? `${q("id")}::text AS "__id"` : `NULL AS "__id"`,
        ...text.map((c, i) => `left(${q(c.name)}, 120) AS "__t${i}"`),
      ].join(", ");
      // Rows added as the table was made are its starter rows, not submissions.
      const since = new Date(t.createdAt.getTime() + 15_000);
      const r = await pool().query(
        `SELECT ${select} FROM ${q(schema)}.${q(t.name)} WHERE ${q("created_at")} > $1 ORDER BY ${q("created_at")} DESC LIMIT $2`,
        [since, limit],
      );
      for (const row of r.rows) {
        const at = row.__at instanceof Date ? row.__at : new Date(row.__at);
        const summary = text
          .map((_, i) => row[`__t${i}`])
          .filter((v) => typeof v === "string" && v.trim())
          .join(" · ");
        found.push({ tableId: t.id, tableLabel: tableLabel(t.name), rowId: row.__id, createdAt: at.toISOString(), summary, at: at.getTime() });
      }
    }),
  );
  return found
    .sort((a, b) => b.at - a.at)
    .slice(0, limit)
    .map(({ at: _at, ...s }) => s);
}
