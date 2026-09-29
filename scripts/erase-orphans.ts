/**
 * Finds what deleted apps left behind, from before deleting an app erased
 * its tables and files (lib/erase.ts):
 *  - `proj_<id>` schemas (an app's built-in tables, with its visitors'
 *    sign-ups and submissions) whose app no longer exists;
 *  - phone-app build folders `<private uploads>/<id>/` with no app;
 *  - Google Play upload-key folders `<private uploads>/.signing/<id>/` with no app;
 *  - with --cloned: copied-website folders `public/assets/cloned/<name>/`
 *    that no app has as its slug and no page, published version, icon or
 *    theme still uses.
 *
 * Reports only. With --apply, schemas are renamed to
 * `trash_proj_<id>_<yyyymmdd>` and folders are moved to
 * `<private uploads>/.trash/<yyyymmdd>/orphans/`; the nightly maintenance
 * deletes both after 7 days. Nothing is deleted outright, and shared uploads
 * (public/uploads) are never touched.
 *
 *   DATABASE_URL=… node_modules/.bin/tsx scripts/erase-orphans.ts [--cloned] [--apply]
 *
 * Safety: --apply is refused when the database has no apps at all while
 * leftovers exist, which usually means DATABASE_URL points at the wrong
 * database. Pass --allow-empty-database when that really is right.
 */
import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { Pool } from "pg";
import { db } from "../src/lib/db";
import { renameSchemaToTrash } from "../src/lib/datasources/postgres";
import { CLONED_FOLDER, clonedAssetsRoot, clonedFolderInUse, moveFolder, nativeDataRoot, trashDay, trashRoot } from "../src/lib/erase";

const APPLY = process.argv.includes("--apply");
const CLONED = process.argv.includes("--cloned");
const ALLOW_EMPTY = process.argv.includes("--allow-empty-database");
/** App ids are cuids: lowercase letters and digits. */
const APP_ID = /^[a-z0-9]{20,40}$/;

async function folders(path: string): Promise<string[]> {
  try {
    return (await readdir(path, { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name);
  } catch {
    return [];
  }
}

async function isDir(path: string): Promise<boolean> {
  return stat(path).then(
    (s) => s.isDirectory(),
    () => false,
  );
}

function databaseName(): string {
  try {
    const u = new URL(process.env.DATABASE_URL ?? "");
    return `${u.hostname}:${u.port || "5432"}${u.pathname}`;
  } catch {
    return "(DATABASE_URL isn't set)";
  }
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  try {
    const projects = await db.project.findMany({ select: { id: true, slug: true } });
    const ids = new Set(projects.map((p) => p.id));
    const slugs = new Set(projects.map((p) => p.slug));
    const root = nativeDataRoot();
    console.log(`database: ${databaseName()} (${projects.length} apps)`);
    console.log(`private uploads: ${root}`);

    // 1. Schemas.
    const schemaRows = await pool.query<{ name: string; tables: string }>(
      `SELECT n.nspname AS name, (SELECT count(*) FROM information_schema.tables t WHERE t.table_schema = n.nspname)::bigint AS tables
         FROM pg_namespace n WHERE n.nspname ~ '^proj_[a-z0-9]+$' ORDER BY n.nspname`,
    );
    const schemas = schemaRows.rows.filter((r) => !ids.has(r.name.slice("proj_".length)));

    // 2. Phone-app builds and 3. upload keys.
    const builds: string[] = [];
    for (const name of await folders(root)) {
      if (APP_ID.test(name) && !ids.has(name) && (await isDir(join(root, name, "native")))) builds.push(name);
    }
    const keys = (await folders(join(root, ".signing"))).filter((name) => APP_ID.test(name) && !ids.has(name));

    // 4. Copied websites (only with --cloned).
    const cloned: string[] = [];
    if (CLONED) {
      for (const name of await folders(clonedAssetsRoot())) {
        if (CLONED_FOLDER.test(name) && !slugs.has(name) && !(await clonedFolderInUse(name, null))) cloned.push(name);
      }
    }

    console.log(`\n${schemas.length} app database schema(s) with no app:`);
    for (const s of schemas) console.log(`  - ${s.name} (${s.tables} tables)`);
    console.log(`${builds.length} phone-app build folder(s) with no app:`);
    for (const b of builds) console.log(`  - ${join(root, b)}`);
    console.log(`${keys.length} upload-key folder(s) with no app:`);
    for (const k of keys) console.log(`  - ${join(root, ".signing", k)}`);
    if (CLONED) {
      console.log(`${cloned.length} copied-website folder(s) nothing uses:`);
      for (const c of cloned) console.log(`  - ${join(clonedAssetsRoot(), c)}`);
    } else {
      console.log("(copied-website folders not checked; add --cloned to include them)");
    }

    const total = schemas.length + builds.length + keys.length + cloned.length;
    if (!APPLY) {
      console.log(`\nreport only: re-run with --apply to move ${total} item(s) to the trash (removed for good after 7 days)`);
      return;
    }
    if (!total) return;
    if (projects.length === 0 && !ALLOW_EMPTY) {
      console.error("\nRefusing to apply: this database has no apps at all, so everything looks left over. Check DATABASE_URL, or pass --allow-empty-database.");
      process.exitCode = 1;
      return;
    }

    const dest = join(trashRoot(), trashDay(), "orphans");
    let done = 0;
    for (const s of schemas) {
      const to = await renameSchemaToTrash(s.name.slice("proj_".length));
      if (to) {
        console.log(`  renamed ${s.name} -> ${to}`);
        done++;
      }
    }
    for (const b of builds) {
      console.log(`  moved ${join(root, b)} -> ${await moveFolder(join(root, b), join(dest, `native-${b}`))}`);
      done++;
    }
    for (const k of keys) {
      console.log(`  moved ${join(root, ".signing", k)} -> ${await moveFolder(join(root, ".signing", k), join(dest, `signing-${k}`))}`);
      done++;
    }
    for (const c of cloned) {
      console.log(`  moved ${join(clonedAssetsRoot(), c)} -> ${await moveFolder(join(clonedAssetsRoot(), c), join(dest, `cloned-${c}`))}`);
      done++;
    }
    console.log(`\nmoved ${done} item(s) to the trash`);
  } finally {
    await pool.end().catch(() => {});
    await db.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
