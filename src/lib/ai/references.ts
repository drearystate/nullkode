import { randomUUID } from "node:crypto";
import { mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { publicFetch } from "../public-url";
import type { Tr } from "./i18n";
import type { VisualBrief } from "./vision";

/**
 * Reference images for AI app building: concept art, sketches, screenshots
 * of apps the person likes, mood boards. Used by the new-app wizard, the
 * Designer chat and the partner API (POST /plan, POST /builds).
 *
 * Every image is checked and shrunk before anything else sees it:
 *  - at most MAX_REFERENCE_IMAGES, each at most MAX_REFERENCE_BYTES once
 *    decoded (or downloaded);
 *  - it must really be a PNG, JPEG, WebP or GIF: the first bytes are checked
 *    and sharp must be able to read it (no matter what it claims to be);
 *  - it is shrunk to at most MAX_SIDE pixels on its longest side (saves AI
 *    tokens), turned upright, and stripped of its metadata (EXIF, GPS);
 *  - a URL must be https and is downloaded through publicFetch, which
 *    refuses private and local addresses (also after redirects).
 *
 * A set of images is stored privately for the person who sent it, in
 * <private uploads>/<userId>/ai-refs/<setId>/ (manifest.json + the images),
 * so plan revisions, the build after a reviewed plan, retries and later
 * Ask-AI edits can reuse it without sending the images again. The visual
 * brief the AI wrote from it (lib/ai/vision.ts) is kept in the manifest,
 * so it is computed (and charged) once. A set nobody used for 7 days is
 * deleted with the runs (sweepReferenceSets, called from lib/ai/runs.ts).
 */

export const MAX_REFERENCE_IMAGES = 6;
export const MAX_REFERENCE_BYTES = 5 * 1024 * 1024;
export const MAX_SIDE = 1600;
export const REFERENCE_MEDIA_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"] as const;
export type ReferenceMediaType = (typeof REFERENCE_MEDIA_TYPES)[number];
/** Kept this long after their last use (the same as build runs). */
export const REFERENCE_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
/** Decompression-bomb guard: no image may unpack to more pixels than this. */
const MAX_INPUT_PIXELS = 50_000_000;
const FETCH_TIMEOUT_MS = 15_000;

export type ReferenceErrorCode =
  | "images_not_supported"
  | "image_too_large"
  | "image_type"
  | "too_many_images"
  | "image_fetch_failed"
  | "invalid_images"
  | "references_not_found";

/** A refusal about the images, in the person's words; `code` is the stable machine code. */
export class ReferenceImageError extends Error {
  constructor(
    readonly code: ReferenceErrorCode,
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ReferenceImageError";
  }
}

/** One image as sent by a browser or a partner: a https `url` or `data` (a data: URL or plain base64). */
export type ReferenceImageInput = { url?: unknown; data?: unknown; mediaType?: unknown; name?: unknown };

export type ProcessedImage = { buffer: Buffer; mediaType: ReferenceMediaType; name: string; width: number; height: number };

export type StoredImage = { file: string; mediaType: ReferenceMediaType; name: string; width: number; height: number; bytes: number };

export type ReferenceSet = {
  id: string;
  ownerId: string;
  createdAt: string;
  usedAt: string;
  images: StoredImage[];
  /** What the AI saw in the images (computed once, lib/ai/vision.ts). */
  brief: VisualBrief | null;
};

/** An image ready for the AI providers (lib/ai/provider.ts attachments). */
export type ImageAttachment = { name: string; mediaType: string; dataUrl: string };

/* ───────────────────────── Checking ───────────────────────── */

/** The real type from the file's first bytes, or null when it isn't one we take. */
export function sniffImageType(buf: Buffer): ReferenceMediaType | null {
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 && buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a) return "image/png";
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length >= 6 && (buf.subarray(0, 6).toString("latin1") === "GIF87a" || buf.subarray(0, 6).toString("latin1") === "GIF89a")) return "image/gif";
  if (buf.length >= 12 && buf.subarray(0, 4).toString("latin1") === "RIFF" && buf.subarray(8, 12).toString("latin1") === "WEBP") return "image/webp";
  return null;
}

function normalizeMediaType(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim().toLowerCase().split(";")[0];
  return s === "image/jpg" ? "image/jpeg" : s;
}

function isAllowedType(s: string | null): s is ReferenceMediaType {
  return s !== null && (REFERENCE_MEDIA_TYPES as readonly string[]).includes(s);
}

