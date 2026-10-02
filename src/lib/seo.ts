import { cache } from "react";
import { createHash } from "node:crypto";
import type { Metadata } from "next";
import type { Project } from "@prisma/client";
import { load } from "cheerio";
import { db } from "./db";
import { appOrigin } from "./app-hosts";
import { publicBaseUrlFor } from "./reseller";
import { liveSnapshot } from "./deployments";
import { liveLanguages, loadPublicPage, loadTranslation, pageRequiredRole, pageRequiresAuth } from "./public-page";
import { getSetting, setSetting } from "./settings";
import { appIconUrl } from "./app-icon";
import { splitDesignerDocument } from "./design-studio/document-split";

/**
 * Search engines and link previews for published apps.
 *
 * Every app has one primary address (primaryUrl) that the canonical link,
 * og:url, the sitemap and the redirects in app-hosts.ts all point to. Page
 * titles and descriptions come from the LIVE version (the published
 * snapshot), never the draft, so an unpublished edit doesn't leak into
 * search results. The owner's "Hide from search engines" switch and Google
 * Search Console code live in Setting `seo:<projectId>`, and take effect
 * straight away (no publish needed).
 */

export type SeoProject = Pick<Project, "id" | "slug" | "ownerId" | "name" | "description" | "icon" | "theme" | "published" | "liveDeploymentId"> & { hostLabel?: string | null };

/* ── The app's one address ─────────────────────────────────────────────── */

export type PrimaryAddress = {
  kind: "domain" | "label" | "path";
  /** "https://shop.example.com" */
  origin: string;
  /** "shop.example.com" */
  host: string;
  /** Home page address without a trailing slash: the origin, or origin + "/app/<slug>". */
  base: string;
};

/**
 * The app's primary public address, in appPublicUrl's order: its first
 * active custom domain, then <label>.<APPS_DOMAIN>, then /app/<slug> on the
 * owner's platform address (their reseller's domain for reseller clients).
 * Looked up once per render for the same project object (metadata and page).
 */
export const primaryUrl = cache(primaryAddress);

async function primaryAddress(project: { id: string; slug: string; ownerId: string; hostLabel?: string | null }): Promise<PrimaryAddress> {
  const domain = await db.domain.findFirst({ where: { projectId: project.id, status: "ACTIVE" }, orderBy: { createdAt: "asc" }, select: { host: true } });
  if (domain) {
    const host = domain.host.toLowerCase();
    return { kind: "domain", origin: `https://${host}`, host, base: `https://${host}` };
  }
  const hostLabel = project.hostLabel !== undefined
    ? project.hostLabel
    : (await db.project.findUnique({ where: { id: project.id }, select: { hostLabel: true } }))?.hostLabel ?? null;
  const origin = await appOrigin({ id: project.id, slug: project.slug, hostLabel });
  if (origin) return { kind: "label", origin, host: new URL(origin).hostname, base: origin };
  const owner = await db.user.findUnique({ where: { id: project.ownerId }, select: { id: true, role: true, resellerId: true } });
  const platform = (await publicBaseUrlFor(owner)).replace(/\/+$/, "");
  const url = new URL(platform);
  return { kind: "path", origin: url.origin, host: url.hostname, base: `${platform}/app/${project.slug}` };
}

/** A page's address at the app's primary address (the canonical URL). */
export function pageUrl(primary: PrimaryAddress, page: { slug: string; isHome: boolean } | null, lang?: string | null): string {
  // A multilingual app's other languages live under /<language>.
  const base = lang ? `${primary.base}/${lang}` : primary.base;
  if (!page || page.isHome) return primary.kind === "path" || lang ? base : `${base}/`;
  return `${base}/${encodeURIComponent(page.slug)}`;
}

export function sitemapUrl(primary: PrimaryAddress): string {
  return `${primary.base}/sitemap.xml`;
}

/* ── Owner settings: Setting `seo:<projectId>` ──────────────────────────── */

export type SeoSettings = { noindex: boolean; searchConsoleToken: string | null };

