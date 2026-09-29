import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

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
  /** Menu-eligible pages, home first, in creation order. */
  pages: NavPage[];
  loginSlug: string | null;
  registerSlug: string | null;
  logoutFlowId: string | null;
};

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

function linkFor(p: NavPage, currentSlug: string, cls: "nav-link" | "dropdown-item"): string {
  const href = p.isHome ? "/" : `/${p.slug}`;
  const active = p.slug === currentSlug;
  const label = escHtml(p.isHome ? "Home" : p.title.trim().slice(0, 40) || p.slug);
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
export function buildNavHtml(info: NavProjectInfo, currentSlug: string): string {
  const home = info.pages.find((p) => p.isHome) ?? null;
  // Staff-only pages (orders, inbox, subscribers…) live in their own "Manage"
  // menu that only those roles see, so they never take a visitor's slots.
  const rest = info.pages.filter((p) => !p.isHome && !p.requiredRole);
  const staff = info.pages.filter((p) => !p.isHome && p.requiredRole);
  const primary = rest.slice(0, MAX_PRIMARY_LINKS);
  const overflow = rest.slice(MAX_PRIMARY_LINKS);

  const items: string[] = [];
  if (home) {
    items.push(`<li class="nav-item">${linkFor(home, currentSlug, "nav-link")}</li>`);
  }
  for (const p of primary) {
    items.push(`<li class="nav-item"${gateAttrs(p)}>${linkFor(p, currentSlug, "nav-link")}</li>`);
  }
  if (overflow.length > 0) {
    const inner = overflow
      .map((p) => `<li${gateAttrs(p)}>${linkFor(p, currentSlug, "dropdown-item")}</li>`)
      .join("");
    items.push(
      `<li class="nav-item dropdown">` +
        `<a class="nav-link" href="#" data-nk-nav-toggle="#nk-nav-more" aria-expanded="false" style="color: var(--nk-text);">More &#9662;</a>` +
        `<ul class="dropdown-menu dropdown-menu-end" id="nk-nav-more" style="background: var(--nk-surface); border: 1px solid var(--nk-border);">${inner}</ul>` +
        `</li>`
    );
  }

  if (staff.length > 0) {
    const roles = [...new Set(staff.map((p) => p.requiredRole!))].join(",");
    const inner = staff
      .map((p) => `<li${gateAttrs(p)}>${linkFor(p, currentSlug, "dropdown-item")}</li>`)
      .join("");
    items.push(
      `<li class="nav-item dropdown" data-nk-role="${escHtml(roles)}" hidden>` +
        `<a class="nav-link" href="#" data-nk-nav-toggle="#nk-nav-manage" aria-expanded="false" style="color: var(--nk-text);">Manage &#9662;</a>` +
        `<ul class="dropdown-menu dropdown-menu-end" id="nk-nav-manage" style="background: var(--nk-surface); border: 1px solid var(--nk-border);">${inner}</ul>` +
        `</li>`
    );
  }

  // Auth-aware entries. Start hidden — the runtime reveals the group that
  // matches the visitor's session, so there's no flash of the wrong state.
  if (info.loginSlug) {
    items.push(
      `<li class="nav-item" data-nk-auth="out" hidden>` +
        `<a class="nav-link" href="/${info.loginSlug}" style="color: var(--nk-text);">Log in</a></li>`
    );
  }
  if (info.registerSlug) {
    items.push(
      `<li class="nav-item ms-lg-2" data-nk-auth="out" hidden>` +
        `<a class="btn btn-sm" href="/${info.registerSlug}" style="background: var(--nk-primary); color: #fff; border-radius: var(--nk-radius-sm, 8px); padding: .35rem .9rem;">Sign up</a></li>`
    );
  }
  if (info.logoutFlowId) {
    items.push(
      `<li class="nav-item" data-nk-auth="in" hidden>` +
        `<a class="nav-link" href="#" data-nk-logout="${escHtml(info.logoutFlowId)}" data-nk-redirect="/" style="color: var(--nk-text-muted);">Log out</a></li>`
    );
  }

  return (
    `<nav data-nk-nav="auto" class="navbar navbar-expand-lg nk-nav" style="background: var(--nk-surface); border-bottom: 1px solid var(--nk-border);">` +
    `<div class="container">` +
    `<a class="navbar-brand fw-bold" href="/" style="color: var(--nk-text); font-family: var(--nk-font-display, inherit);">${escHtml(
      info.projectName
    )}</a>` +
    `<button class="navbar-toggler border-0 p-1" type="button" data-nk-nav-toggle="#nk-nav-menu" aria-controls="nk-nav-menu" aria-expanded="false" aria-label="Toggle navigation" style="color: var(--nk-text); box-shadow: none;">${TOGGLER_BAR}${TOGGLER_BAR}${TOGGLER_BAR}</button>` +
    `<div class="collapse navbar-collapse" id="nk-nav-menu">` +
    `<ul class="navbar-nav ms-auto mb-2 mb-lg-0 align-items-lg-center">${items.join("")}</ul>` +
    `</div></div></nav>`
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
      select: { id: true, slug: true, title: true, isHome: true, html: true },
    }),
    db.flow.findMany({ where: { projectId }, select: { id: true, slug: true } }),
  ]);
  if (!project || pages.length === 0) return 0;

  const logoutFlow =
    flows.find((f) => f.slug === "logout") ??
    flows.find((f) => f.slug === "auth-logout") ??
    flows.find((f) => f.slug.endsWith("-logout"));

  const bySlug = new Map(pages.map((p) => [p.slug, p]));
  const loginSlug = LOGIN_SLUGS.find((s) => bySlug.has(s)) ?? null;
  const registerSlug = REGISTER_SLUGS.find((s) => bySlug.has(s)) ?? null;

  const navPages: NavPage[] = pages
    .filter((p) => !AUTH_OUT_SLUGS.has(p.slug) && !UTILITY_SLUG_RE.test(p.slug))
    .map((p) => ({
      slug: p.slug,
      title: p.title,
      isHome: p.isHome,
      requiresAuth: p.html.includes(AUTH_MARKER),
      requiredRole: ROLE_MARKER_RE.exec(p.html)?.[1] ?? null,
    }));
  // Home first, then creation order.
  navPages.sort((a, b) => (a.isHome === b.isHome ? 0 : a.isHome ? -1 : 1));

  const info: NavProjectInfo = {
    projectName: project.name,
    pages: navPages,
    loginSlug,
    registerSlug,
    logoutFlowId: logoutFlow?.id ?? null,
  };

  let changed = 0;
  for (const page of pages) {
    const nav = buildNavHtml(info, page.slug);
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
  return changed;
}
