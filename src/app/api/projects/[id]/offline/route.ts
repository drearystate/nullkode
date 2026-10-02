import { getTranslations } from "next-intl/server";
import { requestLocale } from "@/i18n/request";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { json } from "@/lib/utils";
import { themeToCss, type ProjectTheme } from "@/lib/theme";
import { readPublicAsset, referencedAssets, rewriteAssets } from "@/lib/bundle-assets";
import { RUNTIME_JS, publicBootScript, pageRequiresAuth } from "@/lib/public-page";
import { getAppLocale, localeBootScript } from "@/lib/app-locale";
import { getRequestBrand } from "@/lib/reseller";
import { newRedactionReport, redactFlowGraph, redactModuleConfig, redactRow } from "@/lib/export-secrets";
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
 *
 * The bundle is a file people share, so it carries no private keys (secret
 * module settings and the flow steps they were copied into are blanked, see
 * src/lib/export-secrets.ts) and no passwords, hashes, secrets or tokens in
 * the data. White-label: nothing in it names this platform. The README names
 * the owner's brand, and the inlined stylesheet and scripts lose their
 * header comments.
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

/** Inline-safe CSS: a stylesheet can't close our <style> tag. */
function styleSafe(src: string): string {
  return src.replace(/<\/style/gi, "<\\/style");
}

/** Drops a file's leading block comment (its header), which names where the file comes from. */
function withoutHeaderComment(src: string): string {
  return src.replace(/^\uFEFF?\s*\/\*[\s\S]*?\*\/\s*/, "");
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  const t = await getTranslations({ locale: await requestLocale(), namespace: "project.offlineApi" });
  if (!user) return new Response(t("unauthorized"), { status: 401 });

  const project = await db.project.findUnique({
    where: { id },
    include: {
      pages: { orderBy: { isHome: "desc" } },
      flows: { where: { enabled: true } },
      datasources: { include: { tables: true } },
      modules: { select: { config: true } },
    },
  });
  if (!project || project.ownerId !== user.id) {
    return json({ error: t("notFound") }, { status: 404 });
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
          // in-browser), and no password, secret or token should ship in a
          // portable file anyway.
          seed[t.name] = rows.rows.map((r: Record<string, unknown>) => redactRow(r));
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
  const [bootstrap, nkPublicCss, nkOfflineJs, { brand }] = await Promise.all([
    bootstrapCss(),
    readFile(join(process.cwd(), "public", "nk-public.css"), "utf8").then(withoutHeaderComment).catch(() => ""),
    readFile(join(process.cwd(), "public", "nk-offline.js"), "utf8").then(withoutHeaderComment),
    getRequestBrand(user),
  ]);

  // Private keys stay out of the bundle: steps that need them (payments,
  // SMS, paid APIs) can't work offline anyway.
  const redaction = newRedactionReport();
  const secretValues = new Set<string>();
  for (const m of project.modules) redactModuleConfig(m.config, secretValues, redaction);
  const flowsPayload = project.flows.map((f) => ({ id: f.id, graph: redactFlowGraph(f.graph, secretValues, redaction) }));

  // The app's language (lib/app-locale.ts): <html lang dir> and the runtime's texts.
  // The bundle is the default language only (its pages are local files).
  const appLocale = await getAppLocale(project!.id);
  const htmlAttrs = appLocale.explicit ? `lang="${appLocale.locale}" dir="${appLocale.dir}"` : `lang="en"`;

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
<html ${htmlAttrs}>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${page.title.replace(/</g, "&lt;")}</title>
<style>${styleSafe(bootstrap)}</style>
<style>${styleSafe(nkPublicCss)}</style>
<style>${styleSafe(themeCss)}</style>
<style>${styleSafe(rewriteAssets(page.css ?? "", bundled, "./assets"))}</style>
</head>
<body>
<script>${localeBootScript({ ...appLocale, locales: [appLocale.locale] })}</script>
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
    t("readme", { name: project.name, brand: brand.appName, date: new Date().toISOString().slice(0, 10) }) +
      (redaction.removed > 0 ? t("readmeKeysLeftOut") : "") +
      (bootstrap ? "" : t("readmeNoBootstrap")),
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
