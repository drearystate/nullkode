// Brand configuration — name, tagline, logos, favicon, theme colors.
// Lives in the Setting table so admins can edit it live from the UI
// without code changes or redeploys. Fork-friendly: the defaults below
// are Nullkode's; any deployment can override every field.

import { getSetting, setSetting } from "./settings";

export const BRAND_KEYS = {
  APP_NAME: "brand.appName",
  TAGLINE: "brand.tagline",
  // Inline images as data URLs so we don't need a separate uploads dir
  // or storage backend. Reasonable for icons/logos that are a few KB.
  LOGO_DATA_URL: "brand.logoDataUrl",
  LOGO_WIDE_DATA_URL: "brand.logoWideDataUrl",
  FAVICON_DATA_URL: "brand.faviconDataUrl",
  // Colors — full hex. We inject them as CSS custom properties.
  COLOR_PRIMARY: "brand.colorPrimary",
  COLOR_PRIMARY_HOVER: "brand.colorPrimaryHover",
  COLOR_ACCENT: "brand.colorAccent",
  COLOR_SURFACE_BG: "brand.colorSurfaceBg",
  COLOR_SURFACE_FG: "brand.colorSurfaceFg",
  // Footer / SEO bits.
  HOMEPAGE_URL: "brand.homepageUrl",
  SUPPORT_EMAIL: "brand.supportEmail",
} as const;

export interface BrandConfig {
  appName: string;
  tagline: string;
  logoDataUrl: string | null;
  logoWideDataUrl: string | null;
  faviconDataUrl: string | null;
  colorPrimary: string;
  colorPrimaryHover: string;
  colorAccent: string;
  colorSurfaceBg: string;
  colorSurfaceFg: string;
  homepageUrl: string | null;
  supportEmail: string | null;
}

export const BRAND_DEFAULTS: BrandConfig = {
  appName: "Nullkode",
  tagline: "Visual app builder with real backends",
  logoDataUrl: null,
  logoWideDataUrl: null,
  faviconDataUrl: null,
  colorPrimary: "#843dff",
  colorPrimaryHover: "#9f75ff",
  colorAccent: "#06b6d4",
  colorSurfaceBg: "#0a0a14",
  colorSurfaceFg: "#f1f1f6",
  homepageUrl: null,
  supportEmail: null,
};

// Validate hex colors. Accept #rgb, #rrggbb, #rrggbbaa.
const HEX_RE = /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

export function safeHex(v: unknown, fallback: string): string {
  if (typeof v === "string" && HEX_RE.test(v)) return v;
  return fallback;
}

export function safeString(v: unknown, fallback: string, maxLen = 200): string {
  if (typeof v === "string" && v.length > 0 && v.length <= maxLen) return v;
  return fallback;
}

export function safeOptionalString(v: unknown, maxLen = 2000): string | null {
  if (typeof v !== "string" || v.length === 0) return null;
  if (v.length > maxLen) return v.slice(0, maxLen);
  return v;
}

// Data URLs can be large (icons up to ~50KB) so use a generous cap.
export function safeDataUrl(v: unknown): string | null {
  if (typeof v !== "string" || v.length === 0) return null;
  if (!v.startsWith("data:")) return null;
  if (v.length > 200_000) return null; // 200KB hard cap
  return v;
}

// Cache for hot reads — invalidated on every write.
let cache: BrandConfig | null = null;

export async function getBrand(): Promise<BrandConfig> {
  if (cache) return cache;
  const [
    appName,
    tagline,
    logoDataUrl,
    logoWideDataUrl,
    faviconDataUrl,
    colorPrimary,
    colorPrimaryHover,
    colorAccent,
    colorSurfaceBg,
    colorSurfaceFg,
    homepageUrl,
    supportEmail,
  ] = await Promise.all([
    getSetting<string>(BRAND_KEYS.APP_NAME),
    getSetting<string>(BRAND_KEYS.TAGLINE),
    getSetting<string>(BRAND_KEYS.LOGO_DATA_URL),
    getSetting<string>(BRAND_KEYS.LOGO_WIDE_DATA_URL),
    getSetting<string>(BRAND_KEYS.FAVICON_DATA_URL),
    getSetting<string>(BRAND_KEYS.COLOR_PRIMARY),
    getSetting<string>(BRAND_KEYS.COLOR_PRIMARY_HOVER),
    getSetting<string>(BRAND_KEYS.COLOR_ACCENT),
    getSetting<string>(BRAND_KEYS.COLOR_SURFACE_BG),
    getSetting<string>(BRAND_KEYS.COLOR_SURFACE_FG),
    getSetting<string>(BRAND_KEYS.HOMEPAGE_URL),
    getSetting<string>(BRAND_KEYS.SUPPORT_EMAIL),
  ]);

  cache = {
    appName: safeString(appName, BRAND_DEFAULTS.appName, 80),
    tagline: safeString(tagline, BRAND_DEFAULTS.tagline, 300),
    logoDataUrl: safeDataUrl(logoDataUrl),
    logoWideDataUrl: safeDataUrl(logoWideDataUrl),
    faviconDataUrl: safeDataUrl(faviconDataUrl),
    colorPrimary: safeHex(colorPrimary, BRAND_DEFAULTS.colorPrimary),
    colorPrimaryHover: safeHex(colorPrimaryHover, BRAND_DEFAULTS.colorPrimaryHover),
    colorAccent: safeHex(colorAccent, BRAND_DEFAULTS.colorAccent),
    colorSurfaceBg: safeHex(colorSurfaceBg, BRAND_DEFAULTS.colorSurfaceBg),
    colorSurfaceFg: safeHex(colorSurfaceFg, BRAND_DEFAULTS.colorSurfaceFg),
    homepageUrl: safeOptionalString(homepageUrl),
    supportEmail: safeOptionalString(supportEmail, 200),
  };
  return cache;
}

