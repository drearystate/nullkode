import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { nanoid } from "nanoid";
import { json } from "@/lib/utils";
import { hitLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/antibot";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 20 * 1024 * 1024; // 20 MB per file

/**
 * File upload endpoint for app forms (e.g. the File Upload module, where an
 * app's visitors send a photo or a CV). Accepts multipart/form-data, writes
 * each file to /public/uploads/<yyyymm>/<random>-<name> and returns
 * { fieldName: publicUrl }.
 *
 * Visitors aren't signed in, so it stays open, but only for ordinary file
 * types (pictures, audio, video, PDF, office documents, plain text) — never
 * HTML, SVG or scripts, which would run on this site's own address — and
 * each visitor is rate limited. Uploaded files are also served with
 * nosniff, and anything that isn't media is sandboxed (see middleware).
 */
const ALLOWED = new Set([
  "png", "jpg", "jpeg", "gif", "webp", "avif", "heic", "heif", "ico", "bmp",
  "mp3", "wav", "m4a", "ogg", "oga", "aac", "flac", "mp4", "webm", "mov", "m4v",
  "pdf", "txt", "csv", "md", "json", "rtf",
  "doc", "docx", "xls", "xlsx", "ppt", "pptx", "odt", "ods", "odp", "zip",
]);
const MAX_FILES = 5;
export async function POST(req: Request) {
  const limit = hitLimit(`upload:${clientIp(req)}`, 60, 60 * 60 * 1000);
  if (!limit.ok) return json({ error: "Too many uploads. Try again later." }, { status: 429, headers: { "retry-after": String(limit.retryAfterSec) } });
  const ct = req.headers.get("content-type") ?? "";
  if (!ct.includes("multipart/form-data")) {
    return json({ error: "multipart/form-data required" }, { status: 400 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return json({ error: "Could not parse form" }, { status: 400 });
  }

  const now = new Date();
  const bucket = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const dir = path.join(process.cwd(), "public", "uploads", bucket);
  await mkdir(dir, { recursive: true });

  const files = [...form.entries()].filter((e): e is [string, File] => e[1] instanceof File && e[1].size > 0);
  if (files.length > MAX_FILES) return json({ error: `Send at most ${MAX_FILES} files at a time.` }, { status: 400 });
  for (const [, value] of files) {
    const ext = value.name.toLowerCase().split(".").pop() ?? "";
    if (!value.name.includes(".") || !ALLOWED.has(ext)) {
      return json({ error: `${value.name}: this kind of file can't be uploaded. Try a picture, PDF or document.` }, { status: 415 });
    }
  }

  const uploaded: Record<string, string> = {};
  for (const [key, value] of files) {
    if (value.size > MAX_BYTES) {
      return json({ error: `${value.name} exceeds 20MB limit` }, { status: 413 });
    }
    const ext = value.name.toLowerCase().split(".").pop()!;
    const base = value.name.slice(0, value.name.lastIndexOf(".")).replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 60) || "file";
    const fname = `${nanoid(10)}-${base}.${ext}`;
    const buf = Buffer.from(await value.arrayBuffer());
    await writeFile(path.join(dir, fname), buf);
    uploaded[key] = `/uploads/${bucket}/${fname}`;
  }

  return json({ ok: true, files: uploaded });
}
