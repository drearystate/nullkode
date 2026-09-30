/**
 * One-time upgrade for apps made from an original template before its photos
 * moved into the generated image library. Those apps still point at
 * /templates/originals/<template>/<file>.webp, a folder that no longer ships,
 * so the pictures show as broken. Installed template pages are copies and
 * published versions are frozen snapshots, so fixing the templates only
 * helps new apps.
 *
 * Each old path is swapped for its generated picture, exactly as
 * withGeneratedTemplateImages() maps it (all 134 old template pictures).
 * Only values that contain '/templates/originals/' are read or written;
 * anything else, including customer uploads, is never touched. An old path
 * with no known replacement is listed and left as it is. Safe to re-run: a
 * value that has been upgraded no longer contains an old path.
 *
 * Looks in:
 *  - draft pages (HTML, CSS and the editor's saved copy of the page);
 *  - every published version (current and older ones you can roll back to),
 *    keeping its fingerprint in step so the app doesn't look changed;
 *  - flows, app themes, module settings, and Designer files and versions;
 *  - every app's own data tables (the proj_<id> schemas), text and JSON
 *    columns only.
 *
 * Reports only (the default, or --dry-run); changes nothing unless run with
 * --apply:
 *   DATABASE_URL=… node_modules/.bin/tsx scripts/upgrade-template-images.ts [--dry-run|--apply]
 * A running server caches published versions in memory: restart it after
 * --apply (or run this before the restart that deploys the new version).
 */
import { db } from "../src/lib/db";
import { withGeneratedTemplateImages } from "../src/lib/assets/generated";
import { contentHash, type Snapshot } from "../src/lib/deployments";

const apply = process.argv.includes("--apply");
if (apply && process.argv.includes("--dry-run")) {
  console.error("Choose one: --dry-run or --apply.");
  process.exit(2);
}

const OLD_LIKE = "%/templates/originals/%";
const OLD_PATH_SQL = String.raw`/templates/originals/[\w-]+/[\w-]+\.webp`;
const OLD_PATH_RE = new RegExp(OLD_PATH_SQL, "g");
const SCHEMA_NAME = /^proj_[a-z0-9]+$/;
const TEXT_TYPES = new Set(["text", "character varying", "json", "jsonb"]);

const qident = (name: string) => `"${name.replace(/"/g, '""')}"`;

type Result = { where: string; rows: number; unmapped: Set<string> };
const results: Result[] = [];
const unmappedAll = new Set<string>();

function report(r: Result) {
  results.push(r);
  for (const p of r.unmapped) unmappedAll.add(p);
  if (r.rows || r.unmapped.size) {
    const extra = r.unmapped.size ? ` (${r.unmapped.size} old path(s) with no replacement left as they are)` : "";
    console.log(`  ${r.where}: ${r.rows} row(s) ${apply ? "updated" : "to update"}${extra}`);
  }
}

/**
 * Swap old paths in one text or JSON column, in the database, for rows that
 * contain a mapped old path. Returns the number of rows (to be) changed.
 */
async function upgradeColumn(schema: string, table: string, column: string, type: string, extraWhere = ""): Promise<void> {
  const where = `${schema === "public" ? "" : `${schema}.`}${table}.${column}`;
  const col = `${qident(column)}`;
  const asText = type === "json" || type === "jsonb" ? `${col}::text` : col;
  const from = `${qident(schema)}.${qident(table)}`;
  const filter = `${asText} LIKE $1${extraWhere ? ` AND ${extraWhere}` : ""}`;

  const found = await db.$queryRawUnsafe<Array<{ path: string }>>(
    `SELECT DISTINCT m[1] AS path FROM ${from}, regexp_matches(${asText}, '(${OLD_PATH_SQL})', 'g') AS m WHERE ${filter}`,
    OLD_LIKE,
  );
  const unmapped = new Set<string>();
  const pairs: Array<[string, string]> = [];
  for (const { path } of found) {
    const to = withGeneratedTemplateImages(path);
    if (to === path) unmapped.add(path);
    else pairs.push([path, to]);
  }
  if (!pairs.length) return report({ where, rows: 0, unmapped });

  // $1 is the LIKE filter; old/new pairs follow as $2/$3, $4/$5, …
  const params: string[] = [OLD_LIKE];
  let expr = asText;
  const hits: string[] = [];
  for (const [from_, to] of pairs) {
    params.push(from_, to);
    const a = params.length - 1;
    const b = params.length;
    expr = `replace(${expr}, $${a}, $${b})`;
    hits.push(`strpos(${asText}, $${a}) > 0`);
  }
  const cond = `${filter} AND (${hits.join(" OR ")})`;
  let rows: number;
  if (apply) {
    const value = type === "json" || type === "jsonb" ? `(${expr})::${type}` : expr;
    rows = await db.$executeRawUnsafe(`UPDATE ${from} SET ${col} = ${value} WHERE ${cond}`, ...params);
  } else {
    const [{ n }] = await db.$queryRawUnsafe<Array<{ n: bigint }>>(`SELECT count(*) AS n FROM ${from} WHERE ${cond}`, ...params);
    rows = Number(n);
  }
  report({ where, rows, unmapped });
}

