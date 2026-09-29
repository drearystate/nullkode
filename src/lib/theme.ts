/**
 * Project theming. Every project gets a full design system (colors,
 * fonts, radii, mode) that overrides the defaults in /nk-public.css.
 *
 * Because nk-public.css is written entirely with CSS custom properties,
 * re-skinning a whole project means emitting a single :root { } block
 * with the project's tokens. That block cascades to every page
 * automatically — no per-page CSS changes needed. We also pull in any
 * Google Fonts the theme needs via @import at the top of the CSS.
 */

export type ThemeMode = "light" | "dark";

export type ProjectTheme = {
  name?: string;
  mode?: ThemeMode;

  primary?: string;
  primary2?: string;
  accent?: string;

  bg?: string;
  surface?: string;
  surface2?: string;
  border?: string;
  text?: string;
  textMuted?: string;

  font?: string;
  fontDisplay?: string;
  /** Google Fonts families (e.g. ["Inter:wght@400;600;800", "Playfair Display:wght@700"]) */
  googleFonts?: string[];

  radius?: string;
  radiusSm?: string;

  /** Optional dark-mode counterpart. Stored inline so no schema change needed. */
  dark?: Omit<ProjectTheme, "dark">;
};

/** Theme with all base fields required, but `dark` stays optional. Used for presets/defaults. */
export type ResolvedTheme = Required<Omit<ProjectTheme, "dark">> & { dark?: Omit<ProjectTheme, "dark"> };

/**
 * Reusable font stacks. Anything referenced here that needs a Google
 * Font import just lists the family in `googleFonts` on the preset.
 */
const F = {
  inter: `"Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif`,
  poppins: `"Poppins", ui-sans-serif, system-ui, sans-serif`,
  dmSans: `"DM Sans", ui-sans-serif, system-ui, sans-serif`,
  spaceGrotesk: `"Space Grotesk", ui-sans-serif, system-ui, sans-serif`,
  manrope: `"Manrope", ui-sans-serif, system-ui, sans-serif`,
  workSans: `"Work Sans", ui-sans-serif, system-ui, sans-serif`,
  outfit: `"Outfit", ui-sans-serif, system-ui, sans-serif`,
  jakarta: `"Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif`,
  archivo: `"Archivo", ui-sans-serif, system-ui, sans-serif`,
  archivoBlack: `"Archivo Black", ui-sans-serif, system-ui, sans-serif`,
  system: `ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", sans-serif`,

  playfair: `"Playfair Display", Georgia, "Times New Roman", serif`,
  fraunces: `"Fraunces", Georgia, "Times New Roman", serif`,
  lora: `"Lora", Georgia, "Times New Roman", serif`,
  cormorant: `"Cormorant Garamond", Georgia, "Times New Roman", serif`,
  dmSerif: `"DM Serif Display", Georgia, "Times New Roman", serif`,
  georgia: `Georgia, "Times New Roman", serif`,

  bebas: `"Bebas Neue", Impact, "Arial Narrow", sans-serif`,
  abril: `"Abril Fatface", Georgia, serif`,
  righteous: `"Righteous", "Arial Black", sans-serif`,

  jetbrains: `"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`,
  ibmMono: `"IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`,
};

export const DEFAULT_THEME: ResolvedTheme = {
  name: "Nullkode Classic",
  mode: "light",
  primary: "#7c3aed",
  primary2: "#6d28d9",
  accent: "#22d3ee",
  bg: "#fafafa",
  surface: "#ffffff",
  surface2: "#f5f5f7",
  border: "#ececef",
  text: "#0f0f14",
  textMuted: "#6b6b7a",
  font: F.inter,
  fontDisplay: F.inter,
  googleFonts: ["Inter:wght@400;500;600;700;800"],
  radius: "14px",
  radiusSm: "10px",
};

/**
 * Curated theme gallery. Users pick one as a starting point and then
 * tweak tokens from there. Every theme declares a mode so dark themes
 * can emit `color-scheme: dark` and inherit sensible form defaults.
 */
