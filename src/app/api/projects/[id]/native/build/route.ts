import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { json } from "@/lib/utils";
import { getTranslations } from "next-intl/server";
import { requestLocale } from "@/i18n/request";
import { errorText, renderMsg, requestErrorsT, type ErrMsg, type ErrT } from "@/lib/errors-i18n";
import {
  startAndroidBuild,
  getBuildStatus,
  listBuilds,
  androidToolchainStatus,
  NativeBuildError,
} from "@/lib/apk-build";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Messages for people, in their language (only looked up when needed). */
async function tr() {
  return getTranslations({ locale: await requestLocale(), namespace: "project.nativeApi" });
}

async function owned(id: string) {
  const user = await getCurrentUser();
  if (!user) return { error: (await tr())("unauthorized"), status: 401 };
  const project = await db.project.findUnique({ where: { id } });
  if (!project || project.ownerId !== user.id)
    return { error: (await tr())("notFound"), status: 404 };
  return { project };
}

/**
 * Start a build; returns a buildId to poll. Body: { kind: "debug" } for a test
 * APK (the default), or { kind: "release" } for Google Play (AAB + signed APK).
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const res = await owned(id);
  if ("error" in res) return json({ error: res.error }, { status: res.status });
  const { project } = res;

  const body = (await req.json().catch(() => null)) as { kind?: unknown } | null;
  const kind = body?.kind === "release" ? "release" : body?.kind === undefined || body?.kind === "debug" ? "debug" : null;
  if (!kind) return json({ error: "kind must be \"debug\" or \"release\"" }, { status: 400 });

  if (!project.published) {
    return json(
      { error: (await tr())("build.publishFirst") },
      { status: 409 },
    );
  }
  const toolchain = await androidToolchainStatus();
  if (!toolchain.ready) {
    return json(
      { error: (await tr())("build.unavailable", { reason: toolchain.reason ?? "" }) },
      { status: 503 },
    );
  }

  try {
    const started = await startAndroidBuild(project, kind);
    return json({ ...started, kind });
  } catch (err) {
    if (err instanceof NativeBuildError) return json({ error: errorText(err, await requestErrorsT()) }, { status: err.status });
    console.error("[native/build]", err);
    return json({ error: (await tr())("build.startFailed") }, { status: 500 });
  }
}

/** Poll one build (?buildId=...), or list this app's builds, newest first. */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const res = await owned(id);
  if ("error" in res) return json({ error: res.error }, { status: res.status });

  const buildId = new URL(req.url).searchParams.get("buildId");
  const te = await requestErrorsT();
  if (!buildId) return json({ builds: (await listBuilds(id)).map((b) => publicStatus(b, te)) });

  const status = await getBuildStatus(id, buildId);
  if (!status) return json({ error: (await tr())("build.unknownBuild") }, { status: 404 });
  return json(publicStatus(status, te));
}

/** A build's status without server details, its error and icon note in the person's language. */
function publicStatus<T extends { owner?: string; error?: string; errorMsg?: ErrMsg; iconNote?: string; iconNoteMsg?: ErrMsg }>(status: T, te: ErrT) {
  const { owner: _owner, errorMsg, iconNoteMsg, ...rest } = status;
  return {
    ...rest,
    ...(errorMsg ? { error: renderMsg(errorMsg, te) } : {}),
    ...(iconNoteMsg ? { iconNote: renderMsg(iconNoteMsg, te) } : {}),
  };
}
