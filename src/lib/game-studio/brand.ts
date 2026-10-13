import sharp from "sharp";
import type { Tr } from "../ai/i18n";
import { processImage, ReferenceImageError, type ReferenceImageInput } from "../ai/references";
import type { GameFiles } from "./store";

/**
 * Branding for promotional games (2026-10-07): a business makes a game for a
 * promotion at its store or business. The game carries the business's name,
 * logo, colours, an end-of-game offer ("Show this screen for 10% off", a
 * coupon code) and a link.
 *
 * Stored as `plan.brand` (name, colours, link, offer, the logo's size) and as
 * one PLATFORM file in the game, `src/brand.js`, written here and never by the
 * AI (the build loop puts it back after every step; validate.ts lists it
 * first). It defines `NK.brand` = {name, colors, offer, hasLink, logo,
 * openLink()} and, with a logo, the asset key "brand-logo": the logo as a
 * data: URL inside the file (`{files: {png: "data:…"}, type: "image"}`, which
 * both kits load like any image), so it works the same in the studio canvas,
 * the headless check, a download and a published game. No kit change.
 *
 * The link: the game never gets a URL. It calls `NK.brand.openLink()` (no
 * arguments). In the studio canvas (a sandboxed iframe) that posts
 * `{type: "nk-game:brand-link"}` (no URL) to the workspace, which opens the
 * link IT stored for the game; on a published page it opens the stored link,
 * which is baked into this platform file as a JSON string, with
 * noopener,noreferrer. AI-written files may not call window.open or set
 * location (validate.ts), so the stored link is the only one a game opens.
 */

export type GameBrand = {
  name: string;
  /** 0-3 colours, "#rrggbb". */
  colors: string[];
  /** https:// (or http://) only; null = no link. */
  link: string | null;
  /** The end-of-game offer, e.g. "Show this screen for 10% off" or "Code SWEET10". */
  offer: string;
  /** The logo's size when there is one (the image itself lives in src/brand.js). */
  logo: { width: number; height: number } | null;
};

export const BRAND_FILE = "src/brand.js";
const LOGO_SIDE = 256;
const HEX = /^#[0-9a-f]{6}$/i;

/** A colour as "#rrggbb", or null. Accepts #rgb too. */
export function cleanColor(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim().toLowerCase();
  if (/^#[0-9a-f]{3}$/.test(s)) return `#${s[1]}${s[1]}${s[2]}${s[2]}${s[3]}${s[3]}`;
  return HEX.test(s) ? s : null;
}

/** A link a game may open: http(s), no credentials, at most 500 characters. */
export function cleanLink(v: unknown): string | null {
  if (typeof v !== "string" || !v.trim()) return null;
  let s = v.trim();
  if (!/^[a-z][a-z0-9+.-]*:/i.test(s)) s = `https://${s}`;
  try {
    const u = new URL(s);
    if ((u.protocol !== "https:" && u.protocol !== "http:") || u.username || u.password || !u.hostname.includes(".")) return null;
    const out = u.toString();
    return out.length <= 500 ? out : null;
  } catch {
    return null;
  }
}

const plain = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max) : "");

