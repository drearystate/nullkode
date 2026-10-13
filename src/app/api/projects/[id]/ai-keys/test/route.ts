import { z } from "zod";
import { getTranslations } from "next-intl/server";
import { ownedProject } from "@/lib/guard";
import { json } from "@/lib/utils";
import { hitLimit } from "@/lib/rate-limit";
import { requestLocale } from "@/i18n/request";
import { encryptSecret } from "@/lib/settings";
import { isProviderId } from "@/lib/app-ai/providers";
import { isPlatformOwner, testConnection } from "@/lib/app-ai/connections";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const Body = z.union([
  z.object({ id: z.string().min(1).max(60) }),
  z.object({ provider: z.string().max(20), baseUrl: z.string().max(500).nullable().optional(), apiKey: z.string().min(8).max(400), model: z.string().min(1).max(200), embedModel: z.string().max(200).nullable().optional() }),
]);

/** "Test connection": one tiny answer with a saved connection, or with a key typed into the form (not saved). */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const r = await ownedProject(id);
  if ("error" in r) return r.error;
  const t = await getTranslations({ locale: await requestLocale(), namespace: "aiKeys" });
  if (!hitLimit(`ai-key-test:${r.user.id}`, 20, 10 * 60_000).ok) return json({ error: t("errors.tooManyTests") }, { status: 429 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: t("errors.invalid") }, { status: 400 });
  const platformOwner = await isPlatformOwner(r.user);
  if ("id" in parsed.data) {
    const conn = await db.appAiConnection.findFirst({ where: { projectId: id, id: parsed.data.id } });
    if (!conn) return json({ error: t("errors.notFound") }, { status: 404 });
    return json(await testConnection(conn, { platformOwner }));
  }
  const d = parsed.data;
  if (!isProviderId(d.provider)) return json({ error: t("errors.provider") }, { status: 400 });
  // Tried in memory only; nothing is saved.
  return json(await testConnection({ provider: d.provider, baseUrl: d.baseUrl ?? null, apiKeyEnc: encryptSecret(d.apiKey.trim()), model: d.model, embedModel: d.embedModel ?? null }, { platformOwner }));
}
