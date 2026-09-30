import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser, getImpersonation } from "@/lib/auth";
import { json } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Profile photos arrive already cropped and shrunk by the browser (256×256). */
const MAX_BYTES = 200 * 1024;
const Body = z.object({ dataUrl: z.string().max(Math.ceil((MAX_BYTES * 4) / 3) + 64) });

const SIGNATURES: Array<{ type: string; ok: (b: Buffer) => boolean }> = [
  { type: "image/png", ok: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { type: "image/jpeg", ok: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { type: "image/webp", ok: (b) => b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP" },
];

async function owner() {
  const user = await getCurrentUser();
  if (!user) return { error: json({ error: "Please sign in again." }, { status: 401 }) };
  if (await getImpersonation()) return { error: json({ error: "Only the person who owns this account can change its photo." }, { status: 403 }) };
  return { user };
}

/** Sets the signed-in person's profile photo. */
export async function POST(req: Request) {
  const { user, error } = await owner();
  if (error) return error;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  const m = parsed.success ? parsed.data.dataUrl.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/) : null;
  if (!m) return json({ error: "Choose a PNG, JPEG or WebP picture." }, { status: 400 });
  const bytes = Buffer.from(m[2], "base64");
  if (bytes.length > MAX_BYTES) return json({ error: "That picture is too big. Try a smaller one." }, { status: 413 });
  // The declared type must match what the bytes really are.
  if (!SIGNATURES.some((s) => s.type === m[1] && s.ok(bytes))) return json({ error: "That file isn't a picture we can use." }, { status: 400 });
  await db.user.update({ where: { id: user!.id }, data: { avatarUrl: `data:${m[1]};base64,${bytes.toString("base64")}` } });
  return json({ ok: true });
}

/** Removes the photo; the initial shows again. */
export async function DELETE() {
  const { user, error } = await owner();
  if (error) return error;
  await db.user.update({ where: { id: user!.id }, data: { avatarUrl: null } });
  return json({ ok: true });
}
