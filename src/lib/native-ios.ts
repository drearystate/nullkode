import { createInflate, deflateSync, inflateSync } from "node:zlib";
import { readFile, readdir } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import { defaultAppIconPng } from "./app-icon";
import {
  capacitorConfigJson,
  hexToRgb,
  normalizeHexColor,
  readableOn,
  type NativeConfig,
} from "./native";
import { suggestedUsageTexts, type UsageTexts } from "./native-permissions";

/**
 * The iOS part of the downloadable mobile project: a ready-to-open Xcode
 * project built from native-templates/capacitor-ios (Capacitor with Swift
 * Package Manager, see that folder's README) plus the optional GitHub Actions
 * workflow that builds it on a GitHub Mac and uploads it to TestFlight.
 */

export function iosTemplateDir(): string {
  return join(process.cwd(), "native-templates", "capacitor-ios");
}

const TEXT_FILE = /\.(pbxproj|plist|swift|json|storyboard|xcconfig|md|yml|yaml|xml|html|js)$|(^|[\\/])\.gitignore$/;

export type ZipEntry = { path: string; data: string | Buffer };

/**
 * Every file under ios/ and .github/ for this app. `www` holds the files of
 * the project's www/ folder; they are also copied into the app (what
 * `npx cap sync ios` would do).
 *
 * `privacy` is the wording of the phone's permission prompts and whether the
 * app asks for location (see src/lib/native-permissions.ts). The camera,
 * microphone and photo library prompts are always included: a web page's
 * file picker offers "Take Photo" and "Take Video", and an app without the
 * wording crashes when someone taps them (and Apple rejects it).
 */
export async function iosProjectFiles(opts: {
  cfg: NativeConfig;
  url: string;
  allowNavigation: string[];
  iconPng: Buffer | null;
  www: Record<string, string>;
  privacy?: { texts: UsageTexts; location: boolean };
}): Promise<ZipEntry[]> {
  const { cfg } = opts;
  const background = normalizeHexColor(cfg.backgroundColor);
  const privacy = opts.privacy ?? { texts: suggestedUsageTexts(cfg.appName, { purposes: [], features: [] }), location: false };
  const tokens: Record<string, string> = {
    __NK_APP_ID__: cfg.appId,
    __NK_VERSION__: cfg.version,
    __NK_BUILD__: String(Math.max(1, Math.floor(cfg.build))),
    __NK_APP_NAME__: xmlEscape(cfg.appName),
    // Light text on dark backgrounds, dark text on light ones (read by Capacitor).
    __NK_STATUS_BAR_STYLE__: readableOn(background) === "#ffffff" ? "UIStatusBarStyleLightContent" : "UIStatusBarStyleDarkContent",
    __NK_IPHONE_ORIENTATIONS__: iphoneOrientations(cfg.orientation),
    __NK_PRIVACY_KEYS__: privacyKeys(privacy),
  };

  const root = iosTemplateDir();
  const out: ZipEntry[] = [];
  for (const top of ["ios", ".github"]) {
    for (const file of await walk(join(root, top))) {
      const rel = relative(root, file).split(sep).join("/");
      const bytes = await readFile(file);
      out.push({
        path: rel,
        data: TEXT_FILE.test(rel)
          ? bytes.toString("utf8").replace(/__NK_[A-Z_]+__/g, (t) => tokens[t] ?? t)
          : bytes,
      });
    }
  }

  // What `npx cap sync ios` writes. (Not kept in the template: git ignores these.)
  const appDir = "ios/App/App";
  const capConfig = JSON.parse(capacitorConfigJson(cfg, opts.url, opts.allowNavigation));
  capConfig.packageClassList = [];
  out.push({ path: `${appDir}/capacitor.config.json`, data: JSON.stringify(capConfig, null, "\t") + "\n" });
  out.push({ path: `${appDir}/config.xml`, data: CORDOVA_CONFIG_XML });
  out.push({ path: `${appDir}/public/cordova.js`, data: "" });
  out.push({ path: `${appDir}/public/cordova_plugins.js`, data: "" });
  for (const [name, content] of Object.entries(opts.www)) {
    out.push({ path: `${appDir}/public/${name}`, data: content });
  }

  // The app's own icon and launch screen instead of Capacitor's samples.
  const icon =
    (await decodeIconPng(opts.iconPng)) ?? decodePng(defaultAppIconPng(1024, normalizeHexColor(cfg.themeColor, background)));
  if (!icon) throw new Error("Could not draw the app icon.");
  out.push({
    path: `${appDir}/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png`,
    data: appStoreIcon(icon, background),
  });
  const splash = splashImage(icon, background);
  for (const name of ["splash-2732x2732.png", "splash-2732x2732-1.png", "splash-2732x2732-2.png"]) {
    out.push({ path: `${appDir}/Assets.xcassets/Splash.imageset/${name}`, data: splash });
  }
  return out;
}

