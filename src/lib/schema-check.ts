import { Prisma } from "@prisma/client";
import { db } from "./db";

/**
 * Schema-drift check. The database client is generated from
 * prisma/schema.prisma; if the database itself was not updated to match
 * (the 29 Sep outage: a new client against an old database), every query
 * that touches a missing column fails. This compares the columns the client
 * expects with the database's real tables and columns, so the problem shows
 * up at startup, on /api/health and on the admin page instead of as 500s.
 *
 * scripts/check-schema.mjs runs the same comparison before the server
 * starts; keep the two in step.
 */

export type DmmfField = { name: string; kind: string; dbName?: string | null };
export type DmmfModel = { name: string; dbName?: string | null; schema?: string | null; fields: readonly DmmfField[] };
export type DmmfEnum = { name: string; dbName?: string | null; values: readonly { name: string; dbName?: string | null }[] };

export type SchemaStatus = {
  /** False when something the app needs is missing (or the check could not run). */
  ok: boolean;
  checkedAt: string;
  /** "Model.field" for every column the client expects but the database lacks. */
  missing: string[];
  /** "Enum.VALUE" for every enum value the client can write but the database lacks. */
  missingValues: string[];
  /** Set when the database could not be asked (it is down or refused the query). */
  error?: string;
};

/** Relation fields (kind "object") are not columns; everything else is. */
function columnFields(model: DmmfModel): DmmfField[] {
  return model.fields.filter((f) => f.kind !== "object");
}

/**
 * The comparison itself, kept free of I/O so it can be tested with a fake
 * datamodel. `columns` maps "schema.table" to that table's column names.
 */
export function findMissingColumns(models: readonly DmmfModel[], columns: Map<string, Set<string>>, defaultSchema: string): string[] {
  const missing: string[] = [];
  for (const model of models) {
    const table = `${model.schema || defaultSchema}.${model.dbName || model.name}`;
    const have = columns.get(table);
    for (const field of columnFields(model)) {
      if (!have || !have.has(field.dbName || field.name)) missing.push(`${model.name}.${field.name}`);
    }
  }
  return missing;
}

/** Enum values the client may write that the database's enum types lack. `values` maps type name to labels. */
export function findMissingEnumValues(enums: readonly DmmfEnum[], values: Map<string, Set<string>>): string[] {
  const missing: string[] = [];
  for (const e of enums) {
    const have = values.get(e.dbName || e.name);
    for (const v of e.values) {
      if (!have || !have.has(v.dbName || v.name)) missing.push(`${e.name}.${v.name}`);
    }
  }
  return missing;
}

/** Runs the check against the database now (no cache). */
export async function checkSchema(): Promise<SchemaStatus> {
  const checkedAt = new Date().toISOString();
  const models = Prisma.dmmf.datamodel.models as unknown as DmmfModel[];
  const enums = Prisma.dmmf.datamodel.enums as unknown as DmmfEnum[];
  try {
    const [{ schema: current }] = await db.$queryRaw<{ schema: string }[]>`SELECT current_schema() AS schema`;
    const schemas = [...new Set([current, ...models.map((m) => m.schema).filter((s): s is string => Boolean(s))])];
    const rows = await db.$queryRaw<{ table_schema: string; table_name: string; column_name: string }[]>`
      SELECT table_schema, table_name, column_name
      FROM information_schema.columns
      WHERE table_schema IN (${Prisma.join(schemas)})`;
    const columns = new Map<string, Set<string>>();
    for (const r of rows) {
      const key = `${r.table_schema}.${r.table_name}`;
      if (!columns.has(key)) columns.set(key, new Set());
      columns.get(key)!.add(r.column_name);
    }
    const labels = await db.$queryRaw<{ typname: string; enumlabel: string }[]>`
      SELECT t.typname, e.enumlabel
      FROM pg_type t
      JOIN pg_enum e ON e.enumtypid = t.oid
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname IN (${Prisma.join(schemas)})`;
    const values = new Map<string, Set<string>>();
    for (const l of labels) {
      if (!values.has(l.typname)) values.set(l.typname, new Set());
      values.get(l.typname)!.add(l.enumlabel);
    }
    const missing = findMissingColumns(models, columns, current);
    const missingValues = findMissingEnumValues(enums, values);
    return { ok: missing.length === 0 && missingValues.length === 0, checkedAt, missing, missingValues };
  } catch (err) {
    return { ok: false, checkedAt, missing: [], missingValues: [], error: err instanceof Error ? err.message.split("\n")[0].slice(0, 300) : String(err) };
  }
}

type Cache = { value?: SchemaStatus; at: number; inflight?: Promise<SchemaStatus>; boot?: SchemaStatus };
const KEY = Symbol.for("nullkode.schemaCheck.v1");

function cache(): Cache {
  const g = globalThis as typeof globalThis & { [KEY]?: Cache };
  g[KEY] ??= { at: 0 };
  return g[KEY]!;
}

/**
 * The drift result, re-checked at most once per `maxAgeMs` (health checks
 * arrive every few seconds). A failed check is retried on the next call.
 */
export async function getSchemaStatus(maxAgeMs = 60_000): Promise<SchemaStatus> {
  const c = cache();
  if (c.value && !c.value.error && Date.now() - c.at < maxAgeMs) return c.value;
  c.inflight ??= checkSchema()
    .then((value) => {
      c.value = value;
      c.at = Date.now();
      return value;
    })
    .finally(() => {
      c.inflight = undefined;
    });
  return c.inflight;
}

/** The result of the check made when the server started (see instrumentation-node.ts). */
export function bootSchemaStatus(): SchemaStatus | undefined {
  return cache().boot;
}

/** Runs the startup check once, stores it for the admin page and logs any drift loudly. */
export async function runBootSchemaCheck(): Promise<SchemaStatus> {
  const status = await getSchemaStatus(0);
  cache().boot = status;
  if (status.error) {
    console.error(`[schema] Could not check the database structure at startup: ${status.error}`);
  } else if (!status.ok) {
    const lines = [
      "[schema] ================================================================",
      `[schema] THE DATABASE NEEDS AN UPDATE. It is missing ${describeMissing(status)}:`,
      ...[...status.missing, ...status.missingValues].map((m) => `[schema]   ${m}`),
      "[schema] Anything that uses them will fail until the database is updated.",
      "[schema] Back up the database, then run `pnpm exec prisma db push` in the app folder",
      "[schema] and restart (Docker installs do this on restart: docker compose up -d).",
      "[schema] ================================================================",
    ];
    console.error(lines.join("\n"));
  }
  return status;
}

/** "3 columns", "1 column and 2 list values", … for plain-language messages. */
export function describeMissing(status: Pick<SchemaStatus, "missing" | "missingValues">): string {
  const parts: string[] = [];
  if (status.missing.length) parts.push(`${status.missing.length} column${status.missing.length === 1 ? "" : "s"}`);
  if (status.missingValues.length) parts.push(`${status.missingValues.length} list value${status.missingValues.length === 1 ? "" : "s"}`);
  return parts.join(" and ") || "nothing";
}