export interface BrandPatch {
  appName?: string;
  tagline?: string;
  logoDataUrl?: string | null;
  logoWideDataUrl?: string | null;
  faviconDataUrl?: string | null;
  colorPrimary?: string;
  colorPrimaryHover?: string;
  colorAccent?: string;
  colorSurfaceBg?: string;
  colorSurfaceFg?: string;
  homepageUrl?: string | null;
  supportEmail?: string | null;
}

export async function updateBrand(patch: BrandPatch): Promise<BrandConfig> {
  const ops: Array<Promise<void>> = [];
  if (patch.appName !== undefined) ops.push(setSetting(BRAND_KEYS.APP_NAME, patch.appName));
  if (patch.tagline !== undefined) ops.push(setSetting(BRAND_KEYS.TAGLINE, patch.tagline));
  if (patch.logoDataUrl !== undefined)
    ops.push(setSetting(BRAND_KEYS.LOGO_DATA_URL, patch.logoDataUrl ?? ""));
  if (patch.logoWideDataUrl !== undefined)
    ops.push(setSetting(BRAND_KEYS.LOGO_WIDE_DATA_URL, patch.logoWideDataUrl ?? ""));
  if (patch.faviconDataUrl !== undefined)
    ops.push(setSetting(BRAND_KEYS.FAVICON_DATA_URL, patch.faviconDataUrl ?? ""));
  if (patch.colorPrimary !== undefined)
    ops.push(setSetting(BRAND_KEYS.COLOR_PRIMARY, patch.colorPrimary));
  if (patch.colorPrimaryHover !== undefined)
    ops.push(setSetting(BRAND_KEYS.COLOR_PRIMARY_HOVER, patch.colorPrimaryHover));
  if (patch.colorAccent !== undefined)
    ops.push(setSetting(BRAND_KEYS.COLOR_ACCENT, patch.colorAccent));
  if (patch.colorSurfaceBg !== undefined)
    ops.push(setSetting(BRAND_KEYS.COLOR_SURFACE_BG, patch.colorSurfaceBg));
  if (patch.colorSurfaceFg !== undefined)
    ops.push(setSetting(BRAND_KEYS.COLOR_SURFACE_FG, patch.colorSurfaceFg));
  if (patch.homepageUrl !== undefined)
    ops.push(setSetting(BRAND_KEYS.HOMEPAGE_URL, patch.homepageUrl ?? ""));
  if (patch.supportEmail !== undefined)
    ops.push(setSetting(BRAND_KEYS.SUPPORT_EMAIL, patch.supportEmail ?? ""));
  await Promise.all(ops);
  cache = null;
  return getBrand();
}

/**
 * Render a CSS string that maps brand-configured colors to the CSS
 * custom properties the rest of the UI reads. Inject in the root layout
 * inside an inline <style> tag so it ships in the first byte.
 */
export function brandCssVars(brand: BrandConfig): string {
  const hex = brand.colorPrimary.replace("#", "");
  const rgb = hex.length === 6 ? [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16)) : [132, 61, 255];
  const light = (rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 1000 > 155;
  return `:root {
  --nk-brand-on-primary: ${light ? "#15151e" : "#ffffff"};
  --nk-brand-primary: ${brand.colorPrimary};
  --nk-brand-primary-hover: ${brand.colorPrimaryHover};
  --nk-brand-accent: ${brand.colorAccent};
  --nk-surface-bg: ${brand.colorSurfaceBg};
  --nk-surface-fg: ${brand.colorSurfaceFg};
}`;
}
