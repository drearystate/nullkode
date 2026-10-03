import { z } from "zod";
import { getAIModel, isOfficialOpenAI } from "./client";
import { completeJson } from "./json-call";
import { getAIProvider, getSetting, SETTING_KEYS } from "../settings";
import { THEME_PRESETS, type ProjectTheme } from "../theme";
import { recordAiUsage, refundFailedAi } from "../ai-quota";
import { classifyAiFailure } from "./errors";
import { slugify } from "../utils";
import { languageLabel } from "../app-locale";
import type { AppPlan } from "./plan";
import type { Locale } from "@/i18n/locales";
import { referenceAttachments, saveReferenceBrief, ReferenceImageError, type ImageAttachment, type ReferenceSet } from "./references";
import type { Tr } from "./i18n";

/**
 * Reading reference images (lib/ai/references.ts) for the builders.
 *
 * One vision call per set of images turns them into a VisualBrief: palette,
 * fonts, mood, layout patterns, components and the screens they show. The
 * brief is plain data, so every later step can use it as text, even on a
 * small model: the planner (lib/ai/multi-pass.ts) plans a page per screen,
 * the theme starts from the closest preset with the palette's colours on
 * top (paletteTheme), and every page builder call gets the brief, plus the
 * image of its own screen on full-size models.
 *
 * A model that can't read images is refused up front (aiCanSeeImages,
 * code "images_not_supported"): images are never silently dropped.
 */

/* ───────────────────────── Can the model see? ───────────────────────── */

/** Model names known to read images on OpenAI-compatible servers (local and hosted). */
const VISION_MODEL = /(^|[^a-z])(vl|vision|llava|bakllava|pixtral|minicpm-?v|moondream|internvl|cogvlm|glm-?4\.?\d*v|gemma-?3|gemma-?4|qwen2(\.5)?-?vl|qwen3-?vl|qwen3\.[5-9]|qwen-?vl|llama-?3\.2-?\d+b-?vision|llama-?4|mistral-small-3\.[1-9]|mistral-medium-3|granite-vision|phi-?3\.5-vision|phi-?4-multimodal|gpt-4o|gpt-4\.1|gpt-4\.5|gpt-5|gpt-6|o1(?!-mini)|o3(?!-mini)|o4|claude|gemini)/i;
/** OpenAI's own text-only models. */
const TEXT_ONLY_OPENAI = /(gpt-3\.5|^gpt-4(-\d{4})?$|gpt-4-32k|o1-mini|o3-mini|davinci|babbage|text-)/i;

/**
 * Whether the active AI can read images. Admin → Settings ("ai.vision") or
 * AI_VISION can say "on" or "off"; "auto" (default) knows the command-line
 * provider can, OpenAI's own vision models can, and judges other servers by
 * the model's name (llava, qwen-vl, gemma-3, pixtral…).
 */
export async function aiCanSeeImages(): Promise<boolean> {
  const mode = String((await getSetting<string>(SETTING_KEYS.AI_VISION)) || process.env.AI_VISION || "auto").toLowerCase();
  if (mode === "on" || mode === "true" || mode === "1") return true;
  if (mode === "off" || mode === "false" || mode === "0") return false;
  if ((await getAIProvider()) === "claude-cli") return true;
  let model = "";
  try {
    model = await getAIModel("scaffold");
  } catch {
    return false;
  }
  if (await isOfficialOpenAI().catch(() => false)) return !TEXT_ONLY_OPENAI.test(model);
  return VISION_MODEL.test(model);
}

/** Throws the "can't read images" refusal when the active AI can't. */
export async function assertAiCanSeeImages(t: Tr): Promise<void> {
  if (!(await aiCanSeeImages())) throw new ReferenceImageError("images_not_supported", 400, t("references.errors.notSupported"));
}

/* ───────────────────────── The brief ───────────────────────── */

const text = (max: number) => z.string().transform((s) => s.replace(/\s+/g, " ").trim().slice(0, max));
const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})([0-9a-f]{2})?$/i;

