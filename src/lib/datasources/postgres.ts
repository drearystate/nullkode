import { Pool } from "pg";
import type { DataSource } from "@prisma/client";
import type { DataAdapter, QueryOpts } from "./index";
import { isPublicHost } from "../public-url";

type Config = {
  connectionString?: string;
  schema?: string;
};

const pools = new Map<string, Pool>();

const SCHEMA_NAME = /^proj_[a-z0-9]+$/;

/**
 * The Postgres schema that holds an app's built-in tables ("proj_<id>").
 * Project ids are cuids (lowercase letters and digits); anything else is
 * refused, so the name is always safe to quote into SQL.
 */
export function projectSchemaName(projectId: string): string {
  const name = `proj_${projectId}`;
  if (!SCHEMA_NAME.test(name)) throw new Error("Invalid app id");
  return name;
}

/**
 * Takes a deleted app's built-in tables out of service without destroying
 * them yet: `proj_<id>` becomes `trash_proj_<id>_<yyyymmdd>` (UTC date), and
 * the nightly maintenance drops trash schemas after 7 days. When a schema of
 * that name is already there (the same app erased twice in a day), the new
 * one gets a `_2`, `_3`… suffix. Only ever touches the platform's own
 * database, never an outside one. Returns the new name, or null when the app
 * never had any tables.
 */
export async function renameSchemaToTrash(projectId: string, when = new Date()): Promise<string | null> {
  const schema = projectSchemaName(projectId);
  const day = when.toISOString().slice(0, 10).replace(/-/g, "");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  try {
    const exists = await pool.query("SELECT 1 FROM pg_namespace WHERE nspname = $1", [schema]);
    if (exists.rowCount === 0) return null;
    for (let n = 1; n <= 20; n++) {
      const target = `trash_${schema}_${day}${n === 1 ? "" : `_${n}`}`;
      if (target.length > 63) throw new Error("App id too long for a trash schema name");
      const taken = await pool.query("SELECT 1 FROM pg_namespace WHERE nspname = $1", [target]);
      if (taken.rowCount) continue;
      await pool.query(`ALTER SCHEMA ${qident(schema)} RENAME TO ${qident(target)}`);
      // The app's cached connection pool points at tables that are gone now.
      const cached = pools.get(`internal:${schema}`);
      if (cached) {
        pools.delete(`internal:${schema}`);
        void cached.end().catch(() => {});
      }
      return target;
    }
    throw new Error(`Too many trash copies of ${schema} today`);
  } finally {
    await pool.end().catch(() => {});
  }
}

async function poolFor(source: DataSource): Promise<{ pool: Pool; schema: string }> {
  const cfg = (source.config as Config) ?? {};
  if (source.kind === "POSTGRES_INTERNAL") {
    const schema = projectSchemaName(source.projectId);
    const key = `internal:${schema}`;
    if (!pools.has(key)) {
      pools.set(
        key,
        new Pool({
          connectionString: process.env.DATABASE_URL,
          max: 4,
        })
      );
    }
    return { pool: pools.get(key)!, schema };
  }
  // EXTERNAL
  if (!cfg.connectionString) throw new Error("External Postgres: missing connectionString");
  const key = `external:${source.id}`;
  if (!pools.has(key)) {
    // An app's own database must be on the internet: an address on this
    // server's network could reach the platform's own services. Self-hosters
    // connecting a database on their LAN can allow it explicitly.
    if (process.env.NK_ALLOW_PRIVATE_DATABASES !== "1") {
      let host = "";
      try { host = new URL(cfg.connectionString).hostname; } catch { /* checked below */ }
      if (!host || !(await isPublicHost(host))) {
        throw new Error("That database isn't reachable on the public internet. Use its public address.");
      }
    }
    pools.set(key, new Pool({ connectionString: cfg.connectionString, max: 4 }));
  }
  return { pool: pools.get(key)!, schema: cfg.schema ?? "public" };
}

function qident(name: string) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) throw new Error(`Invalid identifier: ${name}`);
  return `"${name}"`;
}

function buildWhere(
  where: Record<string, unknown> | undefined,
  startIndex: number
): { sql: string; params: unknown[] } {
  const all = Object.entries(where ?? {});
  // A blank id never means "any row": without this, a detail page opened
  // without ?id= showed someone else's record, and an update with a blank id
  // rewrote every row in the table. Other blank filters stay optional (search
  // forms leave fields empty).
  if (all.some(([k, v]) => k === "id" && (v === undefined || v === null || v === ""))) {
    return { sql: " WHERE false", params: [] };
  }
  const entries = all.filter(([, v]) => v !== undefined && v !== "");
  if (entries.length === 0) return { sql: "", params: [] };
  const params: unknown[] = [];
  const clauses = entries.map(([k, v], i) => {
    params.push(v);
    return `${qident(k)} = $${startIndex + i}`;
  });
  return { sql: ` WHERE ${clauses.join(" AND ")}`, params };
}

