import { z } from "zod";
import { getTranslations } from "next-intl/server";
import { ownedProject } from "@/lib/guard";
import { json } from "@/lib/utils";
import { requestLocale } from "@/i18n/request";
import { connectionView, ConnectionInputError, deleteConnection, getLimits, isPlatformOwner, listConnections, saveConnection, setLimits } from "@/lib/app-ai/connections";
import { projectAiStatus } from "@/lib/app-ai/status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The app's own AI connections ("AI keys", docs/ai-in-apps.md). Keys are
 * write-only: they come in on POST and only a masked hint ever goes out.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const r = await ownedProject(id);
  if ("error" in r) return r.error;
  const [connections, limits, status] = await Promise.all([listConnections(id), getLimits(id), projectAiStatus(id)]);
  return json({ connections: connections.map(connectionView), limits, status, platformOwner: await isPlatformOwner(r.user) });
}

const Save = z.object({
  name: z.string().max(40).optional(),
  provider: z.string().max(20),
  baseUrl: z.string().max(500).nullable().optional(),
  apiKey: z.string().max(400).nullable().optional(),
  model: z.string().max(200),
  chatModel: z.string().max(200).nullable().optional(),
  visionModel: z.string().max(200).nullable().optional(),
  speechModel: z.string().max(200).nullable().optional(),
  voice: z.string().max(60).nullable().optional(),
  embedModel: z.string().max(200).nullable().optional(),
  isDefault: z.boolean().optional(),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const r = await ownedProject(id);
  if ("error" in r) return r.error;
  const t = await getTranslations({ locale: await requestLocale(), namespace: "aiKeys" });
  const parsed = Save.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: t("errors.invalid") }, { status: 400 });
  try {
    const saved = await saveConnection(id, parsed.data);
    return json({ connection: connectionView(saved) });
  } catch (err) {
    if (err instanceof ConnectionInputError) return json({ error: t(`errors.${err.code}`), field: err.field }, { status: 400 });
    console.error("[ai-keys] save failed:", err instanceof Error ? err.message : "error");
    return json({ error: t("errors.saveFailed") }, { status: 500 });
  }
}

const Limits = z.object({ limits: z.object({ perHour: z.number().int().min(1).max(100000).optional(), perVisitorHour: z.number().int().min(1).max(100000).optional() }) });

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const r = await ownedProject(id);
  if ("error" in r) return r.error;
  const t = await getTranslations({ locale: await requestLocale(), namespace: "aiKeys" });
  const parsed = Limits.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: t("errors.invalid") }, { status: 400 });
  return json({ limits: await setLimits(id, parsed.data.limits) });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const r = await ownedProject(id);
  if ("error" in r) return r.error;
  const t = await getTranslations({ locale: await requestLocale(), namespace: "aiKeys" });
  const body = (await req.json().catch(() => null)) as { id?: unknown } | null;
  const which = typeof body?.id === "string" ? body.id : new URL(req.url).searchParams.get("connection") ?? "";
  if (!which || !(await deleteConnection(id, which))) return json({ error: t("errors.notFound") }, { status: 404 });
  return json({ ok: true });
}