/** The Info.plist purpose strings (the text iOS shows when the app asks for a permission). */
export function privacyKeys(privacy: { texts: UsageTexts; location: boolean }): string {
  const entries: Array<[string, string]> = [
    ["NSCameraUsageDescription", privacy.texts.camera],
    ["NSMicrophoneUsageDescription", privacy.texts.microphone],
    ["NSPhotoLibraryUsageDescription", privacy.texts.photos],
  ];
  if (privacy.location) entries.push(["NSLocationWhenInUseUsageDescription", privacy.texts.location]);
  return entries.map(([key, text]) => `\t<key>${key}</key>\n\t<string>${xmlEscape(text)}</string>`).join("\n");
}

/** The phone orientations for Info.plist. iPads always allow all four (Apple requires it for multitasking). */
function iphoneOrientations(orientation: NativeConfig["orientation"]): string {
  const values =
    orientation === "portrait"
      ? ["UIInterfaceOrientationPortrait"]
      : orientation === "landscape"
        ? ["UIInterfaceOrientationLandscapeLeft", "UIInterfaceOrientationLandscapeRight"]
        : ["UIInterfaceOrientationPortrait", "UIInterfaceOrientationLandscapeLeft", "UIInterfaceOrientationLandscapeRight"];
  return values.map((v) => `\t\t<string>${v}</string>`).join("\n");
}

const CORDOVA_CONFIG_XML = `<?xml version='1.0' encoding='utf-8'?>
<widget version="1.0.0" xmlns="http://www.w3.org/ns/widgets" xmlns:cdv="http://cordova.apache.org/ns/1.0">
  <access origin="*" />


</widget>`;

async function walk(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(path)));
    else if (entry.isFile()) out.push(path);
  }
  return out.sort();
}

