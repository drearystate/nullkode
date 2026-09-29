/**
 * Which guide belongs to which screen. The top bar's Help link opens the
 * guide for the page you're on; the guides themselves are in ./guides.ts.
 */

export const GUIDE_SLUGS = [
  "getting-started",
  "ai-designer",
  "page-editor",
  "look-and-feel",
  "features",
  "forms-and-data",
  "flows",
  "members-and-sign-in",
  "publishing",
  "custom-domains",
  "phone-apps",
  "account-and-billing",
  "running-your-platform",
  "white-label",
  "resellers",
  "prices-and-payments",
  "ai-settings",
  "email",
] as const;

export type GuideSlug = (typeof GUIDE_SLUGS)[number];

const PROJECT_TABS: Array<[RegExp, GuideSlug]> = [
  [/^\/designer(?:\/|$)/, "ai-designer"],
  [/^\/pages(?:\/|$)/, "page-editor"],
  [/^\/theme(?:\/|$)/, "look-and-feel"],
  [/^\/modules(?:\/|$)/, "features"],
  [/^\/data(?:\/|$)/, "forms-and-data"],
  [/^\/flows(?:\/|$)/, "flows"],
  [/^\/publish(?:\/|$)/, "publishing"],
  [/^\/domains(?:\/|$)/, "custom-domains"],
  [/^\/(?:native|notifications)(?:\/|$)/, "phone-apps"],
];

/** The guide for a studio path, or null for the guide list. */
export function guideForPath(pathname: string): GuideSlug | null {
  const project = pathname.match(/^\/projects\/[^/]+(\/.*)?$/);
  if (project) {
    const rest = project[1] ?? "";
    for (const [re, slug] of PROJECT_TABS) if (re.test(rest)) return slug;
    return "getting-started";
  }
  if (/^\/designer(?:\/|$)/.test(pathname)) return "ai-designer";
  if (/^\/(?:dashboard|new)(?:\/|$)/.test(pathname) || pathname === "/") return "getting-started";
  if (/^\/(?:billing|account)(?:\/|$)/.test(pathname)) return "account-and-billing";
  if (/^\/reseller\/billing(?:\/|$)/.test(pathname)) return "prices-and-payments";
  if (/^\/reseller\/(?:branding|domain)(?:\/|$)/.test(pathname)) return "white-label";
  if (/^\/reseller(?:\/|$)/.test(pathname)) return "resellers";
  if (/^\/admin\/resellers(?:\/|$)/.test(pathname)) return "resellers";
  if (/^\/admin(?:\/|$)/.test(pathname)) return "running-your-platform";
  return null;
}

export function helpHref(pathname: string): string {
  if (pathname.startsWith("/help")) return "/help";
  const slug = guideForPath(pathname);
  return slug ? `/help/${slug}` : "/help";
}