const seoKey = (projectId: string) => `seo:${projectId}`;
const TOKEN_RE = /^[A-Za-z0-9_-]{10,128}$/;

export async function getSeoSettings(projectId: string): Promise<SeoSettings> {
  const raw = await getSetting<Partial<SeoSettings>>(seoKey(projectId)).catch(() => undefined);
  const token = typeof raw?.searchConsoleToken === "string" && TOKEN_RE.test(raw.searchConsoleToken) ? raw.searchConsoleToken : null;
  return { noindex: raw?.noindex === true, searchConsoleToken: token };
}

export async function saveSeoSettings(projectId: string, patch: Partial<SeoSettings>): Promise<SeoSettings> {
  const current = await getSeoSettings(projectId);
  const next: SeoSettings = {
    noindex: patch.noindex ?? current.noindex,
    searchConsoleToken: patch.searchConsoleToken !== undefined ? patch.searchConsoleToken : current.searchConsoleToken,
  };
  await setSetting(seoKey(projectId), next);
  return next;
}

/**
 * The code from Google Search Console's "HTML tag" method. People paste the
 * code itself, the whole <meta> tag, or the DNS record text; all three work.
 * Returns null for an empty value and "invalid" when nothing usable is found.
 */
export function parseSearchConsoleToken(input: string | null | undefined): string | null | "invalid" {
  const text = (input ?? "").trim();
  if (!text) return null;
  const fromTag = /content\s*=\s*["']([^"']+)["']/i.exec(text)?.[1];
  const fromTxt = /google-site-verification\s*[=:]\s*([A-Za-z0-9_-]+)/i.exec(text)?.[1];
  const token = (fromTag ?? fromTxt ?? text).trim();
  return TOKEN_RE.test(token) ? token : "invalid";
}

/* ── What a page says about itself ──────────────────────────────────────── */

/**
 * Pages that shouldn't be in search results: ones behind a sign-in or a role
 * (the require-auth / require-role markers) and sign-in, sign-up, password
 * and admin pages. They're left out of the sitemap and marked noindex.
 */
const PRIVATE_SLUG_RE = /(^|[-_])(login|log-in|logout|log-out|signin|sign-in|signout|sign-out|register|signup|sign-up|admin|forgot|password|verify-email|delete-account)([-_]|$)/i;

export function isPrivatePage(page: { slug: string; html: string }): boolean {
  return pageRequiresAuth(page.html) || pageRequiredRole(page.html) !== null || PRIVATE_SLUG_RE.test(page.slug);
}

// Menus, forms, footers, hidden parts and data-bound templates don't describe the page.
const SKIP = "nav, footer, form, template, noscript, script, style, [hidden], [aria-hidden='true'], [data-nk-nav], [data-nk-auth], [data-nk-role], [data-nk-bind-flow], [data-nk-item], [data-nk-field]";

type PageFacts = { paragraph: string | null; image: string | null };
const factsMemo = new Map<string, PageFacts>();