export const THEME_PRESETS: Array<ResolvedTheme> = [
  { ...DEFAULT_THEME },

  // ── LIGHT ───────────────────────────────────────────────────────────
  {
    name: "Clean Slate",
    mode: "light",
    primary: "#111827",
    primary2: "#000000",
    accent: "#6b7280",
    bg: "#ffffff",
    surface: "#ffffff",
    surface2: "#f9fafb",
    border: "#e5e7eb",
    text: "#0a0a0a",
    textMuted: "#6b7280",
    font: F.inter,
    fontDisplay: F.inter,
    googleFonts: ["Inter:wght@400;500;600;700;800"],
    radius: "4px",
    radiusSm: "3px",
  },
  {
    name: "Corporate Trust",
    mode: "light",
    primary: "#2563eb",
    primary2: "#1d4ed8",
    accent: "#0ea5e9",
    bg: "#f8fafc",
    surface: "#ffffff",
    surface2: "#f1f5f9",
    border: "#e2e8f0",
    text: "#0f172a",
    textMuted: "#64748b",
    font: F.dmSans,
    fontDisplay: F.dmSans,
    googleFonts: ["DM Sans:wght@400;500;700"],
    radius: "6px",
    radiusSm: "4px",
  },
  {
    name: "Warm Earth",
    mode: "light",
    primary: "#c2410c",
    primary2: "#9a3412",
    accent: "#f59e0b",
    bg: "#fef7ed",
    surface: "#ffffff",
    surface2: "#fef3e2",
    border: "#f3e1c4",
    text: "#1c1410",
    textMuted: "#78625b",
    font: F.workSans,
    fontDisplay: F.playfair,
    googleFonts: ["Work Sans:wght@400;500;600", "Playfair Display:wght@700;900"],
    radius: "8px",
    radiusSm: "6px",
  },
  {
    name: "Cherry Blossom",
    mode: "light",
    primary: "#db2777",
    primary2: "#be185d",
    accent: "#f472b6",
    bg: "#fff1f5",
    surface: "#ffffff",
    surface2: "#ffe4ec",
    border: "#fbcfe2",
    text: "#2a0a1a",
    textMuted: "#9d4e6c",
    font: F.poppins,
    fontDisplay: F.cormorant,
    googleFonts: ["Poppins:wght@400;500;700", "Cormorant Garamond:wght@500;700"],
    radius: "16px",
    radiusSm: "10px",
  },
  {
    name: "Ocean Breeze",
    mode: "light",
    primary: "#0891b2",
    primary2: "#0e7490",
    accent: "#06b6d4",
    bg: "#f0fdff",
    surface: "#ffffff",
    surface2: "#ecfeff",
    border: "#cffafe",
    text: "#083344",
    textMuted: "#4b7a8a",
    font: F.manrope,
    fontDisplay: F.manrope,
    googleFonts: ["Manrope:wght@400;500;700;800"],
    radius: "12px",
    radiusSm: "8px",
  },
  {
    name: "Forest",
    mode: "light",
    primary: "#15803d",
    primary2: "#166534",
    accent: "#84cc16",
    bg: "#f7fbf4",
    surface: "#ffffff",
    surface2: "#f1f7ec",
    border: "#dbe9cf",
    text: "#0b1d0b",
    textMuted: "#546b54",
    font: F.workSans,
    fontDisplay: F.fraunces,
    googleFonts: ["Work Sans:wght@400;500;600", "Fraunces:wght@500;700;900"],
    radius: "10px",
    radiusSm: "6px",
  },
  {
    name: "Spring Garden",
    mode: "light",
    primary: "#65a30d",
    primary2: "#4d7c0f",
    accent: "#f59e0b",
    bg: "#fafff2",
    surface: "#ffffff",
    surface2: "#f4fbe6",
    border: "#e3f2c7",
    text: "#1a2608",
    textMuted: "#667245",
    font: F.outfit,
    fontDisplay: F.outfit,
    googleFonts: ["Outfit:wght@400;500;700;800"],
    radius: "14px",
    radiusSm: "10px",
  },
  {
    name: "Sunset",
    mode: "light",
    primary: "#ea580c",
    primary2: "#c2410c",
    accent: "#f43f5e",
    bg: "#fff7ed",
    surface: "#ffffff",
    surface2: "#ffedd5",
    border: "#fed7aa",
    text: "#1f0b05",
    textMuted: "#8a5a44",
    font: F.jakarta,
    fontDisplay: F.abril,
    googleFonts: ["Plus Jakarta Sans:wght@400;500;700", "Abril Fatface"],
    radius: "20px",
    radiusSm: "12px",
  },
  {
    name: "Autumn Gold",
    mode: "light",
    primary: "#b45309",
    primary2: "#92400e",
    accent: "#dc2626",
    bg: "#fffbeb",
    surface: "#ffffff",
    surface2: "#fef3c7",
    border: "#fde68a",
    text: "#1a1205",
    textMuted: "#847046",
    font: F.lora,
    fontDisplay: F.playfair,
    googleFonts: ["Lora:wght@400;500;600", "Playfair Display:wght@700;900"],
    radius: "8px",
    radiusSm: "6px",
  },
  {
    name: "Rose Gold",
    mode: "light",
    primary: "#e11d48",
    primary2: "#be123c",
    accent: "#f59e0b",
    bg: "#fff7f8",
    surface: "#ffffff",
    surface2: "#fff0f2",
    border: "#fecdd5",
    text: "#1c0a0e",
    textMuted: "#8a5861",
    font: F.jakarta,
    fontDisplay: F.dmSerif,
    googleFonts: ["Plus Jakarta Sans:wght@400;500;700", "DM Serif Display"],
    radius: "16px",
    radiusSm: "10px",
  },
  {
    name: "Newspaper",
    mode: "light",
    primary: "#111111",
    primary2: "#000000",
    accent: "#b91c1c",
    bg: "#f7f5f0",
    surface: "#fffdf7",
    surface2: "#f0ede5",
    border: "#d9d5c7",
    text: "#0a0a0a",
    textMuted: "#555148",
    font: F.georgia,
    fontDisplay: F.playfair,
    googleFonts: ["Playfair Display:wght@700;900"],
    radius: "2px",
    radiusSm: "2px",
  },
  {
    name: "Minimal Mono",
    mode: "light",
    primary: "#111827",
    primary2: "#000000",
    accent: "#6b7280",
    bg: "#ffffff",
    surface: "#ffffff",
    surface2: "#f9fafb",
    border: "#e5e7eb",
    text: "#0a0a0a",
    textMuted: "#6b7280",
    font: F.jetbrains,
    fontDisplay: F.jetbrains,
    googleFonts: ["JetBrains Mono:wght@400;500;700"],
    radius: "2px",
    radiusSm: "2px",
  },
  {
    name: "Brutalist",
    mode: "light",
    primary: "#facc15",
    primary2: "#eab308",
    accent: "#ef4444",
    bg: "#ffffff",
    surface: "#ffffff",
    surface2: "#fafafa",
    border: "#000000",
    text: "#000000",
    textMuted: "#404040",
    font: F.archivo,
    fontDisplay: F.archivoBlack,
    googleFonts: ["Archivo:wght@400;500;700", "Archivo Black"],
    radius: "0px",
    radiusSm: "0px",
  },
  {
    name: "Pastel Dream",
    mode: "light",
    primary: "#a78bfa",
    primary2: "#8b5cf6",
    accent: "#f472b6",
    bg: "#fdfaff",
    surface: "#ffffff",
    surface2: "#f5f0ff",
    border: "#e9d5ff",
    text: "#1a0a2e",
    textMuted: "#8b7aa0",
    font: F.poppins,
    fontDisplay: F.righteous,
    googleFonts: ["Poppins:wght@400;500;600", "Righteous"],
    radius: "24px",
    radiusSm: "16px",
  },
  {
    name: "Gradient Dream",
    mode: "light",
    primary: "#8b5cf6",
    primary2: "#ec4899",
    accent: "#06b6d4",
    bg: "#fafafc",
    surface: "#ffffff",
    surface2: "#f5f3ff",
    border: "#e9d5ff",
    text: "#0f0a1e",
    textMuted: "#6b5a85",
    font: F.spaceGrotesk,
    fontDisplay: F.spaceGrotesk,
    googleFonts: ["Space Grotesk:wght@400;500;700"],
    radius: "18px",
    radiusSm: "12px",
  },
  {
    name: "Desert",
    mode: "light",
    primary: "#a16207",
    primary2: "#854d0e",
    accent: "#dc2626",
    bg: "#fefce8",
    surface: "#ffffff",
    surface2: "#fef9c3",
    border: "#fde68a",
    text: "#1a1605",
    textMuted: "#847046",
    font: F.dmSans,
    fontDisplay: F.fraunces,
    googleFonts: ["DM Sans:wght@400;500;700", "Fraunces:wght@500;700"],
    radius: "10px",
    radiusSm: "6px",
  },
  {
    name: "Electric",
    mode: "light",
    primary: "#0ea5e9",
    primary2: "#0284c7",
    accent: "#facc15",
    bg: "#ffffff",
    surface: "#ffffff",
    surface2: "#f0f9ff",
    border: "#bae6fd",
    text: "#082f49",
    textMuted: "#64748b",
    font: F.spaceGrotesk,
    fontDisplay: F.bebas,
    googleFonts: ["Space Grotesk:wght@400;500;700", "Bebas Neue"],
    radius: "6px",
    radiusSm: "4px",
  },

  // ── DARK ────────────────────────────────────────────────────────────
  {
    name: "Midnight",
    mode: "dark",
    primary: "#a78bfa",
    primary2: "#8b5cf6",
    accent: "#22d3ee",
    bg: "#0a0a14",
    surface: "#14141f",
    surface2: "#1e1e2d",
    border: "#2a2a3a",
    text: "#f1f1f6",
    textMuted: "#9c9cb0",
    font: F.inter,
    fontDisplay: F.inter,
    googleFonts: ["Inter:wght@400;500;600;700;800"],
    radius: "14px",
    radiusSm: "10px",
  },
  {
    name: "Midnight Blue",
    mode: "dark",
    primary: "#60a5fa",
    primary2: "#3b82f6",
    accent: "#22d3ee",
    bg: "#020617",
    surface: "#0f172a",
    surface2: "#1e293b",
    border: "#334155",
    text: "#f1f5f9",
    textMuted: "#94a3b8",
    font: F.dmSans,
    fontDisplay: F.dmSans,
    googleFonts: ["DM Sans:wght@400;500;700"],
    radius: "8px",
    radiusSm: "6px",
  },
  {
    name: "Charcoal & Amber",
    mode: "dark",
    primary: "#f59e0b",
    primary2: "#d97706",
    accent: "#fbbf24",
    bg: "#0c0c0e",
    surface: "#17171a",
    surface2: "#222226",
    border: "#33333a",
    text: "#fafafa",
    textMuted: "#a1a1aa",
    font: F.manrope,
    fontDisplay: F.manrope,
    googleFonts: ["Manrope:wght@400;500;700;800"],
    radius: "10px",
    radiusSm: "6px",
  },
  {
    name: "Bold Neon",
    mode: "dark",
    primary: "#ec4899",
    primary2: "#db2777",
    accent: "#22d3ee",
    bg: "#0f0f1a",
    surface: "#1a1a2e",
    surface2: "#252541",
    border: "#3a3a5a",
    text: "#f0f0ff",
    textMuted: "#a0a0c0",
    font: F.spaceGrotesk,
    fontDisplay: F.spaceGrotesk,
    googleFonts: ["Space Grotesk:wght@400;500;700"],
    radius: "18px",
    radiusSm: "12px",
  },
  {
    name: "Terminal Green",
    mode: "dark",
    primary: "#22c55e",
    primary2: "#16a34a",
    accent: "#84cc16",
    bg: "#020a04",
    surface: "#0a1a0e",
    surface2: "#102818",
    border: "#1d3a22",
    text: "#d1fae5",
    textMuted: "#6b9476",
    font: F.jetbrains,
    fontDisplay: F.jetbrains,
    googleFonts: ["JetBrains Mono:wght@400;500;700"],
    radius: "2px",
    radiusSm: "2px",
  },
  {
    name: "Ocean Depths",
    mode: "dark",
    primary: "#06b6d4",
    primary2: "#0891b2",
    accent: "#22d3ee",
    bg: "#030b14",
    surface: "#0b1a26",
    surface2: "#122838",
    border: "#1e3a52",
    text: "#e0f7ff",
    textMuted: "#7a9aae",
    font: F.manrope,
    fontDisplay: F.manrope,
    googleFonts: ["Manrope:wght@400;500;700"],
    radius: "12px",
    radiusSm: "8px",
  },
  {
    name: "Forest Dark",
    mode: "dark",
    primary: "#34d399",
    primary2: "#10b981",
    accent: "#a3e635",
    bg: "#031008",
    surface: "#0a1d12",
    surface2: "#132a1d",
    border: "#1f3f2b",
    text: "#d1fae5",
    textMuted: "#6b8676",
    font: F.workSans,
    fontDisplay: F.fraunces,
    googleFonts: ["Work Sans:wght@400;500;600", "Fraunces:wght@500;700"],
    radius: "10px",
    radiusSm: "6px",
  },
  {
    name: "Purple Rain",
    mode: "dark",
    primary: "#c084fc",
    primary2: "#a855f7",
    accent: "#f0abfc",
    bg: "#0e0520",
    surface: "#1a0b33",
    surface2: "#261448",
    border: "#3e2163",
    text: "#f3e8ff",
    textMuted: "#a390c0",
    font: F.poppins,
    fontDisplay: F.poppins,
    googleFonts: ["Poppins:wght@400;500;700"],
    radius: "16px",
    radiusSm: "10px",
  },
  {
    name: "Industrial",
    mode: "dark",
    primary: "#f97316",
    primary2: "#ea580c",
    accent: "#fbbf24",
    bg: "#0a0a0a",
    surface: "#141414",
    surface2: "#1c1c1c",
    border: "#2a2a2a",
    text: "#f5f5f5",
    textMuted: "#a3a3a3",
    font: F.archivo,
    fontDisplay: F.archivoBlack,
    googleFonts: ["Archivo:wght@400;500;700", "Archivo Black"],
    radius: "2px",
    radiusSm: "2px",
  },
  {
    name: "Royal",
    mode: "dark",
    primary: "#facc15",
    primary2: "#eab308",
    accent: "#a78bfa",
    bg: "#07071a",
    surface: "#0e0e28",
    surface2: "#171738",
    border: "#2a2a55",
    text: "#fefce8",
    textMuted: "#b0a89a",
    font: F.jakarta,
    fontDisplay: F.playfair,
    googleFonts: ["Plus Jakarta Sans:wght@400;500;700", "Playfair Display:wght@700;900"],
    radius: "10px",
    radiusSm: "6px",
  },
  {
    name: "Cyberpunk",
    mode: "dark",
    primary: "#facc15",
    primary2: "#eab308",
    accent: "#ec4899",
    bg: "#0a0014",
    surface: "#140028",
    surface2: "#1e0040",
    border: "#3a1060",
    text: "#fef9c3",
    textMuted: "#b59dcc",
    font: F.spaceGrotesk,
    fontDisplay: F.bebas,
    googleFonts: ["Space Grotesk:wght@400;500;700", "Bebas Neue"],
    radius: "4px",
    radiusSm: "2px",
  },
  {
    name: "Copper",
    mode: "dark",
    primary: "#fb923c",
    primary2: "#f97316",
    accent: "#fbbf24",
    bg: "#120a05",
    surface: "#1f130a",
    surface2: "#2a1c10",
    border: "#3e2c1c",
    text: "#fef3e2",
    textMuted: "#a58668",
    font: F.lora,
    fontDisplay: F.dmSerif,
    googleFonts: ["Lora:wght@400;500;600", "DM Serif Display"],
    radius: "8px",
    radiusSm: "5px",
  },
  {
    name: "Monochrome",
    mode: "dark",
    primary: "#fafafa",
    primary2: "#e5e5e5",
    accent: "#a3a3a3",
    bg: "#000000",
    surface: "#0a0a0a",
    surface2: "#141414",
    border: "#262626",
    text: "#fafafa",
    textMuted: "#a3a3a3",
    font: F.inter,
    fontDisplay: F.inter,
    googleFonts: ["Inter:wght@400;500;600;700;800"],
    radius: "4px",
    radiusSm: "3px",
  },
];