function cleanName(v: unknown, index: number): string {
  const s = typeof v === "string" ? v.replace(/[\u0000-\u001f\u007f<>"\\/]/g, "").trim().slice(0, 120) : "";
  return s || `image-${index + 1}`;
}

function decodeData(raw: string, t: Tr, name: string): { buf: Buffer; declared: string | null } {
  let declared: string | null = null;
  let b64 = raw.trim();
  if (b64.startsWith("data:")) {
    const m = /^data:([^;,]*)(;[^,]*)?,/.exec(b64.slice(0, 200));
    if (!m || !/;base64/i.test(m[2] ?? "")) throw new ReferenceImageError("invalid_images", 400, t("references.errors.invalidData", { name }));
    declared = normalizeMediaType(m[1]);
    b64 = b64.slice(m[0].length);
  }
  b64 = b64.replace(/\s+/g, "");
  if (!/^[A-Za-z0-9+/_-]*={0,2}$/.test(b64) || b64.length === 0) throw new ReferenceImageError("invalid_images", 400, t("references.errors.invalidData", { name }));
  // Size first, before decoding anything big.
  if (Math.floor((b64.length * 3) / 4) - (b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0) > MAX_REFERENCE_BYTES) {
    throw new ReferenceImageError("image_too_large", 413, t("references.errors.tooLarge", { name, size: "5 MB" }));
  }
  return { buf: Buffer.from(b64.replace(/-/g, "+").replace(/_/g, "/"), "base64"), declared };
}

async function download(url: string, t: Tr, name: string): Promise<{ buf: Buffer; declared: string | null }> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new ReferenceImageError("image_fetch_failed", 400, t("references.errors.badUrl", { name }));
  }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password) throw new ReferenceImageError("image_fetch_failed", 400, t("references.errors.badUrl", { name }));
  let res: Response;
  try {
    res = await publicFetch(parsed.href, { headers: { accept: "image/png,image/jpeg,image/webp,image/gif;q=0.9,*/*;q=0.1" }, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  } catch {
    throw new ReferenceImageError("image_fetch_failed", 400, t("references.errors.fetchFailed", { name }));
  }
  if (!res.ok || !res.body) {
    await res.body?.cancel().catch(() => {});
    throw new ReferenceImageError("image_fetch_failed", 400, t("references.errors.fetchFailed", { name }));
  }
  const length = Number(res.headers.get("content-length") ?? "");
  if (Number.isFinite(length) && length > MAX_REFERENCE_BYTES) {
    await res.body.cancel().catch(() => {});
    throw new ReferenceImageError("image_too_large", 413, t("references.errors.tooLarge", { name, size: "5 MB" }));
  }
  const chunks: Buffer[] = [];
  let total = 0;
  try {
    const reader = res.body.getReader();
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_REFERENCE_BYTES) {
        await reader.cancel().catch(() => {});
        throw new ReferenceImageError("image_too_large", 413, t("references.errors.tooLarge", { name, size: "5 MB" }));
      }
      chunks.push(Buffer.from(value));
    }
  } catch (err) {
    if (err instanceof ReferenceImageError) throw err;
    throw new ReferenceImageError("image_fetch_failed", 400, t("references.errors.fetchFailed", { name }));
  }
  return { buf: Buffer.concat(chunks), declared: normalizeMediaType(res.headers.get("content-type")) };
}

/**
 * Checks and shrinks one image (see the top of this file). Throws a
 * ReferenceImageError the person can act on.
 */
