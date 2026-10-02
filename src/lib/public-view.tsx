import { notFound, redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import type { Project } from "@prisma/client";
import { queryString, redirectToPrimary } from "@/lib/app-hosts";
import { appIconUrl } from "@/lib/app-icon";
import { appDocumentParts, liveLanguages, renderPublicPage, RUNTIME_JS, publicBootScript, PlatformStylesheets } from "@/lib/public-page";
import { pwaBootScript } from "@/lib/pwa";
import { buildMetadata, primaryUrl } from "@/lib/seo";
import { documentMarkup } from "@/lib/design-studio/document-split";
import { APP_LANG_COOKIE } from "@/lib/app-locale";
import { languageOfSlug } from "@/lib/app-translations";
import { isLocale, matchLocale, type Locale } from "@/i18n/locales";

/**
 * A published app's page, shared by its addresses: /app/<slug>/… on the
 * platform and <its own domain>/…. The path after the app's base is
 * `segments`: [] (home), [page], or, in a multilingual app, [language]
 * (that language's home) and [language, page].
 *
 * Multilingual apps: an address without a language shows the visitor's
 * language — their earlier choice (nk-app-lang cookie), else their
 * browser's languages that the app offers — by sending them to its address
 * (/es/…); otherwise the default language. Single-language apps work
 * exactly as before.
 */

type AppProject = Project;

export type AppRoute =
  | { kind: "path"; slug: string }
  | { kind: "host"; host: string };

/** Which page and language an address names, for an app offering `offered` (default first). */
export function pageAddress(segments: string[], offered: Locale[]): { lang: Locale | null; pageSlug?: string } | null {
  if (segments.length > 2) return null;
  const first = segments[0];
  const lang = first && offered.length > 1 ? languageOfSlug(first) : null;
  const inLang = lang && offered.includes(lang) ? lang : null;
  if (segments.length === 2) return inLang ? { lang: inLang, pageSlug: segments[1] } : null;
  if (segments.length === 1) return inLang ? { lang: inLang } : { lang: null, pageSlug: first };
  return { lang: null };
}

/** The visitor's language among the ones an app offers: their choice, else their browser's, else the default. */
export async function visitorLanguage(offered: Locale[], fallback: Locale): Promise<Locale> {
  const chosen = (await cookies()).get(APP_LANG_COOKIE)?.value;
  if (isLocale(chosen) && offered.includes(chosen)) return chosen;
  const header = (await headers()).get("accept-language") ?? "";
  const tags = header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = Number(params.find((p) => p.trim().startsWith("q="))?.split("=")[1] ?? 1);
      return { tag, q: Number.isFinite(q) ? q : 0 };
    })
    .filter((t) => t.tag && t.q > 0)
    .sort((a, b) => b.q - a.q);
  for (const { tag } of tags) {
    const m = matchLocale(tag);
    if (m && offered.includes(m)) return m;
  }
  return fallback;
}

/** Metadata (title, canonical, hreflang alternates…) for a published page address. */
export async function publicPageMetadata(project: Parameters<typeof buildMetadata>[0], segments: string[]) {
  const { offered } = await liveLanguages(project.id);
  const address = pageAddress(segments, offered);
  if (!address) return { title: "Not found" };
  return buildMetadata(project, address.pageSlug, address.lang);
}

export async function PublicAppPage({
  project,
  route,
  segments,
  searchParams,
}: {
  project: AppProject;
  route: AppRoute;
  segments: string[];
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const base = route.kind === "path" ? `/app/${route.slug}` : "";
  const search = queryString(searchParams);
  const path = segments.length ? `/${segments.map(encodeURIComponent).join("/")}` : "/";
  // Page loads move to the app's own address (its custom domain, or its
  // origin under the apps domain) when it has one.
  await redirectToPrimary(project, await primaryUrl(project), route.kind === "path" ? { route: "path", path, search } : { route: "host", requestHost: route.host, path, search });

  const { app, offered } = await liveLanguages(project.id);
  const address = pageAddress(segments, offered);
  if (!address) notFound();
  if (!address.lang && offered.length > 1) {
    const lang = await visitorLanguage(offered, app.locale);
    if (lang !== app.locale) redirect(`${base}/${lang}${address.pageSlug ? `/${encodeURIComponent(address.pageSlug)}` : ""}${search}`);
  }

  const page = await renderPublicPage(project.id, base, address.pageSlug, address.lang);
  // AI Designer pages are whole documents: their head goes into metadata and
  // ahead of the body, and the wrapper stays out of their layout.
  // The app's language (window.__nkLocale and the runtime's texts) is set
  // before the page's own scripts run.
  const { doc, docAttrs, localeScript } = appDocumentParts(page.html, page.appLocale, page.pageLanguage);
  const themeColor =
    (project.theme as { primary?: string } | null)?.primary ?? "#0b0b0b";
  const swPath = route.kind === "path" ? `/app/${route.slug}/sw.js` : "/sw.js";
  const swScope = route.kind === "path" ? `/app/${route.slug}/` : "/";

  return (
    <>
      {/* Designer apps bring their own complete CSS: no platform sheets. */}
      <PlatformStylesheets designerApp={project.kind === "DESIGNER"} themeHref={`/api/projects/${project.id}/theme.css?live=1`} />
      <link rel="manifest" href={route.kind === "path" ? `/app/${route.slug}/manifest.webmanifest` : "/manifest.webmanifest"} />
      <meta name="theme-color" content={themeColor} />
      <link rel="apple-touch-icon" href={appIconUrl(project, 180)} />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-title" content={project.name} />
      <style dangerouslySetInnerHTML={{ __html: page.css }} />
      <script dangerouslySetInnerHTML={{ __html: localeScript }} />
      {docAttrs && <script dangerouslySetInnerHTML={{ __html: docAttrs }} />}
      <div suppressHydrationWarning style={doc.isDocument ? { display: "contents" } : undefined} dangerouslySetInnerHTML={{ __html: documentMarkup(doc) }} />
      <script dangerouslySetInnerHTML={{ __html: publicBootScript(project.id, base, page.pageSlugs) }} />
      <script dangerouslySetInnerHTML={{ __html: RUNTIME_JS }} />
      <script
        dangerouslySetInnerHTML={{
          __html: pwaBootScript(swPath, swScope),
        }}
      />
    </>
  );
}

/** The language a published app's address names (for the layout's <html lang dir>). */
export async function addressLanguage(projectId: string, route: AppRoute): Promise<Locale | null> {
  const path = (await headers()).get("x-nk-path") ?? "";
  const rest = route.kind === "path" ? path.replace(new RegExp(`^/app/${route.slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?=/|$)`), "") : path;
  const first = rest.split("/")[1];
  if (!first) return null;
  const { offered } = await liveLanguages(projectId);
  const lang = offered.length > 1 ? languageOfSlug(decodeURIComponent(first)) : null;
  return lang && offered.includes(lang) ? lang : null;
}
