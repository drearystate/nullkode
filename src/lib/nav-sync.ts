import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { readMenuMarkers } from "@/lib/page-visibility";
import { getAppLocale, runtimeText } from "@/lib/app-locale";
import type { Locale } from "@/i18n/locales";

/**
 * Project-wide navigation sync.
 *
 * Every NullKode app gets one canonical, responsive menu — desktop inline,
 * tablet/mobile hamburger — generated from the project's pages and stamped
 * into every page's HTML. All the tools that create pages (AI scaffold,
 * modules, templates, manual page add, designer mirror) call
 * `syncProjectNav` afterwards, so adding a page or installing a module
 * updates the menu everywhere automatically.
 *
 * The generated nav is marked with data-nk-nav="auto" so re-syncs can find
 * and replace it idempotently. Pages that must not carry the shared menu
 * opt out with a <!--nk:no-nav--> comment anywhere in their HTML.
 *
 * The owner's own choices come first (Page settings in the editor, stored
 * as markers in each page, see lib/page-visibility.ts): a page marked
 * <!--nk:hide-in-menu--> is left out, and <!--nk:menu-order:N--> sets its
 * place. Only then do the heuristics below apply (sign-in pages become
 * buttons, detail and "thank you" pages stay out, the rest follow in the
 * order they were made).
 */

export const NO_NAV_MARKER = "<!--nk:no-nav-->";

const AUTH_MARKER = "<!--nk:require-auth-->";
const ROLE_MARKER_RE = /<!--\s*nk:require-role:([a-zA-Z0-9_-]+)\s*-->/;

/** Pages rendered as auth buttons instead of regular menu links. */
const LOGIN_SLUGS = ["login", "sign-in", "signin"];
const REGISTER_SLUGS = ["register", "signup", "sign-up"];
const AUTH_OUT_SLUGS = new Set([
  ...LOGIN_SLUGS,
  ...REGISTER_SLUGS,
  "forgot-password",
  "reset-password",
]);

/**
 * Utility/parameterized pages that don't belong in a menu: detail views,
 * edit forms, success/confirmation screens, error pages.
 */
const UTILITY_SLUG_RE =
  /(^|-)(detail|details|edit|success|confirmation|thank-you|thanks|404|error)(-|$)/;

/**
 * Addresses the platform serves itself for every app (a built-in page wins
 * over a page of the same name), so a page there never goes in the menu and
 * new pages shouldn't take them.
 */
export const RESERVED_PAGE_SLUGS = new Set(["delete-account"]);

/** Visible links before the rest overflows into a "More" dropdown. */
const MAX_PRIMARY_LINKS = 5;

type NavPage = {
  slug: string;
  title: string;
  isHome: boolean;
  requiresAuth: boolean;
  requiredRole: string | null;
};

export type NavProjectInfo = {
  projectName: string;
  /** Menu-eligible pages, home first, then in menu order. */
  pages: NavPage[];
  loginSlug: string | null;
  registerSlug: string | null;
  logoutFlowId: string | null;
};

/** What the menu planner needs from each page. */
export type MenuSourcePage = {
  id: string;
  slug: string;
  title: string;
  isHome: boolean;
  html: string;
  createdAt: Date;
};

/**
 * A page's slot in the menu. "main" pages are the visitor links (signed-in
 * only ones included), "staff" pages sit in the admins' "Manage" menu.
 */
export type MenuEntry = NavPage & { id: string; group: "home" | "main" | "staff"; order: number | null };

export type MenuPlan = {
  home: MenuEntry | null;
  main: MenuEntry[];
  staff: MenuEntry[];
  loginSlug: string | null;
  registerSlug: string | null;
};

/** Pages that are never plain menu links, whatever their markers say. */
export function neverInMenu(slug: string): boolean {
  return AUTH_OUT_SLUGS.has(slug) || RESERVED_PAGE_SLUGS.has(slug);
}

/**
 * Decides which pages the shared menu shows, and in what order: the
 * owner's markers first (hidden pages out, a page with a menu place always
 * in, sorted by it), then the heuristics, then creation order.
 */