/** An SVG logo: scripts, event handlers and outside references removed, then drawn as a PNG (the game never sees SVG code). */
async function svgToPng(raw: string, t: Tr): Promise<Buffer> {
  const clean = raw
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, "")
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*')/gi, "")
    .replace(/(?:xlink:)?href\s*=\s*("(?!#|data:image\/)[^"]*"|'(?!#|data:image\/)[^']*')/gi, "")
    .replace(/<!ENTITY[\s\S]*?>/gi, "")
    .replace(/<!DOCTYPE[^[>]*(\[[\s\S]*?\])?\s*>/gi, "")
    .replace(/url\(\s*(?!["']?(?:#|data:image\/))[^)]*\)/gi, "none");
  if (clean.length > 1_000_000 || !/<svg[\s>]/i.test(clean)) throw new ReferenceImageError("image_type", 400, t("references.errors.type", { name: "logo" }));
  try {
    return await sharp(Buffer.from(clean), { density: 192, limitInputPixels: 40_000_000 }).resize({ width: LOGO_SIDE, height: LOGO_SIDE, fit: "inside" }).png().toBuffer();
  } catch {
    throw new ReferenceImageError("image_type", 400, t("references.errors.unreadable", { name: "logo" }));
  }
}

/** The logo (an image as for reference images: {data} or {url}; png/jpg/webp/gif, or svg) as a small PNG. */
export async function processLogo(input: unknown, t: Tr): Promise<{ png: Buffer; width: number; height: number }> {
  const o = (input && typeof input === "object" ? input : {}) as ReferenceImageInput;
  const data = typeof o.data === "string" ? o.data.trim() : "";
  const svgData = /^data:image\/svg\+xml/i.test(data) || o.mediaType === "image/svg+xml" || /^\s*(<\?xml|<svg)/i.test(data);
  let buf: Buffer;
  if (svgData) {
    // An SVG logo comes as data (never downloaded), at most about 5 MB.
    if (data.length > 7_000_000) throw new ReferenceImageError("image_too_large", 413, t("references.errors.tooLarge", { name: "logo", size: "5 MB" }));
    const m = /^data:image\/svg\+xml(;base64)?,([\s\S]*)$/i.exec(data);
    let text = "";
    try {
      text = m ? (m[1] ? Buffer.from(m[2], "base64").toString("utf8") : decodeURIComponent(m[2])) : /^\s*</.test(data) ? data : Buffer.from(data, "base64").toString("utf8");
    } catch {
      text = "";
    }
    buf = await svgToPng(text, t);
  } else {
    const img = await processImage({ ...o, ...(o.mediaType === "image/svg+xml" ? { mediaType: undefined } : {}) }, 0, t);
    buf = img.buffer;
  }
  const { data: png, info } = await sharp(buf).rotate().resize({ width: LOGO_SIDE, height: LOGO_SIDE, fit: "inside", withoutEnlargement: true }).png({ compressionLevel: 9 }).toBuffer({ resolveWithObject: true });
  return { png, width: info.width, height: info.height };
}

/** Up to 3 main colours of a logo (no near-white, near-black or see-through pixels), for "take them from the logo". */
export async function logoColors(png: Buffer): Promise<string[]> {
  const { data, info } = await sharp(png).resize(48, 48, { fit: "inside" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const counts = new Map<string, { n: number; r: number; g: number; b: number }>();
  for (let i = 0; i < data.length; i += info.channels) {
    const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]];
    if (a < 128) continue;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    if (max > 240 && min > 225) continue;
    if (max < 25) continue;
    const key = `${r >> 5},${g >> 5},${b >> 5}`;
    const c = counts.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
    c.n++;
    c.r += r;
    c.g += g;
    c.b += b;
    counts.set(key, c);
  }
  const hex = (n: number) => Math.round(n).toString(16).padStart(2, "0");
  const out: string[] = [];
  for (const c of [...counts.values()].sort((a, b) => b.n - a.n)) {
    const col = `#${hex(c.r / c.n)}${hex(c.g / c.n)}${hex(c.b / c.n)}`;
    // Distinct enough from the ones already picked.
    const far = out.every((o) => Math.abs(parseInt(o.slice(1, 3), 16) - parseInt(col.slice(1, 3), 16)) + Math.abs(parseInt(o.slice(3, 5), 16) - parseInt(col.slice(3, 5), 16)) + Math.abs(parseInt(o.slice(5, 7), 16) - parseInt(col.slice(5, 7), 16)) > 90);
    if (far) out.push(col);
    if (out.length === 3) break;
  }
  return out;
}

/**
 * The branding a request sent ({name, colors, link, offer, logo|logoImage}),
 * checked and cleaned. `logo` comes back as a PNG when one was sent. Null
 * when nothing usable was sent. Throws ReferenceImageError for a bad logo.
 */
export async function cleanBrandInput(raw: unknown, t: Tr): Promise<{ brand: GameBrand; png: Buffer | null } | null> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const name = plain(o.name, 80);
  const offer = plain(o.offer, 160);
  const link = cleanLink(o.link);
  let colors = (Array.isArray(o.colors) ? o.colors : []).map(cleanColor).filter((c): c is string => Boolean(c));
  colors = [...new Set(colors)].slice(0, 3);
  const logoIn = o.logo ?? o.logoImage;
  let png: Buffer | null = null;
  let logo: GameBrand["logo"] = null;
  if (logoIn && typeof logoIn === "object") {
    const l = await processLogo(logoIn, t);
    png = l.png;
    logo = { width: l.width, height: l.height };
    if (!colors.length || o.colorsFromLogo === true) colors = await logoColors(png);
  }
  if (!name && !offer && !link && !png && !colors.length) return null;
  return { brand: { name, colors, link, offer, logo }, png };
}

/** The brand as stored in the plan (old or partial data cleaned). */
export function asBrand(v: unknown): GameBrand | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  const o = v as Record<string, unknown>;
  const logo = o.logo && typeof o.logo === "object" ? (o.logo as { width?: unknown; height?: unknown }) : null;
  return {
    name: plain(o.name, 80),
    colors: (Array.isArray(o.colors) ? o.colors : []).map(cleanColor).filter((c): c is string => Boolean(c)).slice(0, 3),
    link: cleanLink(o.link),
    offer: plain(o.offer, 160),
    logo: logo && typeof logo.width === "number" && typeof logo.height === "number" ? { width: logo.width, height: logo.height } : null,
  };
}

/** The logo inside the game's brand file (a data: URL), or null. */
export function logoFromFiles(files: GameFiles): string | null {
  const m = /var logo = ("data:image\/png;base64,[A-Za-z0-9+/=]+")/.exec(files[BRAND_FILE] ?? "");
  return m ? (JSON.parse(m[1]) as string) : null;
}

/** The platform's brand file. `logo`: a PNG (or a data: URL kept from the file before). */
export function brandScript(brand: GameBrand, logo: Buffer | string | null): string {
  const dataUrl = logo ? (typeof logo === "string" ? logo : `data:image/png;base64,${logo.toString("base64")}`) : null;
  const pub = { name: brand.name, colors: brand.colors, offer: brand.offer, hasLink: Boolean(brand.link), logo: dataUrl ? "brand-logo" : null };
  return `// PLATFORM FILE (the game's branding). Written by the platform from the business's branding; never edit it.
// NK.brand = { name, colors, offer, hasLink, logo, openLink() }. With a logo, the image asset key "brand-logo" is defined here.
(function () {
  var link = ${JSON.stringify(brand.link)};
  var logo = ${JSON.stringify(dataUrl)};
  var studio = /[?&#]nk-studio\\b/.test(String(window.location.search) + String(window.location.hash)) || window.NK_STUDIO === true;
  var b = ${JSON.stringify(pub)};
  b.colors = Object.freeze(b.colors.slice());
  // Opens the business's link (no arguments: only the link stored for this game). Call it from a button the player clicks.
  b.openLink = function () {
    if (!link) return false;
    try {
      if (studio && window.parent !== window) { window.parent.postMessage({ type: "nk-game:brand-link" }, "*"); return true; }
      window.open(link, "_blank", "noopener,noreferrer");
      return true;
    } catch (e) { return false; }
  };
  NK.brand = Object.freeze(b);
  if (logo) NK.assets.define({ "brand-logo": { files: { png: logo }, type: "image" } });
})();
`;
}

/** The game's files with the brand file written (or removed) and listed first in game.json. */
export function withBrandFile(files: GameFiles, brand: GameBrand | null, logo: Buffer | string | null): GameFiles {
  const out: GameFiles = { ...files };
  if (brand) out[BRAND_FILE] = brandScript(brand, logo);
  else delete out[BRAND_FILE];
  try {
    const game = JSON.parse(out["game.json"] ?? "") as { files?: unknown };
    const list = Array.isArray(game.files) ? game.files.filter((f): f is string => typeof f === "string" && f !== BRAND_FILE) : [];
    game.files = brand ? [BRAND_FILE, ...list] : list;
    out["game.json"] = JSON.stringify(game, null, 2) + "\n";
  } catch {
    /* no game.json yet: the first step's checks list it */
  }
  return out;
}

/** The branding as the AI reads it (brief, plan, steps, changes). "" without a brand. */
export function brandText(brand: GameBrand | null | undefined): string {
  if (!brand || (!brand.name && !brand.logo && !brand.colors.length && !brand.offer && !brand.link)) return "";
  return [
    "BRAND (a promotional game for a business; use it wherever it fits, and follow the PROMO GAME rule):",
    brand.name ? `- business name: ${JSON.stringify(brand.name)}: in the title and on the menu (NK.brand.name)` : "",
    brand.colors.length ? `- brand colours: ${brand.colors.join(", ")}: build the palette around them (UI panels, title, key props); the contrast rules still apply (hero, danger and pickups stay readable)` : "",
    brand.logo ? `- logo: the image asset key "brand-logo" (already defined by src/brand.js; ${brand.logo.width}×${brand.logo.height} px, keep its proportions): show it on the title screen, small in the HUD or on the loading screen, and on the ending/win screen. Never redraw or recolour it.` : "",
    brand.offer ? `- end-of-game offer: ${JSON.stringify(brand.offer)}: big and readable on the ending/win screen AND on the game-over screen (NK.brand.offer)` : "",
    brand.link ? `- link: a "Visit us" button on the ending screen (and the game-over screen) calls NK.brand.openLink() when clicked or tapped (no arguments: the platform opens the business's own link). Never open URLs or touch window.location yourself.` : "",
    "- the business's products can be the collectibles, pickups or targets when it fits (pastries for a bakery, cups for a café).",
    `- ${BRAND_FILE} is the PLATFORM's file (NK.brand); never write, edit or delete it; game.json lists it first.`,
  ]
    .filter(Boolean)
    .join("\n");
}

/** The brand as the partner API and the workspace show it. */
export function brandView(brand: GameBrand | null) {
  return brand ? { name: brand.name, colors: brand.colors, link: brand.link, offer: brand.offer, logo: brand.logo } : null;
}
