import { deflateSync, inflateSync } from "node:zlib";
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
 */
export async function iosProjectFiles(opts: {
  cfg: NativeConfig;
  url: string;
  allowNavigation: string[];
  iconPng: Buffer | null;
  www: Record<string, string>;
}): Promise<ZipEntry[]> {
  const { cfg } = opts;
  const background = normalizeHexColor(cfg.backgroundColor);
  const tokens: Record<string, string> = {
    __NK_APP_ID__: cfg.appId,
    __NK_VERSION__: cfg.version,
    __NK_BUILD__: String(Math.max(1, Math.floor(cfg.build))),
    __NK_APP_NAME__: xmlEscape(cfg.appName),
    // Light text on dark backgrounds, dark text on light ones (read by Capacitor).
    __NK_STATUS_BAR_STYLE__: readableOn(background) === "#ffffff" ? "UIStatusBarStyleLightContent" : "UIStatusBarStyleDarkContent",
    __NK_IPHONE_ORIENTATIONS__: iphoneOrientations(cfg.orientation),
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
  const icon = decodePng(opts.iconPng) ?? decodePng(defaultAppIconPng(1024, normalizeHexColor(cfg.themeColor, background)));
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
   libraries. Reads non-interlaced PNGs of every color type and bit depth;
   anything else falls back to the generated default icon. */

type Image = { width: number; height: number; data: Uint8Array }; // RGBA, straight alpha

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
// Bigger icons fall back to the default icon (decoding needs memory).
const MAX_SIDE = 4096;

export function decodePng(buf: Buffer | null | undefined): Image | null {
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
  if (!channels || !width || !height || width > MAX_SIDE || height > MAX_SIDE || interlace !== 0) return null;
  if (![1, 2, 4, 8, 16].includes(depth)) return null;
  if (colorType !== 0 && colorType !== 3 && depth < 8) return null;
  if (colorType === 3 && (depth > 8 || !palette)) return null;

  const bitsPerPixel = channels * depth;
  const bpp = Math.max(1, bitsPerPixel >> 3);
  const stride = Math.ceil((width * bitsPerPixel) / 8);
  const line = stride + 1; // each row starts with its filter type
  let raw: Buffer;
  try {
    raw = inflateSync(Buffer.concat(idat), { maxOutputLength: line * height + 1024 });
  } catch {
    return null;
  }
  if (raw.length < line * height) return null;

  // Undo the row filters in place.
  for (let y = 0; y < height; y++) {
    const filter = raw[y * line];
    const at = y * line + 1;
    const up = at - line;
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? raw[at + i - bpp] : 0;
      const b = y > 0 ? raw[up + i] : 0;
      const c = y > 0 && i >= bpp ? raw[up + i - bpp] : 0;
      let v = raw[at + i];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      } else if (filter !== 0) return null;
      raw[at + i] = v & 0xff;
    }
  }

  const max = (1 << Math.min(depth, 8)) - 1;
  const sample = (at: number, index: number): number => {
    if (depth === 8) return raw[at + index];
    if (depth === 16) return (raw[at + index * 2] << 8) | raw[at + index * 2 + 1];
    const bit = index * depth;
    return (raw[at + (bit >> 3)] >> (8 - depth - (bit & 7))) & max;
  };
  const to8 = (v: number) => (depth === 16 ? v >> 8 : depth === 8 ? v : Math.round((v * 255) / max));
  const key = (i: number) => (trns && trns.length >= 2 * (i + 1) ? trns.readUInt16BE(2 * i) : -1);

  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    const at = y * line + 1;
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * 4;
      if (colorType === 3) {
        const index = sample(at, x);
        data[o] = palette![index * 3] ?? 0;
        data[o + 1] = palette![index * 3 + 1] ?? 0;
        data[o + 2] = palette![index * 3 + 2] ?? 0;
        data[o + 3] = trns && index < trns.length ? trns[index] : 255;
      } else if (colorType === 0 || colorType === 4) {
        const g = sample(at, x * channels);
        data[o] = data[o + 1] = data[o + 2] = to8(g);
        data[o + 3] = colorType === 4 ? to8(sample(at, x * 2 + 1)) : g === key(0) ? 0 : 255;
      } else {
        const r = sample(at, x * channels);
        const g = sample(at, x * channels + 1);
        const b = sample(at, x * channels + 2);
        data[o] = to8(r);
        data[o + 1] = to8(g);
        data[o + 2] = to8(b);
        data[o + 3] =
          colorType === 6 ? to8(sample(at, x * 4 + 3)) : r === key(0) && g === key(1) && b === key(2) ? 0 : 255;
      }
    }
  }
  return { width, height, data };
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