export function planMenu(pages: MenuSourcePage[]): MenuPlan {
  const shown = pages.filter((p) => !readMenuMarkers(p.html).hidden);
  const bySlug = new Map(shown.map((p) => [p.slug, p]));
  const entries: MenuEntry[] = shown
    .map((p) => ({ p, order: readMenuMarkers(p.html).order }))
    .filter(({ p, order }) => !neverInMenu(p.slug) && (order !== null || !UTILITY_SLUG_RE.test(p.slug)))
    .sort((a, b) => {
      const ao = a.order ?? Number.POSITIVE_INFINITY;
      const bo = b.order ?? Number.POSITIVE_INFINITY;
      if (ao !== bo) return ao < bo ? -1 : 1;
      return a.p.createdAt.getTime() - b.p.createdAt.getTime() || a.p.slug.localeCompare(b.p.slug);
    })
    .map(({ p, order }): MenuEntry => {
      const requiredRole = ROLE_MARKER_RE.exec(p.html)?.[1] ?? null;
      return {
        id: p.id,
        slug: p.slug,
        title: p.title,
        isHome: p.isHome,
        requiresAuth: p.html.includes(AUTH_MARKER),
        requiredRole,
        order,
        group: p.isHome ? "home" : requiredRole ? "staff" : "main",
      };
    });
  return {
    home: entries.find((e) => e.group === "home") ?? null,
    main: entries.filter((e) => e.group === "main"),
    staff: entries.filter((e) => e.group === "staff"),
    loginSlug: LOGIN_SLUGS.find((s) => bySlug.has(s)) ?? null,
    registerSlug: REGISTER_SLUGS.find((s) => bySlug.has(s)) ?? null,
  };
}

function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function gateAttrs(p: NavPage): string {
  if (p.requiredRole) return ` data-nk-role="${escHtml(p.requiredRole)}"`;
  if (p.requiresAuth) return ` data-nk-auth="in"`;
  return "";
}

/**
 * The menu's own words ("Home", "Log in", …) in the app's language, from
 * messages/<locale>/runtime.json. English menus are unchanged.
 */
export type NavWords = (key: "navHome" | "navMore" | "navManage" | "navLogIn" | "navSignUp" | "navLogOut" | "navSkip" | "navMenu" | "navMain", english: string) => string;
const ENGLISH: NavWords = (_key, english) => english;

/** The menu's words in a language (English words for English). */
export function navWords(locale: Locale): NavWords {
  return locale === "en" ? ENGLISH : (key) => runtimeText(locale, key);
}

export type NavOptions = {
  words?: NavWords;
  /** Multilingual apps: a language switcher ([data-nk-lang-switcher], filled in by the page's locale script). */
  switcher?: boolean;
};

function linkFor(p: NavPage, currentSlug: string, cls: "nav-link" | "dropdown-item", w: NavWords = ENGLISH): string {
  const href = p.isHome ? "/" : `/${p.slug}`;
  const active = p.slug === currentSlug;
  const label = escHtml(p.isHome ? w("navHome", "Home") : p.title.trim().slice(0, 40) || p.slug);
  return (
    `<a class="${cls}${active ? " active" : ""}"` +
    (active ? ` aria-current="page"` : "") +
    ` href="${href}" style="color: var(--nk-text);${active ? "font-weight:600;" : ""}">` +
    label +
    `</a>`
  );
}

const TOGGLER_BAR =
  '<span style="display:block;width:22px;height:2px;background:currentColor;border-radius:2px;margin:5px 0;"></span>';

/**
 * Build the canonical navbar HTML for one page of a project. Root-relative
 * hrefs — the publish layer namespaces them per host, and the runtime's
 * data-nk-auth / data-nk-role handling shows or hides the gated entries.
 */