/**
 * Build the Google Fonts @import URL for a theme. Returns "" if the
 * theme has no custom fonts.
 */
function googleFontsImport(families: string[]): string {
  if (!families || families.length === 0) return "";
  // Families may be written "Bebas Neue" or, as Google's own URLs do,
  // "Bebas+Neue". Normalise to spaces first — encoding a literal "+" as %2B
  // makes Google reject the whole request (and no font loads).
  const qs = families
    .map((f) => f.trim().replace(/\+/g, " "))
    .filter(Boolean)
    .map((f) => `family=${encodeURIComponent(f).replace(/%20/g, "+").replace(/%3A/gi, ":").replace(/%40/g, "@").replace(/%3B/gi, ";").replace(/%2C/gi, ",")}`)
    .join("&");
  return `@import url("https://fonts.googleapis.com/css2?${qs}&display=swap");\n`;
}

/**
 * Auto-pair a light theme with a suitable dark theme (or vice versa).
 * Used when the user hasn't explicitly picked a dark counterpart.
 */
export function autoPairTheme(theme: ProjectTheme): ResolvedTheme | null {
  const targetMode = theme.mode === "dark" ? "light" : "dark";
  // Try to find a preset in the opposite mode
  return THEME_PRESETS.find((p) => p.mode === targetMode) ?? null;
}