export const VisualBriefSchema = z.object({
  summary: text(400).catch(""),
  /**
   * What kind of product the images show, and any product or brand names
   * visible in them. Never used for building: only the build rule
   * (lib/ai/build-policy.ts) reads it, so a screenshot of a protected
   * product can't slip through as "concept art".
   */
  productKind: text(240).catch(""),
  brandsSeen: z.array(text(60)).catch([]).transform((a) => a.filter(Boolean).slice(0, 8)),
  palette: z
    .array(z.object({ hex: z.string(), role: text(40).catch("") }).passthrough())
    .catch([])
    .transform((list) =>
      list
        .map((c) => {
          const m = HEX.exec(String(c.hex).trim());
          if (!m) return null;
          const h = m[1].length === 3 ? m[1].split("").map((x) => x + x).join("") : m[1];
          return { hex: `#${h.toLowerCase()}`, role: c.role.toLowerCase() };
        })
        .filter((c): c is { hex: string; role: string } => c !== null)
        .filter((c, i, all) => all.findIndex((d) => d.hex === c.hex) === i)
        .slice(0, 10),
    ),
  fonts: z
    .object({ display: text(60).catch(""), body: text(60).catch(""), style: text(120).catch("") })
    .catch({ display: "", body: "", style: "" }),
  mood: z.array(text(30)).catch([]).transform((a) => a.filter(Boolean).slice(0, 8)),
  layout: z.array(text(160)).catch([]).transform((a) => a.filter(Boolean).slice(0, 8)),
  components: z.array(text(80)).catch([]).transform((a) => a.filter(Boolean).slice(0, 16)),
  screens: z
    .array(
      z.object({
        name: text(60),
        purpose: text(200).catch(""),
        imageIndex: z.coerce.number().int().min(0).max(5).catch(0),
        elements: z.array(text(80)).catch([]).transform((a) => a.filter(Boolean).slice(0, 12)),
      }),
    )
    .catch([])
    .transform((a) => a.filter((s) => s.name).slice(0, 12)),
});
export type VisualBrief = z.infer<typeof VisualBriefSchema> & { imageCount?: number };

const BRIEF_SYSTEM = `You are a product designer's assistant. The user attached reference images for an app they want built: concept art, sketches, screenshots of apps they like, or mood boards. Look at every image carefully and describe the look and the screens as ONE JSON object:
{
  "summary": "one or two sentences about the overall look",
  "productKind": "what kind of product or app the images show, in plain words, e.g. 'a food ordering app', 'the editor of a website builder', 'a CRM dashboard with call logs'",
  "brandsSeen": ["product, company or brand names readable in the images, if any"],
  "palette": [{ "hex": "#1f2937", "role": "background" }],
  "fonts": { "display": "closest Google Font for headings", "body": "closest Google Font for body text", "style": "e.g. geometric sans, rounded, serif editorial, handwritten" },
  "mood": ["3-6 single words"],
  "layout": ["layout patterns, e.g. bottom tab bar, card grid with large photos, split hero"],
  "components": ["UI components, e.g. search bar, pill buttons, price tags, avatar list"],
  "screens": [{ "name": "short screen name, e.g. Menu", "purpose": "what the screen is for", "imageIndex": 0, "elements": ["key elements on it, top to bottom"] }]
}
RULES:
- Reply with raw JSON only: start with "{" and end with "}". No prose, no markdown fences.
- palette: 3-8 colours that are really in the images, most important first. role is one of: background, surface, primary, accent, text, muted, border.
- imageIndex is the 0-based position of the image the screen is in (the first image is 0).
- A mood board, a photo or a logo shows no screen: list only real app or web screens. One image may show several screens.
- productKind and brandsSeen are for a review step only: report what you see honestly, even when the images show another company's product.
- Everywhere else, describe the style only: never copy other companies' logos, brand names or trademarks, and never copy their text.`;

/** The person's idea and the app's language, for the vision call. */
function briefUserMessage(prompt: string, count: number, contentLocale: Locale): string {
  const language = contentLocale === "en" ? "" : `\nWrite each screen's "name" and "purpose" in ${languageLabel(contentLocale)} (the app is in that language); everything else in English.`;
  return `The app the user wants: """${prompt.slice(0, 2000)}"""\nThere ${count === 1 ? "is 1 image" : `are ${count} images`}, attached in order (image 1 is imageIndex 0).${language}\n\nRespond with the JSON only.`;
}

