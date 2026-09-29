import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { json } from "@/lib/utils";
import { themeToCss, type ProjectTheme } from "@/lib/theme";
import { Pool } from "pg";
import JSZip from "jszip";
import { readPublicAsset, referencedAssets } from "@/lib/bundle-assets";

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
 *   assets/<path>        every file under /uploads/<projectId>/
 *
 * Project owner only. Streams the zip with a sensible filename so the
 * browser saves it as `<slug>-export-YYYY-MM-DD.zip`.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
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
    return json({ error: "Not found" }, { status: 404 });
  }

  const zip = new JSZip();
  // Row data, kept to find images it points at.
  const dataTexts: string[] = [];

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
        modules: project.modules.map((m) => ({
          moduleId: m.moduleId,
          version: m.version,
          config: m.config,
        })),
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
          graph: flow.graph,
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
          // Strip password_hash from any users-y table — even a backup zip
          // shouldn't ship hashed passwords; they're regenerable on import.
          const stripped = rows.rows.map((r: Record<string, unknown>) => {
            const out: Record<string, unknown> = { ...r };
            for (const k of Object.keys(out)) {
              if (/^password|_hash$/i.test(k)) out[k] = null;
            }
            return out;
          });
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
  zip.file("README.md", readme(project.name, project.slug));

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


function readme(name: string, slug: string): string {
  return `# ${name}

This is a portable backup of your Nullkode app **${name}** (\`${slug}\`).
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
    - Password hashes are scrubbed from any user tables.
- **assets/** — files you uploaded (images, etc.), mirroring the original folder layout.

## What you can do with it

- **Archive it** — a snapshot of the app as it was on the day of export.
- **Re-import** — bring it back into Nullkode (your account or another instance)
  to restore the app to this state.
- **Read it** — the HTML, CSS, theme, and flow graphs are all human-readable.
  Useful for moving content elsewhere, auditing, or learning how it's wired.

## What this does NOT do

This zip is a *backup*, not a standalone runnable app. The flows are graphs,
not server code — running them needs Nullkode's flow runtime. If you want a
self-hostable version of the app that runs anywhere, that's a separate
export format (coming later).

Exported: ${new Date().toISOString()}
`;
}