function xmlEscape(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

/* ── Icon drawing ─────────────────────────────────────────────────────────
   Small PNG reader/writer so the icon works in every install without image
   libraries. Reads PNGs of every color type and bit depth, interlaced
   (Adam7, an option in most image editors) or not. Icons bigger than
   MAX_SIDE are shrunk while they are read, a few rows at a time
   (decodeIconPng). Anything else falls back to the generated default icon,
   and the Android build says so on its card (see src/lib/apk-build.ts). */

export type Image = { width: number; height: number; data: Uint8Array }; // RGBA, straight alpha

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
/** Icons up to this size are read whole (decodePng). */
const MAX_SIDE = 4096;
/** Bigger ones are shrunk while they are read, to at most this size… */
const WORK_SIDE = 2048;
/** …up to this size (interlaced ones can't be read a few rows at a time). */
const HUGE_SIDE = 16384;

/** Adam7 interlacing: each pass's first column and row, and its column and row steps. */
const ADAM7: ReadonlyArray<readonly [number, number, number, number]> = [
  [0, 0, 8, 8],
  [4, 0, 8, 8],
  [0, 4, 4, 8],
  [2, 0, 4, 4],
  [0, 2, 2, 4],
  [1, 0, 2, 2],
  [0, 1, 1, 2],
];
const NOT_INTERLACED: ReadonlyArray<readonly [number, number, number, number]> = [[0, 0, 1, 1]];

type PngHeader = {
  width: number;
  height: number;
  depth: number;
  colorType: number;
  interlace: number;
  channels: number;
  bitsPerPixel: number;
  /** Bytes per complete pixel (at least 1), for the row filters. */
  bpp: number;
  palette: Buffer | null;
  trns: Buffer | null;
  /** The tRNS color that means "transparent" in gray or RGB images. */
  key: [number, number, number] | null;
  idat: Buffer[];
};

/** The PNG's header and data chunks, or null when it isn't a PNG this reader supports. */
function readPngHeader(buf: Buffer | null | undefined): PngHeader | null {
  if (!buf || buf.length < 33 || !buf.subarray(0, 8).equals(PNG_SIGNATURE)) return null;
  let width = 0;
  let height = 0;
  let depth = 0;
  let colorType = 0;
  let interlace = 0;
  let palette: Buffer | null = null;
  let trns: Buffer | null = null;
  const idat: Buffer[] = [];
  for (let pos = 8; pos + 12 <= buf.length; ) {
    const length = buf.readUInt32BE(pos);
    const type = buf.toString("latin1", pos + 4, pos + 8);
    const start = pos + 8;
    const end = start + length;
    if (end + 4 > buf.length) return null;
    const chunk = buf.subarray(start, end);
    if (type === "IHDR") {
      if (length < 13) return null;
      width = chunk.readUInt32BE(0);
      height = chunk.readUInt32BE(4);
      depth = chunk[8];
      colorType = chunk[9];
      interlace = chunk[12];
    } else if (type === "PLTE") palette = chunk;
    else if (type === "tRNS") trns = chunk;
    else if (type === "IDAT") idat.push(chunk);
    else if (type === "IEND") break;
    pos = end + 4;
  }
  const channels = ({ 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 } as Record<number, number>)[colorType];
  if (!channels || !width || !height || width > HUGE_SIDE || height > HUGE_SIDE || !idat.length) return null;
  if (interlace !== 0 && interlace !== 1) return null;
  if (![1, 2, 4, 8, 16].includes(depth)) return null;
  if (colorType !== 0 && colorType !== 3 && depth < 8) return null;
  if (colorType === 3 && (depth > 8 || !palette)) return null;
  const bitsPerPixel = channels * depth;
  const keyAt = (i: number) => (trns && trns.length >= 2 * (i + 1) ? trns.readUInt16BE(2 * i) : -1);
  const key: [number, number, number] | null =
    trns && (colorType === 0 || colorType === 2) ? [keyAt(0), keyAt(1), keyAt(2)] : null;
  return {
    width,
    height,
    depth,
    colorType,
    interlace,
    channels,
    bitsPerPixel,
    bpp: Math.max(1, bitsPerPixel >> 3),
    palette,
    trns,
    key,
    idat,
  };
}

/** Bytes of one row of `pixels` pixels, without its filter byte. */
function rowBytes(png: PngHeader, pixels: number): number {
  return Math.ceil((pixels * png.bitsPerPixel) / 8);
}

/**
 * Undoes one row's filter in place. The row's pixels start at row[at] and its
 * filter type is row[at - 1]; prev holds the row above (already undone) from
 * prev[prevAt], or is null for a pass's first row. False for an unknown filter.
 */
function unfilterRow(row: Uint8Array, at: number, prev: Uint8Array | null, prevAt: number, stride: number, bpp: number): boolean {
  const filter = row[at - 1];
  if (filter === 0) return true;
  if (filter > 4) return false;
  for (let i = 0; i < stride; i++) {
    const a = i >= bpp ? row[at + i - bpp] : 0;
    const b = prev ? prev[prevAt + i] : 0;
    const c = prev && i >= bpp ? prev[prevAt + i - bpp] : 0;
    let v = row[at + i];
    if (filter === 1) v += a;
    else if (filter === 2) v += b;
    else if (filter === 3) v += (a + b) >> 1;
    else {
      const p = a + b - c;
      const pa = Math.abs(p - a);
      const pb = Math.abs(p - b);
      const pc = Math.abs(p - c);
      v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
    }
    row[at + i] = v & 0xff;
  }
  return true;
}

/** The first `count` pixels of an unfiltered row (starting at row[at]) as RGBA in out. */
function rowToRgba(png: PngHeader, row: Uint8Array, at: number, count: number, out: Uint8Array): void {
  const { depth, colorType, channels, palette, trns, key } = png;
  const max = (1 << Math.min(depth, 8)) - 1;
  const sample = (index: number): number => {
    if (depth === 8) return row[at + index];
    if (depth === 16) return (row[at + index * 2] << 8) | row[at + index * 2 + 1];
    const bit = index * depth;
    return (row[at + (bit >> 3)] >> (8 - depth - (bit & 7))) & max;
  };
  const to8 = (v: number) => (depth === 16 ? v >> 8 : depth === 8 ? v : Math.round((v * 255) / max));
  for (let x = 0; x < count; x++) {
    const o = x * 4;
    if (colorType === 3) {
      const index = sample(x);
      out[o] = palette![index * 3] ?? 0;
      out[o + 1] = palette![index * 3 + 1] ?? 0;
      out[o + 2] = palette![index * 3 + 2] ?? 0;
      out[o + 3] = trns && index < trns.length ? trns[index] : 255;
    } else if (colorType === 0 || colorType === 4) {
      const g = sample(x * channels);
      out[o] = out[o + 1] = out[o + 2] = to8(g);
      out[o + 3] = colorType === 4 ? to8(sample(x * 2 + 1)) : key && g === key[0] ? 0 : 255;
    } else {
      const r = sample(x * channels);
      const g = sample(x * channels + 1);
      const b = sample(x * channels + 2);
      out[o] = to8(r);
      out[o + 1] = to8(g);
      out[o + 2] = to8(b);
      out[o + 3] =
        colorType === 6 ? to8(sample(x * 4 + 3)) : key && r === key[0] && g === key[1] && b === key[2] ? 0 : 255;
    }
  }
}

/** A PNG up to MAX_SIDE x MAX_SIDE, interlaced or not, as RGBA; null if it can't be read. */
export function decodePng(buf: Buffer | null | undefined): Image | null {
  const png = readPngHeader(buf);
  if (!png || png.width > MAX_SIDE || png.height > MAX_SIDE) return null;
  const { width, height } = png;
  // Each pass is a small image of its own: its rows follow each other, each
  // with a filter byte, and the first row of a pass has no row above it.
  const passes = (png.interlace ? ADAM7 : NOT_INTERLACED).map(([x0, y0, dx, dy]) => {
    const w = width > x0 ? Math.ceil((width - x0) / dx) : 0;
    const h = height > y0 ? Math.ceil((height - y0) / dy) : 0;
    return { x0, y0, dx, dy, w, h, stride: rowBytes(png, w) };
  });
  const total = passes.reduce((sum, p) => sum + (p.w && p.h ? (p.stride + 1) * p.h : 0), 0);
  let raw: Buffer;
  try {
    raw = inflateSync(Buffer.concat(png.idat), { maxOutputLength: total + 1024 });
  } catch {
    return null;
  }
  if (raw.length < total) return null;

  const data = new Uint8Array(width * height * 4);
  const pixels = new Uint8Array(width * 4);
  let offset = 0;
  for (const p of passes) {
    if (!p.w || !p.h) continue;
    const line = p.stride + 1;
    for (let j = 0; j < p.h; j++) {
      const at = offset + j * line + 1;
      if (!unfilterRow(raw, at, j > 0 ? raw : null, at - line, p.stride, png.bpp)) return null;
      const y = p.y0 + j * p.dy;
      if (p.dx === 1) {
        rowToRgba(png, raw, at, p.w, data.subarray(y * width * 4));
        continue;
      }
      rowToRgba(png, raw, at, p.w, pixels);
      for (let i = 0; i < p.w; i++) {
        const o = (y * width + p.x0 + i * p.dx) * 4;
        data[o] = pixels[i * 4];
        data[o + 1] = pixels[i * 4 + 1];
        data[o + 2] = pixels[i * 4 + 2];
        data[o + 3] = pixels[i * 4 + 3];
      }
    }
    offset += line * p.h;
  }
  return { width, height, data };
}

/**
 * The app icon, ready to draw the store icons from. Icons up to MAX_SIDE
 * are read whole; bigger ones (up to HUGE_SIDE, not interlaced) are shrunk
 * by a whole factor while they are read, to at most WORK_SIDE, so memory
 * stays small. Null when the file can't be read.
 */
export async function decodeIconPng(buf: Buffer | null | undefined): Promise<Image | null> {
  const png = readPngHeader(buf);
  if (!png) return null;
  if (png.width <= MAX_SIDE && png.height <= MAX_SIDE) return decodePng(buf);
  if (png.interlace) return null;
  return decodeShrunk(png, Math.ceil(Math.max(png.width, png.height) / WORK_SIDE));
}

/**
 * Reads a big, non-interlaced PNG row by row as it is inflated, averaging
 * each factor x factor block of pixels (weighted by their alpha) into one.
 * Only two rows and one output row of sums are held besides the result.
 */
function decodeShrunk(png: PngHeader, factor: number): Promise<Image | null> {
  const { width, height } = png;
  const stride = rowBytes(png, width);
  const line = stride + 1;
  const outW = Math.ceil(width / factor);
  const outH = Math.ceil(height / factor);
  const data = new Uint8Array(outW * outH * 4);
  const sums = new Float64Array(outW * 4); // alpha-weighted color, then alpha
  const pixels = new Uint8Array(width * 4);
  let row = new Uint8Array(line);
  let prev = new Uint8Array(line);
  let filled = 0;
  let y = 0;

  const finishOutputRow = (oy: number, rows: number) => {
    for (let ox = 0; ox < outW; ox++) {
      const i = ox * 4;
      const alpha = sums[i + 3];
      const o = (oy * outW + ox) * 4;
      if (alpha > 0) {
        data[o] = clamp8(sums[i] / alpha);
        data[o + 1] = clamp8(sums[i + 1] / alpha);
        data[o + 2] = clamp8(sums[i + 2] / alpha);
      }
      data[o + 3] = clamp8(alpha / (Math.min(factor, width - ox * factor) * rows));
    }
    sums.fill(0);
  };

  const takeRow = (): boolean => {
    if (!unfilterRow(row, 1, y > 0 ? prev : null, 1, stride, png.bpp)) return false;
    rowToRgba(png, row, 1, width, pixels);
    for (let x = 0; x < width; x++) {
      const s = x * 4;
      const a = pixels[s + 3];
      if (a === 0) continue;
      const i = Math.floor(x / factor) * 4;
      sums[i] += pixels[s] * a;
      sums[i + 1] += pixels[s + 1] * a;
      sums[i + 2] += pixels[s + 2] * a;
      sums[i + 3] += a;
    }
    y += 1;
    if (y % factor === 0 || y === height) finishOutputRow(Math.ceil(y / factor) - 1, y % factor || factor);
    [row, prev] = [prev, row];
    return true;
  };

  return new Promise((resolve) => {
    const inflate = createInflate();
    let settled = false;
    const settle = (image: Image | null) => {
      if (settled) return;
      settled = true;
      inflate.destroy();
      resolve(image);
    };
    inflate.on("data", (chunk: Buffer) => {
      if (settled) return;
      for (let at = 0; at < chunk.length && y < height; ) {
        const take = Math.min(line - filled, chunk.length - at);
        row.set(chunk.subarray(at, at + take), filled);
        filled += take;
        at += take;
        if (filled === line) {
          filled = 0;
          if (!takeRow()) return settle(null);
        }
      }
      // Anything after the last row is ignored (and not inflated).
      if (y === height) settle({ width: outW, height: outH, data });
    });
    inflate.on("error", () => settle(null));
    inflate.on("end", () => settle(y === height ? { width: outW, height: outH, data } : null));
    for (const part of png.idat) inflate.write(part);
    inflate.end();
  });
}

/** For each output position along one axis: [source index, weight] pairs (area average down, bilinear up). */
function taps(from: number, size: number): Array<Array<[number, number]>> {
  const scale = size / from;
  const all: Array<Array<[number, number]>> = [];
  for (let d = 0; d < size; d++) {
    const list: Array<[number, number]> = [];
    if (scale < 1) {
      const s0 = d / scale;
      const s1 = (d + 1) / scale;
      for (let s = Math.floor(s0); s < Math.min(from, Math.ceil(s1)); s++) {
        const weight = Math.min(s + 1, s1) - Math.max(s, s0);
        if (weight > 0) list.push([s, weight * scale]);
      }
    } else {
      const center = (d + 0.5) / scale - 0.5;
      const s = Math.floor(center);
      const t = center - s;
      list.push([Math.min(from - 1, Math.max(0, s)), 1 - t]);
      list.push([Math.min(from - 1, Math.max(0, s + 1)), t]);
    }
    all.push(list);
  }
  return all;
}

/** The image resized to w x h, as premultiplied-alpha floats (RGBA). */
function resize(src: Image, w: number, h: number): Float32Array {
  // Pass 1: rows, premultiplying as we read.
  const across = taps(src.width, w);
  const rows = new Float32Array(w * src.height * 4);
  for (let y = 0; y < src.height; y++) {
    for (let d = 0; d < w; d++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (const [s, weight] of across[d]) {
        const i = (y * src.width + s) * 4;
        const alpha = src.data[i + 3];
        const k = (weight * alpha) / 255;
        r += src.data[i] * k;
        g += src.data[i + 1] * k;
        b += src.data[i + 2] * k;
        a += alpha * weight;
      }
      const j = (y * w + d) * 4;
      rows[j] = r;
      rows[j + 1] = g;
      rows[j + 2] = b;
      rows[j + 3] = a;
    }
  }
  // Pass 2: columns.
  const down = taps(src.height, h);
  const out = new Float32Array(w * h * 4);
  for (let d = 0; d < h; d++) {
    for (let x = 0; x < w; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (const [s, weight] of down[d]) {
        const i = (s * w + x) * 4;
        r += rows[i] * weight;
        g += rows[i + 1] * weight;
        b += rows[i + 2] * weight;
        a += rows[i + 3] * weight;
      }
      const j = (d * w + x) * 4;
      out[j] = r;
      out[j + 1] = g;
      out[j + 2] = b;
      out[j + 3] = a;
    }
  }
  return out;
}

/**
 * Draws the image, scaled to fit a box of `box` pixels and centered, onto an
 * opaque size x size canvas of the background color. `corner` rounds the
 * image's corners (a fraction of its size).
 */
function compose(src: Image, size: number, box: number, background: string, corner = 0): Buffer {
  const [br, bg, bb] = hexToRgb(background);
  const scale = Math.min(box / src.width, box / src.height);
  const w = Math.max(1, Math.round(src.width * scale));
  const h = Math.max(1, Math.round(src.height * scale));
  const img = resize(src, w, h);
  const left = Math.floor((size - w) / 2);
  const top = Math.floor((size - h) / 2);
  const radius = corner * Math.min(w, h);
  const rgb = Buffer.alloc(size * size * 3);
  for (let i = 0; i < size * size; i++) {
    rgb[i * 3] = br;
    rgb[i * 3 + 1] = bg;
    rgb[i * 3 + 2] = bb;
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      let cover = 1;
      if (radius > 0) {
        const cx = x + 0.5 < radius ? radius : x + 0.5 > w - radius ? w - radius : x + 0.5;
        const cy = y + 0.5 < radius ? radius : y + 0.5 > h - radius ? h - radius : y + 0.5;
        const dist = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
        cover = Math.max(0, Math.min(1, radius - dist + 0.5));
        if (dist === 0) cover = 1;
      }
      const alpha = Math.min(1, img[i + 3] / 255) * cover;
      const o = ((top + y) * size + left + x) * 3;
      rgb[o] = clamp8(img[i] * cover + br * (1 - alpha));
      rgb[o + 1] = clamp8(img[i + 1] * cover + bg * (1 - alpha));
      rgb[o + 2] = clamp8(img[i + 2] * cover + bb * (1 - alpha));
    }
  }
  return encodeRgbPng(size, size, rgb);
}

