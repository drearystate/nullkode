import defaults from "tailwindcss/colors";

/**
 * The studio's colours, in dark and light.
 *
 * Every Tailwind colour the studio uses is a CSS variable, so one class
 * (text-surface-400, bg-red-500/10, text-white…) works in both themes.
 * Dark is the default (no attribute, or data-theme="dark") and keeps the
 * studio's original look. Under data-theme="light" each palette is mirrored
 * (50↔950, 100↔900 … 400↔600): a light shade used for text on dark becomes
 * the matching dark shade on light, so contrast holds. `white` becomes ink,
 * because the studio uses it for "strongest text" and faint overlays.
 * `black` (scrims, shadows) and `fixed-white` / `fixed-black` (text on a
 * coloured button) never change.
 *
 * Published apps don't load the studio's stylesheet, so none of this reaches
 * them.
 */

const SHADES = ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"] as const;
const MIRROR: Record<string, string> = { "50": "950", "100": "900", "200": "800", "300": "700", "400": "600", "500": "500", "600": "400", "700": "300", "800": "200", "900": "100", "950": "50" };

export const BRAND: Record<string, string> = {
  50: "#f3f1ff", 100: "#ebe5ff", 200: "#d9ceff", 300: "#bea6ff", 400: "#9f75ff", 500: "#843dff",
  600: "#7919ff", 700: "#6b04fd", 800: "#5a03d5", 900: "#4b05ad", 950: "#2c0076",
};

/** Surfaces and text. Dark is the studio's original scale; light is tuned by hand, not mirrored. */
const SURFACE_DARK: Record<string, string> = {
  0: "#ffffff", 50: "#f8f8fb", 100: "#f1f1f6", 200: "#e5e5ee", 300: "#d1d1de", 400: "#9c9cb0",
  500: "#7e7e94", 600: "#4a4a5e", 700: "#323244", 800: "#1e1e2d", 900: "#121220", 950: "#0a0a14",
};
const SURFACE_LIGHT: Record<string, string> = {
  0: "#0a0a14", 50: "#101019", 100: "#1a1a27", 200: "#2b2b3b", 300: "#40404f", 400: "#5b5b6f",
  500: "#6c6c80", 600: "#a9a9ba", 700: "#d3d3de", 800: "#e7e7ef", 900: "#ffffff", 950: "#f5f5f9",
};

const PALETTES = [
  "slate", "gray", "zinc", "neutral", "stone", "red", "orange", "amber", "yellow", "lime", "green", "emerald",
  "teal", "cyan", "sky", "blue", "indigo", "violet", "purple", "fuchsia", "pink", "rose",
] as const;

function rgb(hex: string): string {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)).join(" ");
}

const v = (name: string) => `rgb(var(--c-${name}) / <alpha-value>)`;

/** Tailwind `colors`: every palette as variables. */
export function themeColors() {
  const colors: Record<string, string | Record<string, string>> = {
    transparent: "transparent",
    current: "currentColor",
    inherit: "inherit",
    white: v("white"),
    black: v("black"),
    "fixed-white": "#ffffff",
    "fixed-black": "#000000",
  };
  const scale = (name: string, keys: readonly string[]) => Object.fromEntries(keys.map((s) => [s, v(`${name}-${s}`)]));
  colors.surface = scale("surface", Object.keys(SURFACE_DARK));
  colors.brand = scale("brand", SHADES);
  for (const p of PALETTES) colors[p] = scale(p, SHADES);
  return colors;
}

/** The variables, for :root (dark) and [data-theme="light"]. */
export function themeVariables(): { dark: Record<string, string>; light: Record<string, string> } {
  const dark: Record<string, string> = { "--c-white": rgb("#ffffff"), "--c-black": rgb("#000000") };
  const light: Record<string, string> = { "--c-white": rgb("#0f0f1a"), "--c-black": rgb("#000000") };
  for (const [s, hex] of Object.entries(SURFACE_DARK)) dark[`--c-surface-${s}`] = rgb(hex);
  for (const [s, hex] of Object.entries(SURFACE_LIGHT)) light[`--c-surface-${s}`] = rgb(hex);
  for (const s of SHADES) {
    dark[`--c-brand-${s}`] = rgb(BRAND[s]);
    light[`--c-brand-${s}`] = rgb(BRAND[MIRROR[s]]);
  }
  for (const p of PALETTES) {
    const pal = defaults[p] as Record<string, string>;
    for (const s of SHADES) {
      dark[`--c-${p}-${s}`] = rgb(pal[s]);
      light[`--c-${p}-${s}`] = rgb(pal[MIRROR[s]]);
    }
  }
  return { dark, light };
}
