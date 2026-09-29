/**
 * Page settings that live in the page itself, as small HTML comments, so they
 * need no database columns and travel with the page everywhere it goes
 * (publishing, export and import, duplicating):
 *
 *   <!--nk:require-auth-->         only signed-in people can open the page
 *   <!--nk:require-role:admin-->   only people with that role (admins) can
 *   <!--nk:hide-in-menu-->         the shared menu leaves the page out
 *   <!--nk:menu-order:N-->         the page's place in the shared menu
 *
 * The public page, the flow access check (lib/flow/access.ts) and the menu
 * builder (lib/nav-sync.ts) read them. The editor keeps them inside <body>,
 * where GrapesJS keeps comments; comments before the first element would be
 * dropped when the page is opened in the editor.
 */

export type Visibility = "public" | "signed-in" | "admin";

export const AUTH_MARKER = "<!--nk:require-auth-->";
export const ADMIN_ROLE_MARKER = "<!--nk:require-role:admin-->";
export const HIDE_IN_MENU_MARKER = "<!--nk:hide-in-menu-->";

const AUTH_ANY = /<!--\s*nk:require-auth\s*-->\n?/g;
const ROLE_ANY = /<!--\s*nk:require-role:[a-zA-Z0-9_-]+\s*-->\n?/g;
const ROLE_ONE = /<!--\s*nk:require-role:([a-zA-Z0-9_-]+)\s*-->/;
const HIDE_ANY = /<!--\s*nk:hide-in-menu\s*-->\n?/g;
const ORDER_ANY = /<!--\s*nk:menu-order:-?\d+\s*-->\n?/g;
const ORDER_ONE = /<!--\s*nk:menu-order:(-?\d+)\s*-->/;
/** Every page marker (the ones above, plus no-nav and any future nk: marker). */
const NK_MARKER_ANY = /<!--\s*nk:[a-zA-Z0-9:_-]+\s*-->/g;
const BODY_OPEN = /<body\b[^>]*>/i;

/** Who can open the page. A role other than admin is reported as "role". */
export function readVisibility(html: string): { level: Visibility | "role"; role: string | null } {
  const role = ROLE_ONE.exec(html)?.[1]?.toLowerCase() ?? null;
  if (role) return { level: role === "admin" ? "admin" : "role", role };
  if (/<!--\s*nk:require-auth\s*-->/.test(html)) return { level: "signed-in", role: null };
  return { level: "public", role: null };
}

/** Rewrites the sign-in and role markers for the chosen audience. */
export function setVisibilityMarkers(html: string, level: Visibility): string {
  const body = html.replace(AUTH_ANY, "").replace(ROLE_ANY, "");
  const markers = level === "admin" ? [AUTH_MARKER, ADMIN_ROLE_MARKER] : level === "signed-in" ? [AUTH_MARKER] : [];
  return insertMarkers(body, markers);
}

export function readMenuMarkers(html: string): { hidden: boolean; order: number | null } {
  const order = ORDER_ONE.exec(html)?.[1];
  return { hidden: /<!--\s*nk:hide-in-menu\s*-->/.test(html), order: order === undefined ? null : Number(order) };
}

/**
 * Sets or clears the menu markers. Leave a field out to keep what's there;
 * `order: null` removes the page's place in the menu.
 */
export function setMenuMarkers(html: string, opts: { hidden?: boolean; order?: number | null }): string {
  let out = html;
  const add: string[] = [];
  if (opts.hidden !== undefined) {
    out = out.replace(HIDE_ANY, "");
    if (opts.hidden) add.push(HIDE_IN_MENU_MARKER);
  }
  if (opts.order !== undefined) {
    out = out.replace(ORDER_ANY, "");
    if (opts.order !== null && Number.isFinite(opts.order)) add.push(`<!--nk:menu-order:${Math.trunc(opts.order)}-->`);
  }
  return insertMarkers(out, add);
}

const OPENNESS = { public: 0, "signed-in": 1, admin: 2, role: 2 } as const;

/**
 * What an editor save may change about the page's settings: nothing about
 * the menu (that's Page settings), and it may make the page stricter but
 * never more open. A tab opened before a settings change, or an older copy
 * restored from the browser, would otherwise quietly undo "admins only".
 */
export function keepPageSettings(saved: string, incoming: string): string {
  let out = incoming;
  const was = readMenuMarkers(saved);
  const now = readMenuMarkers(out);
  if (was.hidden !== now.hidden || was.order !== now.order) out = setMenuMarkers(out, { hidden: was.hidden, order: was.order });
  const before = readVisibility(saved);
  const after = readVisibility(out);
  if (OPENNESS[after.level] < OPENNESS[before.level]) {
    out = insertMarkers(out.replace(AUTH_ANY, "").replace(ROLE_ANY, ""), [
      AUTH_MARKER,
      ...(before.role ? [`<!--nk:require-role:${before.role}-->`] : []),
    ]);
  }
  return out;
}

/** What the editor's Page settings dialog shows (GET ...?settings=1). */
export type PageSettings = {
  visibility: Visibility | "role";
  role: string | null;
  /** Shown in the menu right now (as a link, or as the Log in / Sign up button). */
  inMenu: boolean;
  /** False for pages the menu never lists (password reset and the like). */
  canShowInMenu: boolean;
  menuGroup: "home" | "main" | "staff" | "button" | null;
  /** Place among the page's menu group, from 1. */
  menuPosition: number | null;
  menuCount: number;
  /** One of a feature's owner-only pages (orders, inbox...). */
  privateData: boolean;
  /** The app has a sign-in page for people to use. */
  hasLogin: boolean;
  /** An AI Designer app: its pages are rewritten from the design. */
  designer: boolean;
};

/** Right after <body ...> when the page has one, else at the very top. */
function insertMarkers(html: string, markers: string[]): string {
  if (markers.length === 0) return html;
  const block = markers.join("\n") + "\n";
  const body = BODY_OPEN.exec(html);
  if (body) {
    const at = body.index + body[0].length;
    return html.slice(0, at) + block + html.slice(at);
  }
  return block + html.replace(/^\s+/, "");
}

/**
 * Makes sure the page's nk: markers survive a trip through the editor.
 * GrapesJS parses the page like a browser does: comments that come before
 * the first element (or after a leading <style>) end up outside <body> and
 * are dropped, so the next save would silently lose "signed-in only" or
 * "admins only". A page without a <body> tag is wrapped in one, which keeps
 * every comment in place; a page with one has any markers written before it
 * moved to the start of the body.
 */
export function markersInsideBody(html: string): string {
  if (!/<!--\s*nk:/.test(html)) return html;
  const body = BODY_OPEN.exec(html);
  if (!body) return `<body>${html}</body>`;
  const before = html.slice(0, body.index);
  const moved = before.match(NK_MARKER_ANY);
  if (!moved) return html;
  const at = body.index + body[0].length;
  return before.replace(NK_MARKER_ANY, "") + body[0] + moved.join("") + html.slice(at);
}