/** Published versions: swap paths in the snapshot and keep its fingerprint in step. */
async function upgradeDeployments(): Promise<void> {
  const ids = await db.$queryRawUnsafe<Array<{ id: string }>>(`SELECT id FROM "Deployment" WHERE snapshot::text LIKE $1`, OLD_LIKE);
  let rows = 0;
  const unmapped = new Set<string>();
  for (const { id } of ids) {
    const dep = await db.deployment.findUnique({ where: { id }, select: { snapshot: true } });
    if (!dep) continue;
    const before = JSON.stringify(dep.snapshot);
    const after = withGeneratedTemplateImages(before);
    for (const m of after.matchAll(OLD_PATH_RE)) unmapped.add(m[0]);
    if (after === before) continue;
    const snap = JSON.parse(after) as Snapshot;
    const old = JSON.parse(before) as Snapshot;
    // Recompute the fingerprint only when it matched the old content, so an
    // app that was up to date with its live version still is.
    if (Array.isArray(old.pages) && old.hash && old.hash === contentHash({ pages: old.pages, flows: old.flows ?? [], theme: old.theme })) {
      snap.hash = contentHash({ pages: snap.pages, flows: snap.flows ?? [], theme: snap.theme });
    }
    rows++;
    if (apply) await db.deployment.update({ where: { id }, data: { snapshot: snap as unknown as object } });
  }
  report({ where: "Deployment.snapshot (published versions)", rows, unmapped });
}

async function main() {
  console.log(`Old template picture paths → generated library${apply ? "" : " (report only; add --apply to change them)"}`);

  console.log("Platform tables:");
  await upgradeColumn("public", "Page", "html", "text");
  await upgradeColumn("public", "Page", "css", "text");
  await upgradeColumn("public", "Page", "components", "jsonb");
  await upgradeColumn("public", "Page", "styles", "jsonb");
  await upgradeDeployments();
  await upgradeColumn("public", "Flow", "graph", "jsonb");
  await upgradeColumn("public", "Project", "theme", "jsonb");
  await upgradeColumn("public", "ProjectModule", "config", "jsonb");
  await upgradeColumn("public", "DesignerFile", "content", "text", `"kind"::text IN ('HTML', 'JSX', 'TSX', 'CSS', 'JS', 'MARKDOWN', 'TEXT', 'DESIGN_SYSTEM')`);
  await upgradeColumn("public", "DesignerSnapshot", "artifactSource", "text");
  await upgradeColumn("public", "DesignerSnapshot", "files", "jsonb");

  // Apps' own data (only the built-in proj_<id> schemas; deleted apps'
  // trash_proj_* schemas and outside databases are left alone).
  const columns = await db.$queryRawUnsafe<Array<{ s: string; t: string; c: string; type: string }>>(
    `SELECT c.table_schema AS s, c.table_name AS t, c.column_name AS c, c.data_type AS type
       FROM information_schema.columns c
       JOIN information_schema.tables t ON t.table_schema = c.table_schema AND t.table_name = c.table_name AND t.table_type = 'BASE TABLE'
      WHERE c.table_schema LIKE 'proj\\_%'
      ORDER BY 1, 2, 3`,
  );
  const appColumns = columns.filter((col) => SCHEMA_NAME.test(col.s) && TEXT_TYPES.has(col.type));
  const schemas = new Set(appColumns.map((col) => col.s));
  console.log(`App data (${schemas.size} app schema(s), ${appColumns.length} text/JSON column(s)):`);
  for (const col of appColumns) await upgradeColumn(col.s, col.t, col.c, col.type);

  const total = results.reduce((n, r) => n + r.rows, 0);
  const places = results.filter((r) => r.rows).length;
  console.log(`\n${total} row(s) in ${places} place(s) ${apply ? "updated" : "would be updated"}.`);
  if (unmappedAll.size) {
    console.log(`${unmappedAll.size} old path(s) have no generated replacement and were left as they are:`);
    for (const p of [...unmappedAll].slice(0, 30)) console.log(`  ${p}`);
  }
  if (apply && total) console.log("Restart the server so published versions are reloaded.");
  await db.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await db.$disconnect();
  process.exit(1);
});
