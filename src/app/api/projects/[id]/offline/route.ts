import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { json } from "@/lib/utils";
import { themeToCss, type ProjectTheme } from "@/lib/theme";
import { readPublicAsset, referencedAssets, rewriteAssets } from "@/lib/bundle-assets";
import { RUNTIME_JS, publicBootScript, pageRequiresAuth } from "@/lib/public-page";
import { Pool } from "pg";
import JSZip from "jszip";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Fully offline bundle of a published app. Unzip anywhere (Desktop, C:\,
 * a USB stick), open index.html — no server, no internet:
 *
 *   <slug>.html   every page as a complete standalone document with all
 *                 CSS inlined (Bootstrap + design system + theme + page)
 *   index.html    copy of the home page
 *   assets/       every uploaded file, with page references rewritten
 *   README.txt    what works offline and what doesn't
 *
 * Each page embeds the offline runtime (public/nk-offline.js): a browser
 * port of the flow engine running against a localStorage database seeded
 * with a snapshot of the project's tables. Forms save, lists load, auth
 * registers/logs in — all locally. http_request/email/sheets/AI nodes
 * degrade honestly (see nk-offline.js).
 */

function qident(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

// Bootstrap is fetched once per server process and cached — the bundle
// must not reference a CDN, that would break the "no internet" promise.
const BOOTSTRAP_URL =
  "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css";
let bootstrapCssCache: string | null = null;
async function bootstrapCss(): Promise<string> {
  if (bootstrapCssCache) return bootstrapCssCache;
  try {
    const res = await fetch(BOOTSTRAP_URL);
    if (res.ok) bootstrapCssCache = await res.text();
  } catch {
    // Bundle still works, just unstyled Bootstrap-wise. README mentions it.
  }
  return bootstrapCssCache ?? "";
}

/** Inline-safe: prevent an embedded string from closing our <script> tag. */
function scriptSafe(src: string): string {
  return src.replace(/<\/script/gi, "<\\/script");
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const project = await db.project.findUnique({
    where: { id },
    include: {
      pages: { orderBy: { isHome: "desc" } },
      flows: { where: { enabled: true } },
      datasources: { include: { tables: true } },
    },
  });
  if (!project || project.ownerId !== user.id) {
    return json({ error: "Not found" }, { status: 404 });
  }

  const zip = new JSZip();
  const pageSlugs = project.pages.map((p) => p.slug);
  const loginSlug = pageSlugs.includes("login") ? "login" : pageSlugs[0] ?? "index";

  // ── Table snapshot → seed data ─────────────────────────────────
  const seed: Record<string, unknown[]> = {};
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
  try {
    const schema = `proj_${project.id.replace(/[^a-zA-Z0-9_]/g, "")}`;
    for (const ds of project.datasources) {
      for (const t of ds.tables) {
        try {
          const rows = await pool.query(
            `SELECT * FROM ${qident(schema)}.${qident(t.name)} ORDER BY id ASC`
          );
          // Hashed passwords are useless offline (argon2 can't be verified
          // in-browser) and shouldn't ship in a portable file anyway.
          seed[t.name] = rows.rows.map((r: Record<string, unknown>) => {
            const out: Record<string, unknown> = { ...r };
            for (const k of Object.keys(out)) {
              if (/password|_hash$/i.test(k)) out[k] = null;
            }
            return out;
          });
        } catch {
          seed[t.name] = [];
        }
      }
    }
  } finally {
    await pool.end().catch(() => {});
  }

  // ── Images and files the pages use ─────────────────────────────
  // Uploads, template photos and shared assets, found by reading the pages
  // and data (uploads are stored by month, not per app).
  const bundled = new Set<string>();
  for (const path of referencedAssets([...project.pages.flatMap((p) => [p.html, p.css ?? ""]), JSON.stringify(seed)])) {
    const file = await readPublicAsset(path);
    if (!file) continue;
    zip.file(`assets${path}`, file);
    bundled.add(path);
  }
  const offlineSeed = JSON.parse(rewriteAssets(JSON.stringify(seed), bundled, "./assets")) as typeof seed;

  // ── Shared page ingredients ────────────────────────────────────
  const themeData = project.theme as (ProjectTheme & { dark?: ProjectTheme }) | null;
  const themeCss = themeToCss(themeData, themeData?.dark ?? null);
  const [bootstrap, nkPublicCss, nkOfflineJs] = await Promise.all([
    bootstrapCss(),
    readFile(join(process.cwd(), "public", "nk-public.css"), "utf8").catch(() => ""),
    readFile(join(process.cwd(), "public", "nk-offline.js"), "utf8"),
  ]);

  const flowsPayload = project.flows.map((f) => ({ id: f.id, graph: f.graph }));

  function rewriteHtml(html: string): string {
    let out = html;
    // Images and files → the bundle's assets/ folder.
    out = rewriteAssets(out, bundled, "./assets");
    // Internal page links → local .html files.
    for (const slug of pageSlugs) {
      out = out.replace(
        new RegExp(`(href=["'])/${slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(["'#?])`, "g"),
        `$1./${slug}.html$2`
      );
    }
    out = out.replace(/(href=["'])\/(["'])/g, "$1./index.html$2");
    return out;
  }

  function buildPage(page: { slug: string; title: string; html: string; css: string }): string {
    // Stored HTML is wrapped in <body>…</body> by the editor export — take
    // the inner content so we control the document shell.
    const inner = page.html.replace(/^\s*<body[^>]*>/i, "").replace(/<\/body>\s*$/i, "");
    const requiresAuth = pageRequiresAuth(page.html);
    const offlineCfg = {
      slug: project!.slug,
      flows: flowsPayload,
      seed: offlineSeed,
      requiresAuth,
      loginSlug,
    };
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${page.title.replace(/</g, "&lt;")}</title>
<style>${bootstrap}</style>
<style>${nkPublicCss}</style>
<style>${themeCss}</style>
<style>${rewriteAssets(page.css ?? "", bundled, "./assets")}</style>
</head>
<body>
${rewriteHtml(inner)}
<script>${publicBootScript(project!.id, "", pageSlugs)}</script>
<script>window.__NK_OFFLINE__=${scriptSafe(JSON.stringify(offlineCfg))};</script>
<script>${scriptSafe(nkOfflineJs)}</script>
<script>${scriptSafe(RUNTIME_JS)}</script>
</body>
</html>`;
  }

  for (const page of project.pages) {
    const doc = buildPage(page);
    zip.file(`${page.slug}.html`, doc);
    if (page.isHome) zip.file("index.html", doc);
  }
  if (!project.pages.some((p) => p.isHome) && project.pages[0]) {
    zip.file("index.html", buildPage(project.pages[0]));
  }

  zip.file(
    "README.txt",
    `${project.name} — offline app (exported from Nullkode ${new Date().toISOString().slice(0, 10)})

HOW TO USE
  1. Keep this folder together (you can move it anywhere — Desktop, C:\\, a USB stick).
  2. Open index.html in any modern browser. That's it — no internet needed.

YOUR DATA
  The app ships with a snapshot of the project's database and stores all
  changes locally in your browser (localStorage). Data persists between
  sessions on the same computer + browser. It does NOT sync anywhere.

WHAT WORKS OFFLINE
  Pages, navigation, forms, data lists, search, games/scripts, sign-up and
  login (accounts created inside the offline app).

WHAT DOESN'T
  - Accounts from the online version: password hashes are not exported, so
    sign up fresh inside the offline app.
  - Emails, Google Sheets, AI features, push notifications, and any flow
    step that calls an external website (unless you happen to be online).
${bootstrap ? "" : "  - NOTE: Bootstrap CSS could not be bundled at export time; layout may look off.\n"}`
  );

  const blob = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  const date = new Date().toISOString().slice(0, 10);
  return new Response(new Uint8Array(blob), {
    headers: {
      "content-type": "application/zip",
      "content-disposition": `attachment; filename="${project.slug}-offline-${date}.zip"`,
      "cache-control": "no-store",
    },
  });
}