/** Asks the AI to read the images. Throws on an unusable answer (lib/ai/errors.ts). */
export async function describeReferences(images: ImageAttachment[], prompt: string, contentLocale: Locale, signal?: AbortSignal): Promise<VisualBrief> {
  const brief = await completeJson(VisualBriefSchema, "reference images", {
    systemPrompt: BRIEF_SYSTEM,
    userMessage: briefUserMessage(prompt, images.length, contentLocale),
    json: true,
    task: "scaffold",
    maxTokens: 2000,
    attachments: images,
    signal,
  });
  return { ...brief, screens: brief.screens.map((s) => ({ ...s, imageIndex: Math.min(s.imageIndex, Math.max(0, images.length - 1)) })), imageCount: images.length };
}

/**
 * The set's brief: the saved one, else one vision call, charged as one AI
 * action (refunded if it fails, like any other, lib/ai-quota.ts). Callers
 * have already checked the allowance.
 */
export async function ensureBrief(
  set: ReferenceSet,
  opts: { userId: string; prompt: string; contentLocale: Locale; signal?: AbortSignal; projectId?: string | null },
): Promise<{ brief: VisualBrief; charged: boolean; chargeId: string | null }> {
  if (set.brief) return { brief: set.brief, charged: false, chargeId: null };
  const chargeId = await recordAiUsage(opts.userId, "vision", opts.projectId ?? null);
  try {
    const brief = await describeReferences(await referenceAttachments(set), opts.prompt, opts.contentLocale, opts.signal);
    await saveReferenceBrief(set, brief).catch((err) => console.error("[references] couldn't save a brief", err instanceof Error ? err.message : err));
    // chargeId: so a build the build rule refuses can give it back (lib/ai/build-policy.ts).
    return { brief, charged: true, chargeId };
  } catch (err) {
    await refundFailedAi(chargeId, opts.userId, classifyAiFailure(err));
    throw err;
  }
}

/** A short public view of a brief (partner API GET /runs/{id}). */
export function briefSummary(brief: VisualBrief | null | undefined) {
  if (!brief) return null;
  return {
    summary: brief.summary,
    palette: brief.palette,
    fonts: brief.fonts,
    mood: brief.mood,
    layout: brief.layout,
    components: brief.components,
    screens: brief.screens.map((s) => ({ name: s.name, purpose: s.purpose, imageIndex: s.imageIndex })),
    suggestedTheme: paletteTheme(brief)?.preset ?? null,
  };
}

/** The brief as prompt text. `compact` keeps it short for small models. */
export function briefText(brief: VisualBrief, opts: { compact?: boolean } = {}): string {
  const lines: string[] = [];
  if (brief.summary) lines.push(`Overall look: ${brief.summary}`);
  if (brief.palette.length) lines.push(`Palette: ${brief.palette.map((c) => `${c.hex}${c.role ? ` (${c.role})` : ""}`).join(", ")}`);
  const fonts = [brief.fonts.display && `headings "${brief.fonts.display}"`, brief.fonts.body && `body "${brief.fonts.body}"`, brief.fonts.style].filter(Boolean);
  if (fonts.length) lines.push(`Type: ${fonts.join(", ")}`);
  if (brief.mood.length) lines.push(`Mood: ${brief.mood.join(", ")}`);
  if (brief.layout.length) lines.push(`Layout patterns: ${(opts.compact ? brief.layout.slice(0, 4) : brief.layout).join("; ")}`);
  if (brief.components.length) lines.push(`Components: ${(opts.compact ? brief.components.slice(0, 8) : brief.components).join(", ")}`);
  if (!opts.compact && brief.screens.length) {
    lines.push("Screens in the images:");
    brief.screens.forEach((s, i) => lines.push(`  ${i + 1}. "${s.name}" (image ${s.imageIndex + 1})${s.purpose ? `: ${s.purpose}` : ""}${s.elements.length ? ` [${s.elements.join(", ")}]` : ""}`));
  }
  return lines.join("\n");
}

/* ───────────────────────── Screens → pages ───────────────────────── */

/** Screens that are already in every app (sign-in, sign-up, profile, settings). */
const BUILT_IN_SCREEN = /\b(log ?in|sign ?in|sign ?up|log ?out|register|registration|profile|settings|account|password|onboarding|splash)\b/i;

const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim();

