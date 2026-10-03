import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { appDocumentParts, RUNTIME_JS } from "@/lib/public-page";
import { documentMarkup } from "@/lib/design-studio/document-split";
import { withNext } from "@/lib/safe-next";
import { getTranslations } from "next-intl/server";
import { requestLocale } from "@/i18n/request";
import { getAppLocale } from "@/lib/app-locale";
import { isLocale, localeDir } from "@/i18n/locales";

export const dynamic = "force-dynamic";

export default async function PreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string; embed?: string; lang?: string }>;
}) {
  const user = await getCurrentUser();
  const { id } = await params;
  const { page: pageSlug, embed, lang: langParam } = await searchParams;
  // Back to this preview after signing in.
  if (!user) redirect(withNext("/login", `/preview/${encodeURIComponent(id)}${pageSlug ? `?page=${encodeURIComponent(pageSlug)}` : ""}`));
  const isEmbed = embed === "1";

  const project = await db.project.findFirst({
    where: { id, ownerId: user.id },
  });
  if (!project) notFound();

  // Preview always shows the draft (the latest edits). Visitors keep seeing
  // the published version until the owner publishes again.
  const liveVersion = project.liveDeploymentId
    ? (await db.deployment.findUnique({ where: { id: project.liveDeploymentId }, select: { version: true } }))?.version ?? null
    : null;

  const allPages = await db.page.findMany({
    where: { projectId: id },
    select: { id: true, slug: true, title: true, html: true, css: true, isHome: true },
  });

  // Build slug map: "login" → "auth-login", "profile" → "auth-profile", etc.
  const slugMap: Record<string, string> = {};
  for (const p of allPages) {
    slugMap[p.slug] = p.slug;
    const dash = p.slug.indexOf("-");
    if (dash > 0) {
      const shortName = p.slug.substring(dash + 1);
      if (!slugMap[shortName]) slugMap[shortName] = p.slug;
    }
  }

  // Resolve current page
  let page = null;
  if (pageSlug) {
    const resolved = slugMap[pageSlug] || pageSlug;
    page = allPages.find((p) => p.slug === resolved) || null;
  }
  if (!page) {
    page = allPages.find((p) => p.isHome) || allPages[0] || null;
  }
  if (!page) notFound();
  const t = await getTranslations({ locale: await requestLocale(), namespace: "apps.preview" });

  // The app's language, like the published app (<html lang dir>, the
  // runtime's texts); a multilingual app's other languages with ?lang=.
  const app = await getAppLocale(id);
  const lang = isLocale(langParam) && langParam !== app.locale && app.locales.includes(langParam) ? langParam : null;
  if (lang) {
    const translated = await db.pageTranslation.findUnique({ where: { pageId_locale: { pageId: page.id, locale: lang } }, select: { title: true, html: true } });
    if (translated) page = { ...page, title: translated.title, html: translated.html };
  }
  const shown = lang ?? app.locale;
  const view = { ...app, locale: shown, dir: localeDir(shown), locales: [shown] };

  const previewBase = `/preview/${id}`;
  // AI Designer pages are whole documents: the same split as the published
  // app (title and lang from their head, head elements ahead of the body).
  const { doc, docAttrs, localeScript } = appDocumentParts(page.html, view);

  return (
    <html lang={app.explicit ? shown : doc.lang ?? "en"} dir={app.explicit ? localeDir(shown) : undefined}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="noindex" />
        <title>{t("title", { title: doc.title ?? page.title })}</title>
        {/* AI Designer apps bring their own complete CSS: no platform sheets. */}
        {project.kind === "DESIGNER" ? null : (
          <>
            <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" />
            <link rel="stylesheet" href="/nk-public.css" />
            <link rel="stylesheet" href={`/api/projects/${id}/theme.css`} />
          </>
        )}
        {page.css && <style dangerouslySetInnerHTML={{ __html: page.css }} />}
      </head>
      <body>
        {/* Set up preview navigation BEFORE runtime loads */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function(){
            window.__nkPreview = true;
            var base = '${previewBase}';
            var lang = ${JSON.stringify(lang ? `&lang=${lang}` : "")};
            var map = ${JSON.stringify(slugMap)};
            // The runtime (RUNTIME_JS) sets its own __nkNavigate for published
            // apps, which leaves "/menu" at the site root here; this one is
            // put back after it loads (below).
            window.__nkPreviewNavigate = window.__nkNavigate = function(path){
              if(!path || path.startsWith('http') || path.startsWith('#') || path.startsWith('mailto:')) {
                window.location.href = path; return;
              }
              // Strip a trailing .html/.htm — the agent writes links like
              // "/inventory.html" but pages are keyed by extensionless slug.
              var slug = path.replace(/^\\//, '').split('?')[0].split('#')[0].replace(/\\.html?$/i, '');
              var resolved = map[slug] || slug;
              window.location.href = base + '?page=' + encodeURIComponent(resolved) + lang;
            };
          })();
        `}} />

        {!isEmbed && <div
          style={{
            position: "fixed",
            bottom: "16px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 99999,
            background: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(12px)",
            color: "#fff",
            padding: "8px 20px",
            borderRadius: "999px",
            fontSize: "13px",
            fontFamily: "system-ui, sans-serif",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
          }}
        >
          <span style={{ opacity: 0.7 }}>{project.published ? (liveVersion ? t("latestLive", { version: liveVersion }) : t("latest")) : t("notPublished")}</span>
          <span style={{ opacity: 0.4 }}>|</span>
          <a
            href={`/projects/${id}#app-admin`}
            style={{ opacity: 0.7, fontSize: "11px", color: "#fff", textDecoration: "underline" }}
          >
            {t("adminLogin")}
          </a>
          <a
            href={`/projects/${id}/pages/${page.id}/edit${lang ? `?lang=${lang}` : ""}`}
            style={{ color: "#a78bfa", fontWeight: 600, textDecoration: "none" }}
          >
            {t("backToEditor")}
          </a>
        </div>}

        <script dangerouslySetInnerHTML={{ __html: localeScript }} />
        {docAttrs && <script dangerouslySetInnerHTML={{ __html: docAttrs }} />}
        <div suppressHydrationWarning style={doc.isDocument ? { display: "contents" } : undefined} dangerouslySetInnerHTML={{ __html: documentMarkup(doc) }} />

        <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js" defer />
        <script dangerouslySetInnerHTML={{ __html: RUNTIME_JS }} />

        {/* Intercept link clicks */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function(){
            if(!window.__nkPreviewNavigate) return;
            window.__nkNavigate = window.__nkPreviewNavigate;
            document.addEventListener('click', function(e){
              var a = e.target.closest('a[href]');
              if(!a) return;
              var href = a.getAttribute('href');
              if(!href || href.startsWith('http') || href.startsWith('#') || href.startsWith('mailto:')) return;
              if(href.startsWith('/')){
                e.preventDefault();
                window.__nkNavigate(href);
              }
            });
          })();
        `}} />
      </body>
    </html>
  );
}