export const postgresAdapter: DataAdapter = {
  async list(source, table, opts: QueryOpts) {
    const { pool, schema } = await poolFor(source);
    const { sql: where, params } = buildWhere(opts.where, 1);
    const limit = Math.max(0, Math.min(1000, opts.limit ?? 100));
    const orderBy =
      opts.orderBy && /^[a-zA-Z_][a-zA-Z0-9_]*(\s+(asc|desc))?$/i.test(opts.orderBy)
        ? ` ORDER BY ${opts.orderBy}`
        : "";
    const sql = `SELECT * FROM ${qident(schema)}.${qident(table)}${where}${orderBy} LIMIT ${limit}`;
    const r = await pool.query(sql, params);
    return r.rows;
  },

  async insert(source, table, values) {
    const { pool, schema } = await poolFor(source);
    const keys = Object.keys(values);
    if (keys.length === 0) throw new Error("Insert requires at least one value");
    const params = keys.map((k) => values[k]);
    const cols = keys.map((k) => qident(k)).join(", ");
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(", ");
    const sql = `INSERT INTO ${qident(schema)}.${qident(table)} (${cols}) VALUES (${placeholders}) RETURNING *`;
    const r = await pool.query(sql, params);
    return r.rows[0];
  },

  async update(source, table, where, values) {
    const { pool, schema } = await poolFor(source);
    const setKeys = Object.keys(values);
    if (setKeys.length === 0) return 0;
    const setParams = setKeys.map((k) => values[k]);
    const setSql = setKeys.map((k, i) => `${qident(k)} = $${i + 1}`).join(", ");
    const { sql: whereSql, params: whereParams } = buildWhere(where, setKeys.length + 1);
    if (!whereSql) throw Object.assign(new Error("Refusing to UPDATE every row: the filter is empty"), { code: "NK_BAD_INPUT" });
    const sql = `UPDATE ${qident(schema)}.${qident(table)} SET ${setSql}${whereSql}`;
    const r = await pool.query(sql, [...setParams, ...whereParams]);
    return r.rowCount ?? 0;
  },

  async remove(source, table, where) {
    const { pool, schema } = await poolFor(source);
    const { sql: whereSql, params } = buildWhere(where, 1);
    if (!whereSql) throw Object.assign(new Error("Refusing to DELETE without a WHERE clause"), { code: "NK_BAD_INPUT" });
    const sql = `DELETE FROM ${qident(schema)}.${qident(table)}${whereSql}`;
    const r = await pool.query(sql, params);
    return r.rowCount ?? 0;
  },

  async rawQuery(source, table, opts) {
    const { pool, schema } = await poolFor(source);
    const { sql: whereSql, params } = buildWhere(opts.where, 1);
    const groupBy = opts.groupBy && /^[a-zA-Z_][a-zA-Z0-9_]*$/i.test(opts.groupBy)
      ? ` GROUP BY ${qident(opts.groupBy)}`
      : "";
    const agg = opts.aggregate ?? "COUNT(*)";
    // Validate aggregate to prevent injection — only allow safe patterns
    if (!/^(COUNT|SUM|AVG|MIN|MAX)\(\s*(\*|[a-zA-Z_][a-zA-Z0-9_]*)\s*\)$/i.test(agg)) {
      throw new Error(`Invalid aggregate: ${agg}`);
    }
    const selectCols = groupBy
      ? `${qident(opts.groupBy!)}, ${agg} as value`
      : `${agg} as value`;
    const orderBy = opts.orderBy && /^[a-zA-Z_][a-zA-Z0-9_]*(\s+(asc|desc))?$/i.test(opts.orderBy)
      ? ` ORDER BY ${opts.orderBy}`
      : groupBy ? ` ORDER BY value DESC` : "";
    const limit = Math.max(0, Math.min(1000, opts.limit ?? 100));
    const sql = `SELECT ${selectCols} FROM ${qident(schema)}.${qident(table)}${whereSql}${groupBy}${orderBy} LIMIT ${limit}`;
    const r = await pool.query(sql, params);
    return r.rows;
  },
};

export type FieldType = "text" | "int" | "float" | "bool" | "timestamp" | "json";

const RESERVED_COLUMNS = new Set(["id", "created_at", "updated_at", "created_by"]);

export async function ensureInternalTable(
  projectId: string,
  tableName: string,
  fields: Array<{ name: string; type: FieldType }>
) {
  const schema = projectSchemaName(projectId);
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
  try {
    await pool.query(`CREATE SCHEMA IF NOT EXISTS ${qident(schema)}`);
    // Filter out reserved columns — we always create id + created_at + created_by ourselves
    const safe = fields.filter((f) => !RESERVED_COLUMNS.has(f.name.toLowerCase()));
    const cols = safe.map((f) => `${qident(f.name)} ${sqlType(f.type)}`).join(", ");
    // created_by is the auto-attribution column — the runtime fills it from the
    // session on every insert. Nullable so anonymous/seeded rows are fine.
    const trailing = "created_at TIMESTAMPTZ DEFAULT NOW(), created_by TEXT";
    const body = cols ? `id SERIAL PRIMARY KEY, ${cols}, ${trailing}` : `id SERIAL PRIMARY KEY, ${trailing}`;
    const sql = `CREATE TABLE IF NOT EXISTS ${qident(schema)}.${qident(tableName)} (${body})`;
    await pool.query(sql);
    // Backfill: add created_by to legacy tables that pre-date this change.
    try {
      await pool.query(
        `ALTER TABLE ${qident(schema)}.${qident(tableName)} ADD COLUMN IF NOT EXISTS created_by TEXT`,
      );
    } catch {
      // older Postgres without IF NOT EXISTS on ADD COLUMN — ignore.
    }
  } finally {
    await pool.end();
  }
}

function sqlType(t: FieldType): string {
  switch (t) {
    case "text":
      return "TEXT";
    case "int":
      return "INTEGER";
    case "float":
      return "DOUBLE PRECISION";
    case "bool":
      return "BOOLEAN";
    case "timestamp":
      return "TIMESTAMPTZ";
    case "json":
      return "JSONB";
    default:
      return "TEXT";
  }
}
