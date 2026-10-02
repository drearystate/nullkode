import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { json } from "@/lib/utils";
import { themeToCss, type ProjectTheme } from "@/lib/theme";
import { Pool } from "pg";
import JSZip from "jszip";
import { readPublicAsset, referencedAssets } from "@/lib/bundle-assets";
import { getRequestBrand } from "@/lib/reseller";
import { newRedactionReport, redactFlowGraph, redactModuleConfig, redactRow } from "@/lib/export-secrets";
import { getTranslations } from "next-intl/server";
import { requestLocale } from "@/i18n/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Portable backup zip of a project. Contains everything needed to
 * understand, archive, or re-import the project:
 *
 *   project.json         meta, theme, modules installed
 *   theme.css            rendered project theme stylesheet
 *   README.md            what's in here + how to use
 *   pages/<slug>.html    each page's raw HTML
 *   pages/<slug>.css     each page's CSS (only if non-empty)
 *   flows/<slug>.json    each flow's graph + http config
 *   tables/<name>.schema.json  declared columns
 *   tables/<name>.rows.json    snapshot of every row in the table
 *   assets/<path>        every uploaded image or file the pages or data use
 *
 * Private keys never leave in the zip: secret module settings (Stripe
 * secret, SMS token, API keys) are blanked in project.json and in the flow
 * steps they were copied into, and password, hash, secret and token columns
 * are emptied in the table rows (see src/lib/export-secrets.ts). The README
 * says so, so the owner knows to enter the keys again after an import.
 *
 * White-label: the README names the owner's brand (their reseller's for a
 * reseller's clients), never this platform.
 *
 * Project owner only. Streams the zip with a sensible filename so the
 * browser saves it as `<slug>-export-YYYY-MM-DD.zip`.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  const tr = await getTranslations({ locale: await requestLocale(), namespace: "project.exportApi" });
  if (!user) return new Response(tr("unauthorized"), { status: 401 });
  const project = await db.project.findUnique({
    where: { id },
    include: {
      pages: { orderBy: [{ isHome: "desc" }, { createdAt: "asc" }] },
      flows: true,
      datasources: { include: { tables: true } },
      modules: true,
    },
  });
  if (!project || project.ownerId !== user.id) {
    return json({ error: tr("notFound") }, { status: 404 });
  }

  const zip = new JSZip();
  // Row data, kept to find images it points at.
  const dataTexts: string[] = [];
  const { brand } = await getRequestBrand(user);

  // Private keys: blanked in the module settings, and wherever the flows
  // copied them.
  const redaction = newRedactionReport();
  const secretValues = new Set<string>();
  const modules = project.modules.map((m) => ({
    moduleId: m.moduleId,
    version: m.version,
    config: redactModuleConfig(m.config, secretValues, redaction),
  }));

  // ── Meta ─────────────────────────────────────────────────────
  zip.file(
    "project.json",
    JSON.stringify(
      {
        id: project.id,
        slug: project.slug,
        name: project.name,
        description: project.description,
        theme: project.theme,
        icon: project.icon,
        published: project.published,
        modules,
        // Page order, titles and the home page, so the app can be imported
        // again exactly as it was (the files in pages/ are keyed by slug).
        pages: project.pages.map((p) => ({ slug: p.slug, title: p.title, isHome: p.isHome, file: sanitize(p.slug || "page") })),
        // Flows are referenced from pages and from each other by id, and
        // table steps by data source id; the importer remaps both.
        datasources: project.datasources.map((d) => ({ id: d.id, name: d.name, kind: d.kind, tables: d.tables.map((t) => t.name) })),
        exportedAt: new Date().toISOString(),
        schemaVersion: 2,
      },
      null,
      2,
    ),
  );

  // ── Theme CSS ────────────────────────────────────────────────
  const themeData = project.theme as (ProjectTheme & { dark?: ProjectTheme }) | null;
  zip.file("theme.css", themeToCss(themeData, themeData?.dark ?? null));

  // ── Pages ────────────────────────────────────────────────────
  for (const page of project.pages) {
    const safe = sanitize(page.slug || "page");
    zip.file(`pages/${safe}.html`, page.html);
    if (page.css && page.css.trim()) {
      zip.file(`pages/${safe}.css`, page.css);
    }
  }

  // ── Flows ────────────────────────────────────────────────────
  for (const flow of project.flows) {
    const safe = sanitize(flow.slug);
    zip.file(
      `flows/${safe}.json`,
      JSON.stringify(
        {
          id: flow.id,
          slug: flow.slug,
          name: flow.name,
          trigger: flow.trigger,
          httpPath: flow.httpPath,
          httpMethod: flow.httpMethod,
          schedule: flow.schedule,
          enabled: flow.enabled,
          graph: redactFlowGraph(flow.graph, secretValues, redaction),
        },
        null,
        2,
      ),
    );
  }

  // ── Tables ───────────────────────────────────────────────────
  // Pull rows directly from the project's Postgres schema so the export is
  // a true snapshot — not just the column definitions.
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
  try {
    const schema = `proj_${project.id.replace(/[^a-zA-Z0-9_]/g, "")}`;
    for (const ds of project.datasources) {
      for (const t of ds.tables) {
        const safe = sanitize(t.name);
        zip.file(
          `tables/${safe}.schema.json`,
          JSON.stringify({ name: t.name, schema: t.schema }, null, 2),
        );
        try {
          const rows = await pool.query(
            `SELECT * FROM ${qident(schema)}.${qident(t.name)} ORDER BY id ASC`,
          );
          // No passwords, password hashes, secrets or tokens — even a
          // backup zip shouldn't ship them; people sign up again or reset.
          const stripped = rows.rows.map((r: Record<string, unknown>) => redactRow(r));
          const rowsJson = JSON.stringify(stripped, null, 2);
          dataTexts.push(rowsJson);
          zip.file(`tables/${safe}.rows.json`, rowsJson);
        } catch (err) {
          // Table missing in Postgres (rare — metadata-only) — skip rows.
          zip.file(
            `tables/${safe}.rows.json`,
            JSON.stringify({ error: (err as Error).message }, null, 2),
          );
        }
      }
    }
  } finally {
    await pool.end();
  }

  // ── Images and files ─────────────────────────────────────────
  // Every uploaded image, template photo or shared asset the pages or data
  // point at, stored under assets/ at its original path (e.g.
  // assets/uploads/202609/photo.png for /uploads/202609/photo.png).
  for (const path of referencedAssets([...project.pages.flatMap((p) => [p.html, p.css ?? ""]), ...dataTexts])) {
    const file = await readPublicAsset(path);
    if (file) zip.file(`assets${path}`, file);
  }

  // ── README ───────────────────────────────────────────────────
  zip.file("README.md", readme(project.name, project.slug, brand.appName, redaction.removed > 0));

  const buffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  const filename = `${sanitize(project.slug || project.id)}-export-${new Date().toISOString().slice(0, 10)}.zip`;

  return new Response(buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      "content-type": "application/zip",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
}