function clamp8(v: number): number {
  return v <= 0 ? 0 : v >= 255 ? 255 : Math.round(v);
}

/** The App Store icon: exactly 1024 x 1024 with no transparency (Apple rejects alpha). */
export function appStoreIcon(icon: Image, background: string): Buffer {
  return compose(icon, 1024, 1024, background);
}

/** Launch screen: the icon, with rounded corners, in the middle of the background color. */
export function splashImage(icon: Image, background: string): Buffer {
  return compose(icon, 2732, 560, background, 0.2237);
}

/**
 * The color of an icon's border when the whole border is one opaque color
 * (a logo on a colored square), else null. An Android adaptive icon uses it
 * as its background, so the icon looks edge to edge.
 */
export function iconEdgeColor(icon: Image): string | null {
  const { width: w, height: h, data } = icon;
  const step = Math.max(1, Math.floor(Math.min(w, h) / 64));
  const points: Array<[number, number]> = [];
  for (let x = 0; x < w; x += step) points.push([x, 0], [x, h - 1]);
  for (let y = 0; y < h; y += step) points.push([0, y], [w - 1, y]);
  let r = 0;
  let g = 0;
  let b = 0;
  for (const [x, y] of points) {
    const i = (y * w + x) * 4;
    if (data[i + 3] < 250) return null;
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
  }
  const n = points.length;
  const mean = [r / n, g / n, b / n];
  for (const [x, y] of points) {
    const i = (y * w + x) * 4;
    if (Math.abs(data[i] - mean[0]) > 24 || Math.abs(data[i + 1] - mean[1]) > 24 || Math.abs(data[i + 2] - mean[2]) > 24) return null;
  }
  return `#${mean.map((v) => clamp8(v).toString(16).padStart(2, "0")).join("")}`;
}