/** The first real paragraph and the first real picture of a page's HTML. */
export function pageFacts(html: string): PageFacts {
  const key = createHash("sha1").update(html).digest("base64");
  const hit = factsMemo.get(key);
  if (hit) return hit;
  const $ = load(html, null, false);
  let paragraph: string | null = null;
  let fallback: string | null = null;
  for (const el of $("p").toArray()) {
    const p = $(el);
    if (p.closest(SKIP).length) continue;
    const text = p.text().replace(/\s+/g, " ").trim();
    if (!text) continue;
    fallback ??= text;
    if (text.length >= 20) { paragraph = text; break; }
  }
  let image: string | null = null;
  for (const el of $("img[src]").toArray()) {
    const img = $(el);
    if (img.closest("nav, footer, template, noscript, [hidden], [data-nk-nav], [data-nk-item]").length) continue;
    const src = (img.attr("src") ?? "").trim();
    if (!src || /^data:/i.test(src) || /\.(svg|ico)(?:[?#]|$)/i.test(src) || src.length > 1000) continue;
    // Icons and avatars (width or height under 100) make poor share pictures.
    const w = Number.parseInt(img.attr("width") ?? "", 10);
    const h = Number.parseInt(img.attr("height") ?? "", 10);
    if ((Number.isFinite(w) && w < 100) || (Number.isFinite(h) && h < 100)) continue;
    if (!/^(https?:)?\/\//i.test(src) && !src.startsWith("/")) continue; // relative files don't resolve on every address
    image = src;
    break;
  }
  const facts = { paragraph: truncate(paragraph ?? fallback, 160), image };
  if (factsMemo.size >= 200) factsMemo.delete(factsMemo.keys().next().value!);
  factsMemo.set(key, facts);
  return facts;
}

function truncate(text: string | null, max: number): string | null {
  if (!text) return null;
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,;:.-]+$/, "")}…`;
}

/** An image address as a full URL on the app's own address. */
function absoluteImage(src: string, primary: PrimaryAddress): string | null {
  if (/^https?:\/\//i.test(src)) return src;
  if (src.startsWith("//")) return `https:${src}`;
  if (src.startsWith("/")) return `${primary.origin}${src}`;
  return null;
}

/* ── Share card (the generated og:image) ────────────────────────────────── */

export const CARD_WIDTH = 1200;
export const CARD_HEIGHT = 630;

/** The app's theme colour, checked (it goes into a picture and a URL hash). */
export function themePrimary(theme: unknown): string {
  const raw = (theme as { primary?: unknown } | null)?.primary;
  return typeof raw === "string" && /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(raw.trim()) ? raw.trim().toLowerCase() : "#4f46e5";
}

/** Changes whenever the card would look different, so previews refresh. */
export function cardVersion(name: string, primary: string, icon: string | null): string {
  return createHash("sha1").update(`card-v1|${name}|${primary}|${icon ?? ""}`).digest("hex").slice(0, 12);
}

/** Characters the share card's font can draw (its Latin set). Anything else shows the icon alone. */
const CARD_TEXT_RE = /^[\u0020-\u007e\u00a0-\u00ff\u0131\u0152\u0153\u02bb\u02bc\u02c6\u02da\u02dc\u2002\u2009\u2013\u2014\u2018-\u201a\u201c-\u201e\u2022\u2026\u2032\u2033\u2039\u203a\u2044\u2074\u20ac\u2122\u2212\u2215]+$/;

export function cardCanShowName(name: string): boolean {
  const text = name.normalize("NFC").trim();
  return text.length > 0 && CARD_TEXT_RE.test(text);
}

async function liveTheme(project: Pick<SeoProject, "id" | "theme" | "liveDeploymentId">): Promise<unknown> {
  if (!project.liveDeploymentId) return project.theme;
  const live = await liveSnapshot(project.id);
  return live && live.theme !== undefined ? live.theme : project.theme;
}

export async function shareCardUrl(project: Pick<SeoProject, "id" | "name" | "icon" | "theme" | "liveDeploymentId">, origin: string): Promise<string> {
  const color = themePrimary(await liveTheme(project));
  return `${origin}/api/projects/${project.id}/og?v=${cardVersion(project.name, color, project.icon)}`;
}

/* ── Everything a page's metadata needs ─────────────────────────────────── */

export type PageSeo = {
  title: string;
  description: string | null;
  /** Where the description came from: the Designer page, the app's description, or the page's first paragraph. */
  descriptionSource: "designer" | "project" | "page" | null;
  /** The page's first paragraph, used when the app has no description. */
  pageParagraph: string | null;
  canonical: string;
  siteName: string;
  image: string;
  imageIsCard: boolean;
  /** Not to be indexed: hidden app, unpublished app, or a private page. */
  noindex: boolean;
  hiddenApp: boolean;
  privatePage: boolean;
  searchConsoleToken: string | null;
  lang: string | null;
  primary: PrimaryAddress;
  /** Multilingual apps: the page's address in each language (hreflang), "x-default" the default's. */
  languages: Record<string, string> | null;
};

/** SEO facts for one page of an app (its home page without a slug), read from the live version. */
export async function pageSeo(project: SeoProject, pageSlug?: string, lang?: string | null): Promise<PageSeo | null> {
  const source = await loadPublicPage(project.id, pageSlug);
  if (!source) return null;
  // A multilingual app: the page in the language asked for, and its other addresses.
  const { app, offered } = await liveLanguages(project.id);
  const inLang = lang && lang !== app.locale && offered.includes(lang as never) ? lang : null;
  const translated = inLang ? await loadTranslation(project.id, source.id, inLang) : null;
  const page = translated ? { ...source, title: translated.title, html: translated.html } : source;
  const [primary, settings] = await Promise.all([primaryUrl(project), getSeoSettings(project.id)]);
  const doc = splitDesignerDocument(page.html);
  const facts = pageFacts(doc.bodyHtml);
  const ownDescription = project.description?.replace(/\s+/g, " ").trim() || null;
  const description = doc.description ?? ownDescription ?? facts.paragraph;
  const descriptionSource = doc.description ? "designer" : ownDescription ? "project" : facts.paragraph ? "page" : null;
  const pageImage = (doc.image && absoluteImage(doc.image, primary)) || (facts.image && absoluteImage(facts.image, primary)) || null;
  const privatePage = isPrivatePage(page);
  const pageTitle = page.title?.trim();
  return {
    title: doc.title ?? (page.isHome || !pageTitle ? project.name : `${pageTitle} — ${project.name}`),
    description,
    descriptionSource,
    pageParagraph: facts.paragraph,
    canonical: pageUrl(primary, page, inLang),
    siteName: project.name,
    image: pageImage ?? (await shareCardUrl(project, primary.origin)),
    imageIsCard: !pageImage,
    noindex: settings.noindex || privatePage || !project.published,
    hiddenApp: settings.noindex,
    privatePage,
    searchConsoleToken: settings.searchConsoleToken,
    lang: doc.lang,
    primary,
    languages: offered.length > 1
      ? { ...Object.fromEntries(offered.map((code) => [code, pageUrl(primary, page, code === app.locale ? null : code)])), "x-default": pageUrl(primary, page) }
      : null,
  };
}

/**
 * Next.js metadata for a published page: title and description from the
 * live version (a Designer page's own <title> and meta description win),
 * the canonical address, Open Graph and Twitter cards, noindex where it
 * applies, and the Search Console verification tag.
 */
export async function buildMetadata(project: SeoProject, pageSlug?: string, lang?: string | null): Promise<Metadata> {
  const icon = appIconUrl(project, 192);
  const icons = { icon, shortcut: icon, apple: appIconUrl(project, 180) };
  const seo = await pageSeo(project, pageSlug, lang);
  if (!seo) return { title: "Not found", icons, robots: { index: false, follow: false } };
  const images = [{ url: seo.image, alt: seo.title, ...(seo.imageIsCard ? { width: CARD_WIDTH, height: CARD_HEIGHT } : {}) }];
  return {
    title: seo.title,
    description: seo.description ?? undefined,
    icons,
    alternates: { canonical: seo.canonical, ...(seo.languages ? { languages: seo.languages } : {}) },
    openGraph: {
      type: "website",
      url: seo.canonical,
      title: seo.title,
      description: seo.description ?? undefined,
      siteName: seo.siteName,
      images,
    },
    twitter: {
      card: "summary_large_image",
      title: seo.title,
      description: seo.description ?? undefined,
      images: [seo.image],
    },
    ...(seo.noindex ? { robots: { index: false, follow: !seo.hiddenApp } } : {}),
    ...(seo.searchConsoleToken ? { verification: { google: seo.searchConsoleToken } } : {}),
  };
}

/* ── robots.txt and sitemap.xml for an app's own addresses ──────────────── */

export async function appRobotsTxt(project: SeoProject): Promise<string> {
  if (!project.published) return "User-agent: *\nDisallow: /\n";
  const [primary, settings] = await Promise.all([primaryUrl(project), getSeoSettings(project.id)]);
  // Pages that must stay out of results carry a noindex tag, which crawlers
  // can only see if they may fetch the page, so nothing is disallowed here.
  const lines = ["User-agent: *", "Allow: /"];
  if (!settings.noindex) lines.push("", `Sitemap: ${sitemapUrl(primary)}`);
  return `${lines.join("\n")}\n`;
}

export type SitemapEntry = {
  loc: string;
  lastmod: string | null;
  /** Multilingual apps: the same page in each language (xhtml:link hreflang). */
  alternates?: Array<{ lang: string; href: string }>;
};

/** The app's public pages at its primary address, or null when it shouldn't have a sitemap. */
export async function appSitemap(project: SeoProject): Promise<{ primary: PrimaryAddress; entries: SitemapEntry[] } | null> {
  if (!project.published) return null;
  const [primary, settings] = await Promise.all([primaryUrl(project), getSeoSettings(project.id)]);
  if (settings.noindex) return null;
  const live = project.liveDeploymentId ? await liveSnapshot(project.id) : null;
  let pages: Array<{ slug: string; isHome: boolean; html: string; lastmod: Date | null }>;
  if (live) {
    const deployment = await db.deployment.findUnique({ where: { id: project.liveDeploymentId! }, select: { createdAt: true } });
    pages = live.pages.map((p) => ({ slug: p.slug, isHome: p.isHome, html: p.html, lastmod: deployment?.createdAt ?? null }));
  } else {
    // Published before safe publishing: the saved pages are what visitors see.
    pages = (await db.page.findMany({ where: { projectId: project.id }, select: { slug: true, isHome: true, html: true, updatedAt: true }, orderBy: { createdAt: "asc" } }))
      .map((p) => ({ slug: p.slug, isHome: p.isHome, html: p.html, lastmod: p.updatedAt }));
  }
  const seen = new Set<string>();
  const entries: SitemapEntry[] = [];
  // Multilingual apps list each page once per language, with the others as alternates.
  const { app, offered } = await liveLanguages(project.id);
  for (const p of [...pages].sort((a, b) => Number(b.isHome) - Number(a.isHome))) {
    if (isPrivatePage(p)) continue;
    const loc = pageUrl(primary, p);
    if (seen.has(loc)) continue;
    seen.add(loc);
    if (offered.length < 2) {
      entries.push({ loc, lastmod: p.lastmod ? p.lastmod.toISOString() : null });
      continue;
    }
    const alternates = [...offered.map((code) => ({ lang: code, href: pageUrl(primary, p, code === app.locale ? null : code) })), { lang: "x-default", href: loc }];
    for (const a of alternates.slice(0, offered.length)) entries.push({ loc: a.href, lastmod: p.lastmod ? p.lastmod.toISOString() : null, alternates });
  }
  return { primary, entries };
}

const xmlEscape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

export function sitemapXml(entries: SitemapEntry[]): string {
  const alt = (e: SitemapEntry) => (e.alternates ?? []).map((a) => `\n    <xhtml:link rel="alternate" hreflang="${xmlEscape(a.lang)}" href="${xmlEscape(a.href)}"/>`).join("");
  const urls = entries.map((e) => `  <url>\n    <loc>${xmlEscape(e.loc)}</loc>${e.lastmod ? `\n    <lastmod>${xmlEscape(e.lastmod)}</lastmod>` : ""}${alt(e)}\n  </url>`);
  // The xhtml namespace only when there are alternates, so single-language sitemaps stay as they were.
  const ns = entries.some((e) => e.alternates?.length) ? ` xmlns:xhtml="http://www.w3.org/1999/xhtml"` : "";
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"${ns}>\n${urls.join("\n")}${urls.length ? "\n" : ""}</urlset>\n`;
}

/* ── Per-request lookups shared by generateMetadata and the page ────────── */

/** The project behind /app/<slug>, fetched once per request. */
export const projectBySlug = cache(async (slug: string) => db.project.findUnique({ where: { slug } }));