export async function processImage(input: ReferenceImageInput, index: number, t: Tr): Promise<ProcessedImage> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new ReferenceImageError("invalid_images", 400, t("references.errors.invalid"));
  }
  const name = cleanName(input.name, index);
  const declared = input.mediaType === undefined ? null : normalizeMediaType(input.mediaType);
  if (input.mediaType !== undefined && !isAllowedType(declared)) {
    throw new ReferenceImageError("image_type", 400, t("references.errors.type", { name }));
  }
  const hasUrl = typeof input.url === "string" && input.url.trim() !== "";
  const hasData = typeof input.data === "string" && input.data.trim() !== "";
  if (hasUrl === hasData) throw new ReferenceImageError("invalid_images", 400, t("references.errors.urlOrData", { name }));
  const got = hasData ? decodeData(input.data as string, t, name) : await download((input.url as string).trim(), t, name);
  if (got.buf.length > MAX_REFERENCE_BYTES) throw new ReferenceImageError("image_too_large", 413, t("references.errors.tooLarge", { name, size: "5 MB" }));
  // A data: URL's own type must be one we take too (a URL's Content-Type is only a hint).
  if (hasData && got.declared && !isAllowedType(got.declared)) throw new ReferenceImageError("image_type", 400, t("references.errors.type", { name }));
  const real = sniffImageType(got.buf);
  if (!real) throw new ReferenceImageError("image_type", 400, t("references.errors.type", { name }));

  let meta: Awaited<ReturnType<ReturnType<typeof sharp>["metadata"]>>;
  try {
    meta = await sharp(got.buf, { limitInputPixels: MAX_INPUT_PIXELS, failOn: "error" }).metadata();
  } catch {
    throw new ReferenceImageError("image_type", 400, t("references.errors.unreadable", { name }));
  }
  if (!meta.width || !meta.height) throw new ReferenceImageError("image_type", 400, t("references.errors.unreadable", { name }));

  try {
    // First frame only (an animated GIF becomes a still PNG); upright; no metadata kept.
    const pipeline = sharp(got.buf, { limitInputPixels: MAX_INPUT_PIXELS, animated: false })
      .rotate()
      .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: "inside", withoutEnlargement: true });
    const outType: ReferenceMediaType = real === "image/gif" ? "image/png" : real;
    const out = outType === "image/png"
      ? pipeline.png({ compressionLevel: 9, palette: false })
      : outType === "image/webp"
        ? pipeline.webp({ quality: 85 })
        : pipeline.jpeg({ quality: 85, mozjpeg: true });
    const { data, info } = await out.toBuffer({ resolveWithObject: true });
    return { buffer: data, mediaType: outType, name, width: info.width, height: info.height };
  } catch {
    throw new ReferenceImageError("image_type", 400, t("references.errors.unreadable", { name }));
  }
}

/**
 * Checks a request's `images` list: an array of at most MAX_REFERENCE_IMAGES
 * items. Returns the processed images (empty when there are none).
 */
export async function processImages(raw: unknown, t: Tr): Promise<ProcessedImage[]> {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw)) throw new ReferenceImageError("invalid_images", 400, t("references.errors.invalid"));
  if (raw.length > MAX_REFERENCE_IMAGES) throw new ReferenceImageError("too_many_images", 400, t("references.errors.tooMany", { max: MAX_REFERENCE_IMAGES }));
  const out: ProcessedImage[] = [];
  // One at a time: each may be a download, and sharp is memory hungry.
  for (let i = 0; i < raw.length; i++) out.push(await processImage(raw[i] as ReferenceImageInput, i, t));
  return out;
}

/* ───────────────────────── Storage ───────────────────────── */

const SAFE_ID = /^[A-Za-z0-9_-]{1,64}$/;

/** The private uploads folder (the same as phone-app builds, lib/erase.ts nativeDataRoot). */
function privateRoot(): string {
  return process.env.NK_NATIVE_DIR || join(process.cwd(), "uploads");
}

/** <private uploads>/<userId>/ai-refs — one person's reference image sets. */
export function referencesRoot(userId: string): string {
  if (!SAFE_ID.test(userId)) throw new Error("bad user id");
  return join(privateRoot(), userId, "ai-refs");
}

function setDir(userId: string, id: string): string {
  if (!SAFE_ID.test(id)) throw new Error("bad reference id");
  return join(referencesRoot(userId), id);
}

const EXT: Record<ReferenceMediaType, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif" };

async function writeManifest(dir: string, set: ReferenceSet): Promise<void> {
  await writeFile(join(dir, "manifest.json"), JSON.stringify(set), { mode: 0o600 });
}

/** Saves checked images as a new set for this person. */
export async function storeReferenceSet(userId: string, images: ProcessedImage[]): Promise<ReferenceSet> {
  const id = randomUUID();
  const dir = setDir(userId, id);
  await mkdir(dir, { recursive: true, mode: 0o700 });
  const now = new Date().toISOString();
  const stored: StoredImage[] = [];
  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    const file = `${i}.${EXT[img.mediaType]}`;
    await writeFile(join(dir, file), img.buffer, { mode: 0o600 });
    stored.push({ file, mediaType: img.mediaType, name: img.name, width: img.width, height: img.height, bytes: img.buffer.length });
  }
  const set: ReferenceSet = { id, ownerId: userId, createdAt: now, usedAt: now, images: stored, brief: null };
  await writeManifest(dir, set);
  return set;
}

