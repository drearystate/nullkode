/**
 * Module pages meant for the app's owner and staff, not its visitors: admin
 * screens, inboxes, order and lead lists. They're installed behind sign-in
 * with the admin role, which also locks the flows only they use (see
 * lib/flow/access.ts), and the shared menu shows them under "Manage".
 *
 * Page slugs are the module's own (as written in its definition). A new
 * module can instead mark a page with `ownerOnly: true`.
 */
export const OWNER_ONLY_PAGES: Record<string, string[]> = {
  "acknowledgments": ["acks-admin"],
  "analytics-dashboard": ["analytics"],
  "app-walkthrough": ["walkthrough-admin"],
  "appointments": ["appointments-admin"],
  "audio": ["playlist-admin"],
  "before-after": ["ba-admin"],
  "blog": ["admin"],
  "bookings": ["admin"],
  "catalog": ["catalog-admin"],
  "claims": ["claims-admin"],
  "contact-form": ["inbox"],
  "countdown": ["countdown-admin"],
  "coupons": ["coupons-admin"],
  "delivery-zones": ["delivery-zones-admin"],
  "drip-content": ["drip-admin"],
  "events": ["events-admin"],
  "faq": ["faq-admin"],
  "gallery": ["gallery-admin"],
  "geofencer": ["geofencer-admin"],
  "in-app-ads": ["ads-admin"],
  "jobs": ["careers-admin"],
  "kb": ["help-admin"],
  "leads": ["leads"],
  "link-tracker": ["links-admin"],
  "links": ["links-admin"],
  "marketplace": ["admin-marketplace"],
  "media-playlist": ["playlist-admin"],
  "menu": ["menu-admin"],
  "newsletter": ["subscribers"],
  "paywall": ["paywall-admin"],
  "pdf-embed": ["documents-admin"],
  "phonebook": ["directory-admin"],
  "places": ["places-admin"],
  "portfolio": ["portfolio-admin"],
  "pricing": ["pricing-leads"],
  "queue": ["queue-staff"],
  "quote-request": ["quote-admin"],
  "radio": ["stations"],
  "rss-reader": ["reader-admin"],
  "shop": ["products-admin", "orders"],
  "slider": ["slider-admin"],
  "status-page": ["status-admin"],
  "store-locator": ["stores-admin"],
  "stripe-checkout": ["stripe-admin"],
  "submissions-queue": ["moderation"],
  "survey": ["survey-admin"],
  "team": ["team-admin"],
  "testimonials": ["testimonials-admin"],
  "timeline": ["timeline-admin"],
  "video": ["videos-admin"],
  "waitlist": ["waitlist-admin"],
  "webview": ["webviews"],
  "whatsapp-order": ["wa-orders"],
};

const AUTH_MARKER = "<!--nk:require-auth-->";
const ROLE_MARKER_RE = /<!--\s*nk:require-role:[a-zA-Z0-9_-]+\s*-->/;

export function isOwnerOnlyPage(moduleId: string, page: { slug: string; ownerOnly?: boolean }): boolean {
  return Boolean(page.ownerOnly) || (OWNER_ONLY_PAGES[moduleId]?.includes(page.slug) ?? false);
}

/** Puts the sign-in and admin markers at the top of a page's HTML. */
export function withAdminMarkers(html: string): string {
  let body = html.replace(AUTH_MARKER, "").replace(ROLE_MARKER_RE, "").replace(/^\s+/, "");
  body = `${AUTH_MARKER}\n<!--nk:require-role:admin-->\n${body}`;
  return body;
}

/** Links on visitor pages that lead to owner-only pages are shown to admins only. */
export function hideOwnerLinks(html: string, ownerSlugs: string[]): string {
  if (ownerSlugs.length === 0) return html;
  const alt = ownerSlugs.map((x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const re = new RegExp(`<a\\b([^>]*?\\bhref=["'](?:\\.?\\/)(?:${alt})(?:[?#][^"']*)?["'][^>]*)>`, "gi");
  return html.replace(re, (tag: string, inner: string) => (/\bdata-nk-role=/.test(inner) ? tag : `<a${inner} data-nk-role="admin" hidden>`));
}
