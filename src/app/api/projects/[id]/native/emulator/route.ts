import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { json } from "@/lib/utils";
import { getTranslations } from "next-intl/server";
import { requestLocale } from "@/i18n/request";
import { engineBuildFile, listEngineBuilds } from "@/lib/native-engine-build";
import { expoGoLink } from "@/lib/native-expo-go";
import {
  EmulatorBusy,
  EmulatorUnavailable,
  ownerEmulatorSession,
  startEmulatorSession,
  stopEmulatorSession,
  viewerUrl,
  type EmulatorSession,
} from "@/lib/native-emulator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The owner's Android preview (an emulator on this server, streamed into the
 * page; see src/lib/native-emulator.ts). One emulator per owner.
 *   POST { mode: "apk", buildId? }  the app's newest test APK (engine build), or that build
 *   POST { mode: "expo-go" }        the app in Expo Go (no build needed)
 *   GET                             the owner's session, if any
 *   DELETE                          stop it
 * Responses carry `viewer`: the address to show in an iframe (it expires with the session).
 */

async function tr() {
  return getTranslations({ locale: await requestLocale(), namespace: "nativeEngine" });
}

function originOf(req: Request): string {
  const url = new URL(req.url);
  const proto = (req.headers.get("x-forwarded-proto") ?? url.protocol.replace(/:$/, "")).split(",")[0].trim() || "https";
  const host = (req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? url.host).split(",")[0].trim();
  return `${proto}://${host}`;
}

function publicSession(s: EmulatorSession, origin: string) {
  return {
    id: s.id,
    state: s.state,
    viewer: viewerUrl(s, origin),
    expiresAt: s.expiresAt,
    bootMs: s.bootMs,
    project: s.project,
  };
}

async function owned(id: string) {
  const user = await getCurrentUser();
  if (!user) return { error: (await tr())("unauthorized"), status: 401 } as const;
  const project = await db.project.findUnique({ where: { id }, select: { id: true, ownerId: true, published: true } });
  if (!project || project.ownerId !== user.id) return { error: (await tr())("notFound"), status: 404 } as const;
  return { user, project } as const;
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const res = await owned(id);
  if ("error" in res) return json({ error: res.error }, { status: res.status });
  const { user, project } = res;
  if (!project.published) return json({ error: (await tr())("publishFirst") }, { status: 409 });

  const body = (await req.json().catch(() => null)) as { mode?: unknown; buildId?: unknown } | null;
  const origin = originOf(req);
  let apkPath: string | undefined;
  let expoUrl: string | undefined;
  if (body?.mode === "expo-go") {
    expoUrl = expoGoLink(project.id, process.env.NK_EMU_EXPO_ORIGIN || origin);
  } else if (body?.mode === "apk") {
    const buildId =
      typeof body.buildId === "string"
        ? body.buildId
        : (await listEngineBuilds(project.id)).find((b) => b.kind === "debug" && b.status === "done")?.buildId;
    const file = buildId ? await engineBuildFile(project.id, buildId, "apk") : null;
    if (!file) return json({ error: (await tr())("notReady") }, { status: 409 });
    apkPath = file.path;
  } else {
    return json({ error: 'mode must be "apk" or "expo-go"' }, { status: 400 });
  }

  try {
    const s = await startEmulatorSession({ ownerId: user.id, projectId: project.id, apkPath, expoUrl });
    return json(publicSession(s, origin));
  } catch (err) {
    if (err instanceof EmulatorBusy) return json({ error: (await tr())("emulatorBusy") }, { status: 429 });
    if (err instanceof EmulatorUnavailable) {
      console.error("[native/emulator]", err.message);
      return json({ error: (await tr())("emulatorUnavailable") }, { status: 503 });
    }
    console.error("[native/emulator]", err);
    return json({ error: (await tr())("emulatorFailed") }, { status: 500 });
  }
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const res = await owned(id);
  if ("error" in res) return json({ error: res.error }, { status: res.status });
  try {
    const s = await ownerEmulatorSession(res.user.id);
    return json({ session: s ? publicSession(s, originOf(req)) : null });
  } catch {
    return json({ error: (await tr())("emulatorUnavailable") }, { status: 503 });
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const res = await owned(id);
  if ("error" in res) return json({ error: res.error }, { status: res.status });
  try {
    const s = await ownerEmulatorSession(res.user.id);
    if (s) await stopEmulatorSession(s.id);
    return json({ ok: true });
  } catch {
    return json({ error: (await tr())("emulatorUnavailable") }, { status: 503 });
  }
}