export function buildNavHtml(info: NavProjectInfo, currentSlug: string, opts: NavOptions = {}): string {
  const w = opts.words ?? ENGLISH;
  const home = info.pages.find((p) => p.isHome) ?? null;
  // Staff-only pages (orders, inbox, subscribers…) live in their own "Manage"
  // menu that only those roles see, so they never take a visitor's slots.
  const rest = info.pages.filter((p) => !p.isHome && !p.requiredRole);
  const staff = info.pages.filter((p) => !p.isHome && p.requiredRole);
  const primary = rest.slice(0, MAX_PRIMARY_LINKS);
  const overflow = rest.slice(MAX_PRIMARY_LINKS);

  const items: string[] = [];
  if (home) {
    items.push(`<li class="nav-item">${linkFor(home, currentSlug, "nav-link", w)}</li>`);
  }
  for (const p of primary) {
    items.push(`<li class="nav-item"${gateAttrs(p)}>${linkFor(p, currentSlug, "nav-link", w)}</li>`);
  }
  if (overflow.length > 0) {
    const inner = overflow
      .map((p) => `<li${gateAttrs(p)}>${linkFor(p, currentSlug, "dropdown-item", w)}</li>`)
      .join("");
    items.push(
      `<li class="nav-item dropdown">` +
        `<a class="nav-link" href="#" role="button" data-nk-nav-toggle="#nk-nav-more" aria-controls="nk-nav-more" aria-expanded="false" style="color: var(--nk-text);">${escHtml(w("navMore", "More"))} <span aria-hidden="true">&#9662;</span></a>` +
        `<ul class="dropdown-menu dropdown-menu-end" id="nk-nav-more" style="background: var(--nk-surface); border: 1px solid var(--nk-border);">${inner}</ul>` +
        `</li>`
    );
  }

  if (staff.length > 0) {
    const roles = [...new Set(staff.map((p) => p.requiredRole!))].join(",");
    const inner = staff
      .map((p) => `<li${gateAttrs(p)}>${linkFor(p, currentSlug, "dropdown-item", w)}</li>`)
      .join("");
    items.push(
      `<li class="nav-item dropdown" data-nk-role="${escHtml(roles)}" hidden>` +
        `<a class="nav-link" href="#" role="button" data-nk-nav-toggle="#nk-nav-manage" aria-controls="nk-nav-manage" aria-expanded="false" style="color: var(--nk-text);">${escHtml(w("navManage", "Manage"))} <span aria-hidden="true">&#9662;</span></a>` +
        `<ul class="dropdown-menu dropdown-menu-end" id="nk-nav-manage" style="background: var(--nk-surface); border: 1px solid var(--nk-border);">${inner}</ul>` +
        `</li>`
    );
  }

  // Auth-aware entries. Start hidden — the runtime reveals the group that
  // matches the visitor's session, so there's no flash of the wrong state.
  if (info.loginSlug) {
    items.push(
      `<li class="nav-item" data-nk-auth="out" hidden>` +
        `<a class="nav-link" href="/${info.loginSlug}" style="color: var(--nk-text);">${escHtml(w("navLogIn", "Log in"))}</a></li>`
    );
  }
  if (info.registerSlug) {
    items.push(
      `<li class="nav-item ms-lg-2" data-nk-auth="out" hidden>` +
        `<a class="btn btn-sm" href="/${info.registerSlug}" style="background: var(--nk-primary); color: var(--nk-on-primary, #fff); border-radius: var(--nk-radius-sm, 8px); padding: .35rem .9rem;">${escHtml(w("navSignUp", "Sign up"))}</a></li>`
    );
  }
  if (info.logoutFlowId) {
    items.push(
      `<li class="nav-item" data-nk-auth="in" hidden>` +
        `<a class="nav-link" href="#" data-nk-logout="${escHtml(info.logoutFlowId)}" data-nk-redirect="/" style="color: var(--nk-text);">${escHtml(w("navLogOut", "Log out"))}</a></li>`
    );
  }
  if (opts.switcher) {
    items.push(`<li class="nav-item ms-lg-2 nk-lang-item"><div data-nk-lang-switcher=""></div></li>`);
  }

  // "Skip to content" lets keyboard and screen-reader users jump past the
  // menu. It only shows while focused (Bootstrap's visually-hidden-focusable)
  // and lands on the empty marker at the end of the nav, so the next Tab
  // goes to the page's own content.
  return (
    `<nav data-nk-nav="auto" class="navbar navbar-expand-lg nk-nav" aria-label="${escHtml(w("navMain", "Main"))}" style="background: var(--nk-surface); border-bottom: 1px solid var(--nk-border);">` +
    `<a class="visually-hidden-focusable nk-skip-link" href="#nk-main" style="position: absolute; top: 8px; left: 8px; z-index: 1080; padding: .5rem 1rem; background: var(--nk-surface); color: var(--nk-text); border: 2px solid var(--nk-primary); border-radius: var(--nk-radius-sm, 8px); text-decoration: none;">${escHtml(w("navSkip", "Skip to content"))}</a>` +
    `<div class="container">` +
    `<a class="navbar-brand fw-bold" href="/" style="color: var(--nk-text); font-family: var(--nk-font-display, inherit);">${escHtml(
      info.projectName
    )}</a>` +
    `<button class="navbar-toggler border-0 p-1" type="button" data-nk-nav-toggle="#nk-nav-menu" aria-controls="nk-nav-menu" aria-expanded="false" aria-label="${escHtml(w("navMenu", "Menu"))}" style="color: var(--nk-text); box-shadow: none;">${TOGGLER_BAR}${TOGGLER_BAR}${TOGGLER_BAR}</button>` +
    `<div class="collapse navbar-collapse" id="nk-nav-menu">` +
    `<ul class="navbar-nav ms-auto mb-2 mb-lg-0 align-items-lg-center">${items.join("")}</ul>` +
    `</div></div><span id="nk-main" tabindex="-1"></span></nav>`
  );
}

const MARKED_NAV_RE = /<nav\b[^>]*\bdata-nk-nav\b[^>]*>[\s\S]*?<\/nav>/i;
const FIRST_NAV_RE = /<nav\b[^>]*>[\s\S]*?<\/nav>/i;

