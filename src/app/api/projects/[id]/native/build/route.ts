import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { json } from "@/lib/utils";
import {
  startAndroidBuild,
  getBuildStatus,
  listBuilds,
  androidToolchainStatus,
  NativeBuildError,
} from "@/lib/apk-build";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function owned(id: string) {
  const user = await getCurrentUser();
  if (!user) return { error: "Unauthorized" as const, status: 401 };
  const project = await db.project.findUnique({ where: { id } });
  if (!project || project.ownerId !== user.id)
    return { error: "Not found" as const, status: 404 };
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
      { error: "Publish your app first — the Android app loads its live address." },
      { status: 409 },
    );
  }
  const toolchain = await androidToolchainStatus();
  if (!toolchain.ready) {
    return json(
      { error: `Android builds aren't available on this server. ${toolchain.reason}` },
      { status: 503 },
    );
  }

  try {
    const started = await startAndroidBuild(project, kind);
    return json({ ...started, kind });
  } catch (err) {
    if (err instanceof NativeBuildError) return json({ error: err.message }, { status: err.status });
    console.error("[native/build]", err);
    return json({ error: "The build couldn't start. Please try again." }, { status: 500 });
  }
}

/** Poll one build (?buildId=...), or list this app's builds, newest first. */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const res = await owned(id);
  if ("error" in res) return json({ error: res.error }, { status: res.status });

  const buildId = new URL(req.url).searchParams.get("buildId");
  if (!buildId) return json({ builds: (await listBuilds(id)).map(publicStatus) });

  const status = await getBuildStatus(id, buildId);
  if (!status) return json({ error: "Unknown build" }, { status: 404 });
  return json(publicStatus(status));
}

/** A build's status without server details. */
function publicStatus<T extends { owner?: string }>(status: T): Omit<T, "owner"> {
  const { owner: _owner, ...rest } = status;
  return rest;
}