/**
 * Draws the icon, scaled to fit a box of `box` pixels and centered, on a
 * size x size canvas: filled with `background`, or transparent when it is
 * null. "circle" cuts the whole canvas to a circle (a round launcher icon).
 * Opaque results are saved without an alpha channel.
 */
export function drawIcon(src: Image, opts: { size: number; box: number; background: string | null; mask?: "circle" }): Buffer {
  const { size, box } = opts;
  const canvas = new Float32Array(size * size * 4); // premultiplied RGBA, 0-255
  if (opts.background) {
    const [br, bg, bb] = hexToRgb(opts.background);
    for (let i = 0; i < size * size; i++) {
      canvas[i * 4] = br;
      canvas[i * 4 + 1] = bg;
      canvas[i * 4 + 2] = bb;
      canvas[i * 4 + 3] = 255;
    }
  }
  const scale = Math.min(box / src.width, box / src.height);
  const w = Math.max(1, Math.round(src.width * scale));
  const h = Math.max(1, Math.round(src.height * scale));
  const img = resize(src, w, h);
  const left = Math.floor((size - w) / 2);
  const top = Math.floor((size - h) / 2);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const o = ((top + y) * size + left + x) * 4;
      const keep = 1 - Math.min(255, img[i + 3]) / 255;
      for (let c = 0; c < 4; c++) canvas[o + c] = img[i + c] + canvas[o + c] * keep;
    }
  }
  if (opts.mask === "circle") {
    const center = size / 2;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const cover = Math.max(0, Math.min(1, center - Math.hypot(x + 0.5 - center, y + 0.5 - center) + 0.5));
        const o = (y * size + x) * 4;
        for (let c = 0; c < 4; c++) canvas[o + c] *= cover;
      }
    }
  }
  let opaque = true;
  for (let i = 3; i < canvas.length; i += 4) {
    if (canvas[i] < 254.5) {
      opaque = false;
      break;
    }
  }
  if (opaque) {
    const rgb = Buffer.alloc(size * size * 3);
    for (let i = 0; i < size * size; i++) {
      rgb[i * 3] = clamp8(canvas[i * 4]);
      rgb[i * 3 + 1] = clamp8(canvas[i * 4 + 1]);
      rgb[i * 3 + 2] = clamp8(canvas[i * 4 + 2]);
    }
    return encodeRgbPng(size, size, rgb);
  }
  const rgba = Buffer.alloc(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    const a = canvas[i * 4 + 3];
    const k = a > 0 ? 255 / a : 0;
    rgba[i * 4] = clamp8(canvas[i * 4] * k);
    rgba[i * 4 + 1] = clamp8(canvas[i * 4 + 1] * k);
    rgba[i * 4 + 2] = clamp8(canvas[i * 4 + 2] * k);
    rgba[i * 4 + 3] = clamp8(a);
  }
  return encodeRgbaPng(size, size, rgba);
}