/** Whether a planned page is the page for this screen (by name). */
function samePage(page: { slug: string; title: string }, screenName: string): boolean {
  const s = norm(screenName);
  if (!s) return false;
  const title = norm(page.title);
  const slug = norm(page.slug.replace(/-/g, " "));
  if (s === title || s === slug || title.includes(s) || s.includes(title) || slug.includes(s)) return true;
  // "Menu screen" vs "Our menu": share a word of 4+ letters.
  const words = new Set(s.split(" ").filter((w) => w.length >= 4 && !["screen", "page", "view"].includes(w)));
  return [...title.split(" "), ...slug.split(" ")].some((w) => words.has(w));
}

/** The screen (and its image) a planned page was drawn from, if any. Home falls back to the first screen. */
export function screenForPage(brief: VisualBrief, page: { slug: string; title: string; isHome?: boolean }): { name: string; elements: string[]; imageIndex: number } | null {
  const hit = brief.screens.find((s) => samePage(page, s.name));
  if (hit) return hit;
  if (page.isHome) {
    const first = brief.screens.find((s) => !BUILT_IN_SCREEN.test(s.name));
    if (first) return first;
    if ((brief.imageCount ?? 0) > 0) return { name: "", elements: [], imageIndex: 0 };
  }
  return null;
}

/**
 * Every screen in the images becomes a planned page (unless the plan has
 * one for it already, or it is a sign-in or settings screen, which every
 * app has). Never more than `maxPages` pages in all.
 */
export function addScreenPages<P extends AppPlan>(plan: P, brief: VisualBrief, maxPages = 12): P {
  const pages = [...plan.pages];
  const slugs = new Set(pages.map((p) => p.slug));
  brief.screens.forEach((screen, i) => {
    if (pages.length >= maxPages) return;
    if (BUILT_IN_SCREEN.test(screen.name)) return;
    if (pages.some((p) => samePage(p, screen.name))) return;
    let slug = slugify(screen.name).slice(0, 50).replace(/-+$/, "") || `screen-${i + 1}`;
    if (!/^[a-z0-9-]+$/.test(slug)) slug = `screen-${i + 1}`;
    for (let n = 2; slugs.has(slug); n++) slug = `${slug.replace(/-\d+$/, "")}-${n}`;
    slugs.add(slug);
    const summary = [screen.purpose, screen.elements.length ? `As in reference image ${screen.imageIndex + 1}: ${screen.elements.join(", ")}` : `As in reference image ${screen.imageIndex + 1}.`]
      .filter(Boolean)
      .join(". ")
      .slice(0, 400);
    pages.push({ slug, title: screen.name.slice(0, 80), isHome: false, summary, requiresAuth: false, requiresRole: null });
  });
  return { ...plan, pages };
}

/* ───────────────────────── Palette → theme ───────────────────────── */

