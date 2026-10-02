import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { nanoid } from "nanoid";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { openai } from "@/lib/ai/client";
import { json } from "@/lib/utils";
import { getTranslations } from "next-intl/server";
import { requestLocale } from "@/i18n/request";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/svg+xml"]);

const ICON_MODEL = process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1.5-mini";

/** Messages for people, in their language (only looked up when needed). */
async function tr() {
  return getTranslations({ locale: await requestLocale(), namespace: "project.iconApi" });
}

async function requireOwned(id: string) {
  const user = await getCurrentUser();
  if (!user) return { error: json({ error: (await tr())("unauthorized") }, { status: 401 }) };
  const project = await db.project.findUnique({ where: { id } });
  if (!project || project.ownerId !== user.id) {
    return { error: json({ error: (await tr())("notFound") }, { status: 404 }) };
  }
  return { user, project };
}

async function saveBuffer(buf: Buffer, ext: string, mime: string) {
  const now = new Date();
  const bucket = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const dir = path.join(process.cwd(), "public", "uploads", bucket, "icons");
  await mkdir(dir, { recursive: true });
  const fname = `${nanoid(10)}.${ext}`;
  await writeFile(path.join(dir, fname), buf);
  return { url: `/uploads/${bucket}/icons/${fname}`, mime };
}

/**
 * POST with multipart/form-data field `icon` → uploads an image file.
 * POST with application/json { prompt } → generates via OpenAI images API.
 * Both paths update Project.icon and return { icon }.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const r = await requireOwned(id);
  if ("error" in r) return r.error;

  const ct = req.headers.get("content-type") ?? "";

  // ── Multipart upload ────────────────────────────────────────
  if (ct.includes("multipart/form-data")) {
    const form = await req.formData().catch(() => null);
    if (!form) return json({ error: (await tr())("invalidForm") }, { status: 400 });
    const file = form.get("icon");
    if (!(file instanceof File) || file.size === 0) {
      return json({ error: (await tr())("missingFile") }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return json({ error: (await tr())("tooBig") }, { status: 413 });
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return json({ error: (await tr())("wrongType") }, { status: 400 });
    }
    const ext = file.type === "image/svg+xml" ? "svg"
      : file.type === "image/jpeg" ? "jpg"
      : file.type === "image/webp" ? "webp"
      : "png";
    const buf = Buffer.from(await file.arrayBuffer());
    const saved = await saveBuffer(buf, ext, file.type);
    const updated = await db.project.update({
      where: { id },
      data: { icon: saved.url },
    });
    return json({ icon: updated.icon });
  }

  // ── AI generation ───────────────────────────────────────────
  const Body = z.object({ prompt: z.string().min(3).max(500) });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: (await tr())("invalidInput") }, { status: 400 });

  const fullPrompt =
    `App icon for "${r.project.name}". ${parsed.data.prompt}. ` +
    `Flat, bold, centered, high contrast, no text, square composition, ` +
    `works at small sizes. Minimalist modern icon design.`;

  let b64: string | undefined;
  try {
    // OpenAI Images API — model name is overridable via OPENAI_IMAGE_MODEL.
    // Falls back gracefully if the model identifier is rejected.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res: any = await (await openai()).images.generate({
      model: ICON_MODEL,
      prompt: fullPrompt,
      size: "1024x1024",
      n: 1,
    });
    b64 = res?.data?.[0]?.b64_json;
    if (!b64 && res?.data?.[0]?.url) {
      const imgRes = await fetch(res.data[0].url);
      const ab = await imgRes.arrayBuffer();
      b64 = Buffer.from(ab).toString("base64");
    }
  } catch (e) {
    return json(
      { error: (e as Error).message || (await tr())("generationFailed") },
      { status: 502 },
    );
  }
  if (!b64) return json({ error: (await tr())("noImage") }, { status: 502 });

  const buf = Buffer.from(b64, "base64");
  const saved = await saveBuffer(buf, "png", "image/png");
  const updated = await db.project.update({
    where: { id },
    data: { icon: saved.url },
  });
  return json({ icon: updated.icon });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const r = await requireOwned(id);
  if ("error" in r) return r.error;
  await db.project.update({ where: { id }, data: { icon: null } });
  return json({ ok: true });
}