/** An 8-bit RGBA PNG. */
export function encodeRgbaPng(width: number, height: number, rgba: Buffer): Buffer {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    const o = y * (stride + 1);
    raw[o] = 1; // "Sub" filter
    for (let i = 0; i < stride; i++) raw[o + 1 + i] = (rgba[y * stride + i] - (i >= 4 ? rgba[y * stride + i - 4] : 0)) & 0xff;
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    PNG_SIGNATURE,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(raw, { level: 9 })),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

/** An 8-bit RGB PNG (no alpha channel). */
export function encodeRgbPng(width: number, height: number, rgb: Buffer): Buffer {
  const stride = width * 3;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    const row = rgb.subarray(y * stride, (y + 1) * stride);
    const prev = y > 0 ? rgb.subarray((y - 1) * stride, y * stride) : null;
    // "Up" for rows that match the one above (all zeros), otherwise "Sub".
    const same = prev !== null && row.equals(prev);
    const o = y * (stride + 1);
    raw[o] = same ? 2 : 1;
    if (same) continue;
    for (let i = 0; i < stride; i++) raw[o + 1 + i] = (row[i] - (i >= 3 ? row[i - 3] : 0)) & 0xff;
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // RGB
  return Buffer.concat([
    PNG_SIGNATURE,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(raw, { level: 9 })),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function pngChunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "latin1"), data]);
  let c = 0xffffffff;
  for (const byte of body) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE((c ^ 0xffffffff) >>> 0);
  return Buffer.concat([length, body, crc]);
}