type RGB = [number, number, number];
const rgb = (hex: string): RGB => {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
};
const toHex = ([r, g, b]: RGB) => `#${[r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("")}`;
const mix = (a: string, b: string, w: number) => {
  const x = rgb(a);
  const y = rgb(b);
  return toHex([x[0] + (y[0] - x[0]) * w, x[1] + (y[1] - x[1]) * w, x[2] + (y[2] - x[2]) * w]);
};
function luminance(hex: string): number {
  const lin = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const [r, g, b] = rgb(hex);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
function saturation(hex: string): number {
  const [r, g, b] = rgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max === 0 ? 0 : (max - min) / max;
}
function distance(a: string, b: string): number {
  if (!/^#[0-9a-f]{6}$/i.test(a) || !/^#[0-9a-f]{6}$/i.test(b)) return 255;
  const x = rgb(a);
  const y = rgb(b);
  return Math.sqrt((x[0] - y[0]) ** 2 + (x[1] - y[1]) ** 2 + (x[2] - y[2]) ** 2);
}
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (hi + 0.05) / (lo + 0.05);
}

/** Google Fonts families the theme may load by name (anything else keeps the preset's fonts). */
const KNOWN_FONTS: Record<string, { stack: string; weights: string }> = {
  inter: { stack: `"Inter", ui-sans-serif, system-ui, sans-serif`, weights: "400;500;600;700;800" },
  poppins: { stack: `"Poppins", ui-sans-serif, system-ui, sans-serif`, weights: "400;500;600;700" },
  "dm sans": { stack: `"DM Sans", ui-sans-serif, system-ui, sans-serif`, weights: "400;500;700" },
  "space grotesk": { stack: `"Space Grotesk", ui-sans-serif, system-ui, sans-serif`, weights: "400;500;700" },
  manrope: { stack: `"Manrope", ui-sans-serif, system-ui, sans-serif`, weights: "400;500;700;800" },
  "work sans": { stack: `"Work Sans", ui-sans-serif, system-ui, sans-serif`, weights: "400;500;700" },
  outfit: { stack: `"Outfit", ui-sans-serif, system-ui, sans-serif`, weights: "400;500;700" },
  "plus jakarta sans": { stack: `"Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif`, weights: "400;500;700;800" },
  montserrat: { stack: `"Montserrat", ui-sans-serif, system-ui, sans-serif`, weights: "400;500;700;800" },
  roboto: { stack: `"Roboto", ui-sans-serif, system-ui, sans-serif`, weights: "400;500;700" },
  "open sans": { stack: `"Open Sans", ui-sans-serif, system-ui, sans-serif`, weights: "400;600;700" },
  lato: { stack: `"Lato", ui-sans-serif, system-ui, sans-serif`, weights: "400;700" },
  nunito: { stack: `"Nunito", ui-sans-serif, system-ui, sans-serif`, weights: "400;600;700;800" },
  rubik: { stack: `"Rubik", ui-sans-serif, system-ui, sans-serif`, weights: "400;500;700" },
  quicksand: { stack: `"Quicksand", ui-sans-serif, system-ui, sans-serif`, weights: "400;500;700" },
  raleway: { stack: `"Raleway", ui-sans-serif, system-ui, sans-serif`, weights: "400;600;800" },
  archivo: { stack: `"Archivo", ui-sans-serif, system-ui, sans-serif`, weights: "400;600;800" },
  oswald: { stack: `"Oswald", Impact, "Arial Narrow", sans-serif`, weights: "400;600;700" },
  "bebas neue": { stack: `"Bebas Neue", Impact, "Arial Narrow", sans-serif`, weights: "400" },
  "playfair display": { stack: `"Playfair Display", Georgia, "Times New Roman", serif`, weights: "400;700" },
  fraunces: { stack: `"Fraunces", Georgia, "Times New Roman", serif`, weights: "400;600;700" },
  lora: { stack: `"Lora", Georgia, "Times New Roman", serif`, weights: "400;600;700" },
  merriweather: { stack: `"Merriweather", Georgia, "Times New Roman", serif`, weights: "400;700" },
  "cormorant garamond": { stack: `"Cormorant Garamond", Georgia, "Times New Roman", serif`, weights: "400;600;700" },
  "dm serif display": { stack: `"DM Serif Display", Georgia, "Times New Roman", serif`, weights: "400" },
  "abril fatface": { stack: `"Abril Fatface", Georgia, serif`, weights: "400" },
  righteous: { stack: `"Righteous", "Arial Black", sans-serif`, weights: "400" },
  "jetbrains mono": { stack: `"JetBrains Mono", ui-monospace, Menlo, Consolas, monospace`, weights: "400;700" },
  "ibm plex mono": { stack: `"IBM Plex Mono", ui-monospace, Menlo, Consolas, monospace`, weights: "400;600" },
};
const fontKey = (name: string) => name.toLowerCase().replace(/["']/g, "").replace(/\s+/g, " ").trim();
const familyName = (key: string) => /"([^"]+)"/.exec(KNOWN_FONTS[key].stack)![1];

/**
 * The app's starting theme from the brief: the closest built-in look
 * (`preset`, what the plan shows) with the images' own colours and, when
 * they are well-known Google Fonts, their fonts on top (`tokens`). Null
 * when the images gave fewer than two usable colours.
 */
export function paletteTheme(brief: VisualBrief): { preset: string; tokens: Partial<ProjectTheme> } | null {
  const colours = brief.palette;
  if (colours.length < 2) return null;
  const byRole = (re: RegExp) => colours.find((c) => re.test(c.role))?.hex;
  const sortedByLum = [...colours].sort((a, b) => luminance(b.hex) - luminance(a.hex));
  const avgLum = colours.reduce((s, c) => s + luminance(c.hex), 0) / colours.length;
  const bg = byRole(/background|^bg|canvas|page/) ?? (avgLum < 0.3 ? sortedByLum[sortedByLum.length - 1].hex : sortedByLum[0].hex);
  const dark = luminance(bg) < 0.25;
  const others = colours.filter((c) => c.hex !== bg);
  const vivid = [...others].sort((a, b) => saturation(b.hex) - saturation(a.hex));
  const primary = byRole(/primary|brand|button|cta|main/) ?? vivid[0]?.hex ?? (dark ? "#ffffff" : "#111827");
  const accent = byRole(/accent|secondary|highlight/) ?? vivid.find((c) => c.hex !== primary)?.hex ?? primary;
  let textColour = byRole(/^text|ink|foreground|body/) ?? (dark ? sortedByLum[0].hex : sortedByLum[sortedByLum.length - 1].hex);
  if (contrast(textColour, bg) < 4.5) textColour = dark ? "#f5f5f7" : "#111111";
  const surface = byRole(/surface|card|panel/) ?? mix(bg, textColour, dark ? 0.06 : 0.0);
  const tokens: Partial<ProjectTheme> = {
    mode: dark ? "dark" : "light",
    bg,
    surface,
    surface2: mix(bg, textColour, dark ? 0.1 : 0.04),
    border: byRole(/border|divider|line/) ?? mix(bg, textColour, dark ? 0.18 : 0.1),
    text: textColour,
    textMuted: byRole(/muted|secondary text|subtle/) ?? mix(textColour, bg, 0.4),
    primary,
    primary2: mix(primary, dark ? "#ffffff" : "#000000", 0.12),
    accent,
  };
  const display = KNOWN_FONTS[fontKey(brief.fonts.display)] ? fontKey(brief.fonts.display) : null;
  const body = KNOWN_FONTS[fontKey(brief.fonts.body)] ? fontKey(brief.fonts.body) : null;
  if (display || body) {
    const families = [...new Set([display, body].filter((k): k is string => Boolean(k)))];
    if (body) tokens.font = KNOWN_FONTS[body].stack;
    if (display) tokens.fontDisplay = KNOWN_FONTS[display].stack;
    tokens.googleFonts = families.map((k) => `${familyName(k)}:wght@${KNOWN_FONTS[k].weights}`);
  }

  const presets = THEME_PRESETS.filter((p, i, all) => p.name && all.findIndex((q) => q.name === p.name) === i);
  let best = presets[0];
  let bestScore = Infinity;
  for (const p of presets) {
    const score = 2 * distance(p.bg, bg) + 1.5 * distance(p.primary, primary) + distance(p.accent, accent) + (p.mode === tokens.mode ? 0 : 400);
    if (score < bestScore) {
      bestScore = score;
      best = p;
    }
  }
  return { preset: best.name, tokens };
}

/* ───────────────────────── What a run carries ───────────────────────── */

/** Reference images as the builders use them: the brief, and the images for full-size models. */
export type BuildReferences = {
  id: string;
  brief: VisualBrief;
  /** All images of the set, in order (attached per page on full-size models only). */
  images: ImageAttachment[];
};

/** The prompt block a page builder gets: the brief, and which screen (image) this page is. */
export function pageReferenceBlock(refs: BuildReferences, page: { slug: string; title: string; isHome?: boolean }, compact: boolean): { text: string; image: ImageAttachment | null } {
  const screen = screenForPage(refs.brief, page);
  const lines = [`VISUAL REFERENCE (the user's own images; match this look and layout, but keep the colours as var(--nk-*) tokens, the theme already uses the palette):`, briefText(refs.brief, { compact })];
  const image = !compact && screen ? refs.images[screen.imageIndex] ?? null : null;
  if (screen?.name) lines.push(`THIS PAGE is the "${screen.name}" screen${screen.elements.length ? `: ${screen.elements.join(", ")}` : ""}.${image ? " The attached image shows it: follow its structure, spacing and components with this app's own content." : ""}`);
  else if (image) lines.push("The attached image shows the look to follow, with this app's own content.");
  lines.push("Never copy logos, brand names or text of other companies from the images.");
  return { text: `\n\n${lines.join("\n")}`, image };
}