function sanitize(name: string): string {
  return name.replace(/[^a-zA-Z0-9_.-]/g, "_").slice(0, 120) || "untitled";
}

function qident(name: string): string {
  return '"' + name.replace(/"/g, '""') + '"';
}


function readme(name: string, slug: string, brandName: string, secretsRemoved: boolean): string {
  return `# ${name}

This is a portable backup of your ${brandName} app **${name}** (\`${slug}\`).
It contains everything you built — pages, flows, data, theme, assets — in
plain files you can read, archive, or re-import later.

## What's in here

- **project.json** — name, slug, theme JSON, installed modules.
- **theme.css** — the rendered stylesheet that drives the look of every page.
- **pages/** — one \`.html\` (and optional \`.css\`) per page, keyed by slug.
- **flows/** — one \`.json\` per flow with the graph (nodes + edges) and HTTP config.
- **tables/** — for every data table:
    - \`<name>.schema.json\` — declared column definitions.
    - \`<name>.rows.json\` — snapshot of every row at export time.
    - Passwords, password hashes, secrets and tokens are left out of the rows.
- **assets/** — files you uploaded (images, etc.), mirroring the original folder layout.
${secretsRemoved ? `
## Private keys

Secrets were removed; re-enter them after import. Private keys you added to
features (for example a Stripe secret key, an SMS token or an API key) are
left out of this file, so it is safe to store and share. After you import
the app, open those features and type the keys in again.
` : ""}
## What you can do with it

- **Archive it** — a snapshot of the app as it was on the day of export.
- **Re-import** — bring it back into ${brandName} (your account or another instance)
  to restore the app to this state.
- **Read it** — the HTML, CSS, theme, and flow graphs are all human-readable.
  Useful for moving content elsewhere, auditing, or learning how it's wired.

## What this does NOT do

This zip is a *backup*, not a standalone runnable app. The flows are graphs,
not server code — running them needs ${brandName}'s flow runtime. If you want a
copy of the app that runs without a server, download the offline version
from the Publish tab.

Exported: ${new Date().toISOString()}
`;
}
