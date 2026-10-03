import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { json } from "@/lib/utils";
import { getTranslations } from "next-intl/server";
import { requestLocale } from "@/i18n/request";
import { errorText, renderMsg, requestErrorsT, type ErrMsg, type ErrT } from "@/lib/errors-i18n";
import { NativeBuildError } from "@/lib/apk-build";
import { engineToolchainStatus, getEngineBuildStatus, listEngineBuilds, startEngineBuild } from "@/lib/native-engine-build";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Android builds of the NullKode Native engine for this app (owner only).
 * Same shape as ../build (the WebView shell); see src/lib/native-engine-build.ts.
 * Not used by the studio yet (phase 3 of nk-plan/native-plan.md).
 */

async function tr() {
  return getTranslations({ locale: await requestLocale(), namespace: "nativeEngine" });
}

async function owned(id: string) {
  const user = await getCurrentUser();
  if (!user) return { error: (await tr())("unauthorized"), status: 401 };
  const project = await db.project.findUnique({ where: { id } });
  if (!project || project.ownerId !== user.id) return { error: (await tr())("notFound"), status: 404 };
  return { project };
}

/** Start a build. Body: { kind: "debug" } (test APK, default) or { kind: "release" } (AAB + signed APK). */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const res = await owned(id);
  if ("error" in res) return json({ error: res.error }, { status: res.status });
  const { project } = res;

  const body = (await req.json().catch(() => null)) as { kind?: unknown } | null;
  const kind = body?.kind === "release" ? "release" : body?.kind === undefined || body?.kind === "debug" ? "debug" : null;
  if (!kind) return json({ error: 'kind must be "debug" or "release"' }, { status: 400 });
  if (!project.published) return json({ error: (await tr())("publishFirst") }, { status: 409 });

  const toolchain = await engineToolchainStatus();
  if (!toolchain.ready) return json({ error: (await tr())("unavailable", { reason: toolchain.reason }) }, { status: 503 });

  try {
    return json({ ...(await startEngineBuild(project, kind)), kind });
  } catch (err) {
    if (err instanceof NativeBuildError) return json({ error: errorText(err, await requestErrorsT()) }, { status: err.status });
    console.error("[native/engine-build]", err);
    return json({ error: (await tr())("startFailed") }, { status: 500 });
  }
}

/** Poll one build (?buildId=...), or list this app's engine builds, newest first. */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const res = await owned(id);
  if ("error" in res) return json({ error: res.error }, { status: res.status });
  const te = await requestErrorsT();
  const buildId = new URL(req.url).searchParams.get("buildId");
  if (!buildId) return json({ builds: (await listEngineBuilds(id)).map((b) => publicStatus(b, te)) });
  const status = await getEngineBuildStatus(id, buildId);
  if (!status) return json({ error: (await tr())("unknownBuild") }, { status: 404 });
  return json(publicStatus(status, te));
}

function publicStatus<T extends { owner?: string; errorMsg?: ErrMsg; iconNoteMsg?: ErrMsg }>(status: T, te: ErrT) {
  const { owner: _owner, errorMsg, iconNoteMsg, ...rest } = status;
  return {
    ...rest,
    ...(errorMsg ? { error: renderMsg(errorMsg, te) } : {}),
    ...(iconNoteMsg ? { iconNote: renderMsg(iconNoteMsg, te) } : {}),
  };
}