/**
 * Put the canonical nav into a page's HTML: replace a previously stamped
 * nav, else replace the page's first <nav>, else insert it at the top
 * (after <body> for full-document pages, after leading nk markers for
 * fragments). Pages with the no-nav marker are returned untouched.
 */
export function stampNavIntoHtml(html: string, nav: string): string {
  if (html.includes(NO_NAV_MARKER)) return html;
  if (MARKED_NAV_RE.test(html)) return html.replace(MARKED_NAV_RE, () => nav);
  if (FIRST_NAV_RE.test(html)) return html.replace(FIRST_NAV_RE, () => nav);
  const bodyMatch = /<body\b[^>]*>/i.exec(html);
  if (bodyMatch) {
    const idx = bodyMatch.index + bodyMatch[0].length;
    return html.slice(0, idx) + "\n" + nav + html.slice(idx);
  }
  const lead = /^(\s*(?:<!--[\s\S]*?-->\s*)*)/.exec(html)?.[1] ?? "";
  return lead + nav + "\n" + html.slice(lead.length);
}

/**
 * Rebuild the shared menu from the project's current pages and stamp it
 * into every page. Idempotent — pages whose HTML wouldn't change are not
 * written. Returns how many pages were updated.
 */
export async function syncProjectNav(projectId: string): Promise<number> {
  const [project, pages, flows] = await Promise.all([
    db.project.findUnique({
      where: { id: projectId },
      select: { name: true },
    }),
    db.page.findMany({
      where: { projectId },
      orderBy: { createdAt: "asc" },
      select: { id: true, slug: true, title: true, isHome: true, html: true, createdAt: true },
    }),
    db.flow.findMany({ where: { projectId }, select: { id: true, slug: true } }),
  ]);
  if (!project || pages.length === 0) return 0;

  const logoutFlow =
    flows.find((f) => f.slug === "logout") ??
    flows.find((f) => f.slug === "auth-logout") ??
    flows.find((f) => f.slug.endsWith("-logout"));

  // Home first, then the owner's order, then creation order.
  const plan = planMenu(pages);
  const toNav = ({ slug, title, isHome, requiresAuth, requiredRole }: MenuEntry): NavPage => ({ slug, title, isHome, requiresAuth, requiredRole });
  const info: NavProjectInfo = {
    projectName: project.name,
    pages: [...(plan.home ? [plan.home] : []), ...plan.main, ...plan.staff].map(toNav),
    loginSlug: plan.loginSlug,
    registerSlug: plan.registerSlug,
    logoutFlowId: logoutFlow?.id ?? null,
  };

  // The app's language: the menu's words in it, and with more than one
  // language a switcher, plus a menu in each language for its translations.
  const app = await getAppLocale(projectId);
  const switcher = app.locales.length > 1;
  const opts: NavOptions = { words: navWords(app.locale), switcher };

  let changed = 0;
  for (const page of pages) {
    const nav = buildNavHtml(info, page.slug, opts);
    const newHtml = stampNavIntoHtml(page.html, nav);
    if (newHtml === page.html) continue;
    // Clearing components/styles matters: the editor prefers the GrapesJS
    // components JSON over html on load, so a stale blob would hide the
    // updated menu in the editor even though the published page changed.
    await db.page.update({
      where: { id: page.id },
      data: {
        html: newHtml,
        components: Prisma.DbNull,
        styles: Prisma.DbNull,
      },
    });
    changed++;
  }
  if (switcher) changed += await syncTranslationNavs(projectId, info, app.locales.slice(1));
  return changed;
}

/**
 * The menu in each of the app's other languages, stamped into that
 * language's translated pages: the translated page titles (the default
 * language's where a page has no translation yet) and the menu's words.
 */
async function syncTranslationNavs(projectId: string, info: NavProjectInfo, locales: Locale[]): Promise<number> {
  let changed = 0;
  for (const locale of locales) {
    const rows = await db.pageTranslation.findMany({
      where: { locale, page: { projectId } },
      select: { id: true, title: true, html: true, page: { select: { slug: true } } },
    });
    if (rows.length === 0) continue;
    const titles = new Map(rows.map((r) => [r.page.slug, r.title]));
    const localized: NavProjectInfo = { ...info, pages: info.pages.map((p) => ({ ...p, title: titles.get(p.slug) || p.title })) };
    const opts: NavOptions = { words: navWords(locale), switcher: true };
    for (const row of rows) {
      const html = stampNavIntoHtml(row.html, buildNavHtml(localized, row.page.slug, opts));
      if (html === row.html) continue;
      // The menu isn't the owner's work: an edited translation stays edited.
      await db.pageTranslation.update({ where: { id: row.id }, data: { html } });
      changed++;
    }
  }
  return changed;
}