/**
 * A stored set of this person's, or null (unknown id, someone else's, or
 * already swept). `touch` marks it used now, so it is kept 7 more days.
 */
export async function loadReferenceSet(userId: string, id: unknown, opts: { touch?: boolean } = {}): Promise<ReferenceSet | null> {
  if (typeof id !== "string" || !SAFE_ID.test(id) || !SAFE_ID.test(userId)) return null;
  const dir = setDir(userId, id);
  let set: ReferenceSet;
  try {
    set = JSON.parse(await readFile(join(dir, "manifest.json"), "utf8")) as ReferenceSet;
  } catch {
    return null;
  }
  if (set.ownerId !== userId || set.id !== id || !Array.isArray(set.images)) return null;
  if (opts.touch) {
    set.usedAt = new Date().toISOString();
    await writeManifest(dir, set).catch(() => {});
  }
  return set;
}

/** Saves the AI's visual brief with the set (so it is computed once). */
export async function saveReferenceBrief(set: ReferenceSet, brief: VisualBrief): Promise<void> {
  set.brief = brief;
  set.usedAt = new Date().toISOString();
  await writeManifest(setDir(set.ownerId, set.id), set);
}

/** One stored image's bytes, or null. */
export async function readReferenceImage(set: ReferenceSet, index: number): Promise<{ buffer: Buffer; mediaType: ReferenceMediaType; name: string } | null> {
  const img = set.images[index];
  if (!img || !/^\d+\.(png|jpg|webp|gif)$/.test(img.file)) return null;
  try {
    return { buffer: await readFile(join(setDir(set.ownerId, set.id), img.file)), mediaType: img.mediaType, name: img.name };
  } catch {
    return null;
  }
}

/** The set's images as AI attachments (all of them, or the given indexes). */
export async function referenceAttachments(set: ReferenceSet, indexes?: number[]): Promise<ImageAttachment[]> {
  const out: ImageAttachment[] = [];
  for (const i of indexes ?? set.images.map((_, n) => n)) {
    const img = await readReferenceImage(set, i);
    if (img) out.push({ name: img.name, mediaType: img.mediaType, dataUrl: `data:${img.mediaType};base64,${img.buffer.toString("base64")}` });
  }
  return out;
}

/** What a browser or a partner may see about a set (no paths). */
export function referenceSummary(set: ReferenceSet) {
  return {
    id: set.id,
    count: set.images.length,
    images: set.images.map((img, index) => ({ index, name: img.name, mediaType: img.mediaType, width: img.width, height: img.height })),
  };
}

export async function deleteReferenceSet(userId: string, id: string): Promise<void> {
  if (!SAFE_ID.test(id) || !SAFE_ID.test(userId)) return;
  await rm(setDir(userId, id), { recursive: true, force: true });
}

/**
 * Deletes every set not used for REFERENCE_RETENTION_MS (by the manifest's
 * usedAt, else the folder's last change). Returns how many went.
 */
export async function sweepReferenceSets(now = Date.now(), retentionMs = REFERENCE_RETENTION_MS): Promise<number> {
  const root = privateRoot();
  let users: string[];
  try {
    users = await readdir(root);
  } catch {
    return 0;
  }
  let removed = 0;
  for (const user of users) {
    if (!SAFE_ID.test(user)) continue;
    const base = join(root, user, "ai-refs");
    let sets: string[];
    try {
      sets = await readdir(base);
    } catch {
      continue;
    }
    for (const id of sets) {
      if (!SAFE_ID.test(id)) continue;
      const dir = join(base, id);
      let last = 0;
      try {
        const m = JSON.parse(await readFile(join(dir, "manifest.json"), "utf8")) as Partial<ReferenceSet>;
        last = Date.parse(m.usedAt ?? m.createdAt ?? "");
      } catch {
        // No readable manifest: a half-written set; go by the folder's age.
      }
      if (!Number.isFinite(last) || last <= 0) last = (await stat(dir).catch(() => null))?.mtimeMs ?? now;
      if (now - last <= retentionMs) continue;
      await rm(dir, { recursive: true, force: true }).catch(() => {});
      removed++;
    }
  }
  return removed;
}
