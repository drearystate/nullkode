#!/usr/bin/env node
/**
 * Pre-start database check. Compares the columns the installed database
 * client expects (the generated @prisma/client) with the real database, so
 * a server whose database was not updated refuses to start with a plain
 * message instead of failing page by page (the 29 Sep outage).
 *
 *   node scripts/check-schema.mjs              # refuse to start on drift (exit 1)
 *   NK_SCHEMA_MODE=apply node scripts/check-schema.mjs
 *                                              # apply additive changes first
 *                                              # (prisma db push, never --accept-data-loss)
 *   NK_SCHEMA_MODE=warn  node scripts/check-schema.mjs   # report only, always exit 0
 *
 * Used by docs/deploy/systemd/nullkode.service (ExecStartPre) and by
 * scripts/container-start.sh (Docker, in apply mode). The same comparison
 * runs inside the app (src/lib/schema-check.ts); keep the two in step.
 *
 * Exit codes: 0 = ready to start, 1 = the database needs an update.
 * If the database cannot be reached at all, this prints a warning and exits
 * 0: the app itself retries the connection and reports it on /api/health.
 */
import { createRequire } from "node:module";
import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const require = createRequire(join(process.cwd(), "package.json"));
const modeArg = process.argv.find((a) => a.startsWith("--mode="))?.slice(7);
const mode = (modeArg || process.env.NK_SCHEMA_MODE || "refuse").toLowerCase();
if (!["refuse", "apply", "warn"].includes(mode)) {
  console.error(`NK_SCHEMA_MODE must be "refuse", "apply" or "warn" (got "${mode}").`);
  process.exit(1);
}

// systemd passes .env through EnvironmentFile; when run by hand, read it here.
if (!process.env.DATABASE_URL && existsSync(".env")) {
  for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*DATABASE_URL\s*=\s*(.*)\s*$/);
    if (m) process.env.DATABASE_URL = m[1].replace(/^(['"])(.*)\1$/, "$2");
  }
}
if (!process.env.DATABASE_URL) {
  console.error("check-schema: DATABASE_URL is not set, so the database cannot be checked. Add it to .env.");
  process.exit(mode === "warn" ? 0 : 1);
}

const { PrismaClient, Prisma } = require("@prisma/client");

/** "Model.field" for every column the client expects but the database lacks. Mirrors src/lib/schema-check.ts. */
function findMissingColumns(models, columns, defaultSchema) {
  const missing = [];
  for (const model of models) {
    const have = columns.get(`${model.schema || defaultSchema}.${model.dbName || model.name}`);
    for (const field of model.fields) {
      if (field.kind === "object") continue; // relations are not columns
      if (!have || !have.has(field.dbName || field.name)) missing.push(`${model.name}.${field.name}`);
    }
  }
  return missing;
}

/** "Enum.VALUE" for every enum value the database lacks. Mirrors src/lib/schema-check.ts. */
function findMissingEnumValues(enums, values) {
  const missing = [];
  for (const e of enums) {
    const have = values.get(e.dbName || e.name);
    for (const v of e.values) if (!have || !have.has(v.dbName || v.name)) missing.push(`${e.name}.${v.name}`);
  }
  return missing;
}

async function check() {
  const db = new PrismaClient();
  try {
    const models = Prisma.dmmf.datamodel.models;
    const enums = Prisma.dmmf.datamodel.enums;
    const [{ schema: current }] = await db.$queryRawUnsafe("SELECT current_schema() AS schema");
    const schemas = [...new Set([current, ...models.map((m) => m.schema).filter(Boolean)])];
    const rows = await db.$queryRawUnsafe(
      "SELECT table_schema, table_name, column_name FROM information_schema.columns WHERE table_schema = ANY($1::text[])",
      schemas,
    );
    const columns = new Map();
    for (const r of rows) {
      const key = `${r.table_schema}.${r.table_name}`;
      if (!columns.has(key)) columns.set(key, new Set());
      columns.get(key).add(r.column_name);
    }
    const labels = await db.$queryRawUnsafe(
      "SELECT t.typname, e.enumlabel FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = ANY($1::text[])",
      schemas,
    );
    const values = new Map();
    for (const l of labels) {
      if (!values.has(l.typname)) values.set(l.typname, new Set());
      values.get(l.typname).add(l.enumlabel);
    }
    return { missing: [...findMissingColumns(models, columns, current), ...findMissingEnumValues(enums, values)] };
  } catch (err) {
    return { error: String(err?.message ?? err).split("\n").filter(Boolean).slice(-1)[0] };
  } finally {
    await db.$disconnect().catch(() => {});
  }
}

function explain(missing) {
  console.error("");
  console.error(`The database is missing ${missing.length} item${missing.length === 1 ? "" : "s"} this version of the app needs:`);
  for (const m of missing) console.error(`  - ${m}`);
  console.error("");
}

const first = await check();
if (first.error) {
  console.warn(`check-schema: could not reach the database to check it (${first.error}). Starting anyway; /api/health will report the problem.`);
  process.exit(0);
}
if (!first.missing.length && mode !== "apply") {
  console.log("check-schema: the database matches this version of the app.");
  process.exit(0);
}

if (mode === "apply") {
  // Same as the Docker start script has always done: add what is new, but
  // never accept a change that would delete data.
  console.log("check-schema: updating the database structure (prisma db push, additive changes only)…");
  const push = spawnSync(process.execPath, [join(process.cwd(), "node_modules/prisma/build/index.js"), "db", "push", "--skip-generate"], { stdio: "inherit", env: process.env });
  const after = await check();
  if (after.error) {
    console.warn(`check-schema: could not re-check the database (${after.error}). Starting anyway.`);
    process.exit(0);
  }
  if (after.missing.length) {
    explain(after.missing);
    console.error("The automatic update could not add them (see the messages above). Back up, then run `pnpm exec prisma db push`");
    console.error("by hand and review what it wants to change. The app will not start until the database is updated.");
    process.exit(1);
  }
  if (push.status !== 0) console.warn("check-schema: the update step reported a problem, but nothing the app needs is missing. Starting.");
  console.log("check-schema: the database matches this version of the app.");
  process.exit(0);
}

explain(first.missing);
if (mode === "warn") {
  console.error("Starting anyway (NK_SCHEMA_MODE=warn). Pages that use these will fail until the database is updated.");
  process.exit(0);
}
console.error("The app will not start until the database is updated, because pages that use these would fail.");
console.error("Back up the database, then in the app folder run:  pnpm exec prisma db push");
console.error("(or set NK_SCHEMA_MODE=apply to let the server add them automatically when it starts).");
process.exit(1);