/**
 * Text colour for filled primary buttons: white, unless white would be
 * clearly unreadable on the colour (under 3:1 WCAG contrast, e.g. lime,
 * gold, mint, light pastels), then near-black. Mid-tones keep the white
 * text people expect on a coloured button.
 */
export function onColor(color: string): string {
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim())?.[1];
  if (!hex) return "#ffffff";
  const full = hex.length === 3 ? hex.split("").map((c) => c + c).join("") : hex;
  const lin = (i: number) => {
    const c = parseInt(full.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const l = 0.2126 * lin(0) + 0.7152 * lin(2) + 0.0722 * lin(4);
  return 1.05 / (l + 0.05) >= 3 ? "#ffffff" : "#111111";
}

function themeVarsBlock(t: ResolvedTheme, selector: string, colorScheme: string): string {
  return `${selector}{
  color-scheme: ${colorScheme};
  --nk-mode: ${t.mode};
  --nk-bg: ${t.bg};
  --nk-surface: ${t.surface};
  --nk-surface-2: ${t.surface2};
  --nk-border: ${t.border};
  --nk-text: ${t.text};
  --nk-text-muted: ${t.textMuted};
  --nk-primary: ${t.primary};
  --nk-primary-2: ${t.primary2};
  --nk-on-primary: ${onColor(t.primary)};
  --nk-on-primary-2: ${onColor(t.primary2)};
  --nk-accent: ${t.accent};
  --nk-on-accent: ${onColor(t.accent)};
  --nk-radius: ${t.radius};
  --nk-radius-sm: ${t.radiusSm};
  --nk-font: ${t.font};
  --nk-font-display: ${t.fontDisplay};
}`;
}

/**
 * Merge a project's theme overrides onto the default theme and emit
 * the full CSS payload: Google Font imports, a :root { } block with
 * every token, and Bootstrap/component overrides that read from those
 * tokens. Loaded by both the public page viewer and the GrapeJS editor
 * canvas so what you edit matches what you ship.
 *
 * When `themeDark` is provided, emits a second variable block under
 * `html[data-theme="dark"]` so the toggle switches instantly via CSS.
 */
export function themeToCss(
  theme: ProjectTheme | null | undefined,
  themeDark?: ProjectTheme | null | undefined
): string {
  const t: ResolvedTheme = { ...DEFAULT_THEME, ...(theme ?? {}) };
  const fontImport = googleFontsImport(t.googleFonts);
  const colorScheme = t.mode === "dark" ? "dark" : "light";

  // If no explicit dark pair, auto-pick one
  const dark = themeDark
    ? { ...DEFAULT_THEME, ...themeDark }
    : t.mode === "light"
      ? autoPairTheme(t) ?? null
      : null;

  const darkFontImport = dark?.googleFonts
    ? googleFontsImport(dark.googleFonts.filter((f) => !t.googleFonts?.includes(f)))
    : "";

  const darkBlock = dark
    ? `\n${darkFontImport}${themeVarsBlock(dark as ResolvedTheme, 'html[data-theme="dark"]', "dark")}\n`
    : "";

  return `${fontImport}${themeVarsBlock(t, ":root", colorScheme)}
${darkBlock}
html, body { background: var(--nk-bg); color: var(--nk-text); font-family: var(--nk-font); }
h1,h2,h3,h4,h5,h6,.display-1,.display-2,.display-3,.display-4,.display-5,.display-6 {
  font-family: var(--nk-font-display);
  /* The page text colour by default (body sets it), but a section that sets
     its own colour, like white on a dark band, applies to its headings too. */
  color: inherit;
}
p, li, span, label, small { color: inherit; }
.text-muted, .text-body-secondary { color: var(--nk-text-muted) !important; }
.btn-primary { background: var(--nk-primary); border-color: var(--nk-primary); color: var(--nk-on-primary, #fff); }
.btn-primary:hover, .btn-primary:focus { background: var(--nk-primary-2); border-color: var(--nk-primary-2); color: var(--nk-on-primary-2, #fff); }
.btn-outline-primary { color: var(--nk-primary); border-color: color-mix(in srgb, var(--nk-primary) 45%, var(--nk-border)); }
.btn-outline-primary:hover { background: var(--nk-primary); border-color: var(--nk-primary); color: var(--nk-on-primary, #fff); }
.bg-primary { color: var(--nk-on-primary, #fff); }
.btn { border-radius: var(--nk-radius-sm); }
.text-primary { color: var(--nk-primary) !important; }
.bg-primary { background: var(--nk-primary) !important; }
.bg-light, .bg-body-tertiary, .bg-body-secondary { background: var(--nk-surface-2) !important; color: var(--nk-text) !important; }
.bg-white, .bg-body { background: var(--nk-surface) !important; color: var(--nk-text) !important; }
.bg-dark { background: var(--nk-surface-2) !important; color: var(--nk-text) !important; }
.text-black, .text-dark { color: var(--nk-text) !important; }
.card { background: var(--nk-surface); border-color: var(--nk-border); border-radius: var(--nk-radius); color: var(--nk-text); }
.card-header, .card-footer { background: var(--nk-surface-2); border-color: var(--nk-border); }
.form-control, .form-select, .form-check-input {
  background: var(--nk-surface);
  border-color: var(--nk-border);
  border-radius: var(--nk-radius-sm);
  color: var(--nk-text);
}
.form-control:focus, .form-select:focus {
  background: var(--nk-surface);
  color: var(--nk-text);
  border-color: var(--nk-primary);
  box-shadow: 0 0 0 0.2rem color-mix(in srgb, var(--nk-primary) 25%, transparent);
}
.form-control::placeholder { color: var(--nk-text-muted); }
.form-label { color: var(--nk-text); }
a { color: var(--nk-primary); }
a:hover { color: var(--nk-primary-2); }
hr, .border, .border-top, .border-bottom, .border-start, .border-end { border-color: var(--nk-border) !important; }
.table { color: var(--nk-text); }
.table > :not(caption) > * > * { background: transparent; border-color: var(--nk-border); }
.badge.bg-primary { background: var(--nk-primary) !important; }
::selection { background: color-mix(in srgb, var(--nk-primary) 40%, transparent); color: var(--nk-text); }
`;
}
