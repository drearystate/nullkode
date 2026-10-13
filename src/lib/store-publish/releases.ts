import type { Prisma, Project, StoreAccount, StoreRelease, User } from "@prisma/client";
import { db } from "@/lib/db";
import { engineBuildFile, getEngineBuildStatus, type EngineBuildStatus } from "@/lib/native-engine-build";
import { nativeConfigFor } from "@/lib/native";
import {
  PLAY_TRACKS,
  PlayError,
  accessTokenFor,
  commitEdit,
  deleteEdit,
  insertEdit,
  updateTrack,
  uploadBundle,
  type PlayErrorCode,
  type PlayTrack,
} from "./google-play";
import { FdroidError, addApk, getRepo } from "./fdroid";

/**
 * Sending an app's release build to a store, in the background (an AAB upload
 * can take minutes; a request would hit the proxy timeout). Each send is a
 * StoreRelease row the Mobile app page polls. Sends of one app run one at a
 * time; a send still "running" from an earlier server process is shown as
 * failed (the server restarted).
 */

const PROCESS_TAG = `${process.pid}:${Math.round(performance.timeOrigin)}`;

export type ReleaseErrorCode = PlayErrorCode | "noBuild" | "badBuild" | "noRepo" | "badApk" | "signFailed" | "keyMissing" | "restarted" | "busy";

export class ReleaseError extends Error {
  constructor(
    public code: ReleaseErrorCode,
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

/** What screens see of a send. */
export type ReleaseView = {
  id: string;
  store: "google_play" | "fdroid";
  account: string | null;
  buildId: string;
  versionCode: number;
  versionName: string;
  track: string | null;
  releaseStatus: string | null;
  userFraction: number | null;
  status: "running" | "done" | "error";
  step: string | null;
  error: string | null;
  errorCode: string | null;
  result: Record<string, unknown> | null;
  createdAt: string;
  finishedAt: string | null;
};

export function releaseView(r: StoreRelease & { account?: Pick<StoreAccount, "label"> | null }): ReleaseView {
  const result = (r.result ?? null) as Record<string, unknown> | null;
  return {
    id: r.id,
    store: r.store === "fdroid" ? "fdroid" : "google_play",
    account: r.account?.label ?? null,
    buildId: r.buildId,
    versionCode: r.versionCode,
    versionName: r.versionName,
    track: r.track,
    releaseStatus: r.releaseStatus,
    userFraction: r.userFraction,
    status: r.status === "done" ? "done" : r.status === "error" ? "error" : "running",
    step: r.step,
    error: r.error,
    errorCode: typeof result?.errorCode === "string" ? result.errorCode : null,
    result,
    createdAt: r.createdAt.toISOString(),
    finishedAt: r.finishedAt?.toISOString() ?? null,
  };
}

export async function listReleases(projectId: string, take = 20): Promise<ReleaseView[]> {
  const rows = await db.storeRelease.findMany({ where: { projectId }, orderBy: { createdAt: "desc" }, take, include: { account: { select: { label: true } } } });
  const stale = rows.filter((r) => r.status === "running" && r.owner !== PROCESS_TAG);
  if (stale.length) {
    await db.storeRelease.updateMany({
      where: { id: { in: stale.map((r) => r.id) }, status: "running" },
      data: { status: "error", error: "The server restarted while this was being sent. Send it again.", finishedAt: new Date(), result: { errorCode: "restarted" } },
    });
    for (const r of stale) Object.assign(r, { status: "error", error: "The server restarted while this was being sent. Send it again.", result: { errorCode: "restarted" } });
  }
  return rows.map(releaseView);
}

export async function getRelease(projectId: string, id: string): Promise<ReleaseView | null> {
  const rows = await listReleases(projectId, 50);
  return rows.find((r) => r.id === id) ?? null;
}

/** A finished Google Play build of the app (AAB + release APK). */
async function releaseBuild(projectId: string, buildId: string): Promise<EngineBuildStatus> {
  const build = await getEngineBuildStatus(projectId, buildId);
  if (!build || build.kind !== "release") throw new ReleaseError("noBuild", "Choose a finished Google Play build of this app.", 404);
  if (build.status !== "done") throw new ReleaseError("badBuild", "That build isn't finished.", 409);
  return build;
}

async function runningFor(projectId: string): Promise<boolean> {
  const running = await db.storeRelease.findFirst({ where: { projectId, status: "running", owner: PROCESS_TAG }, select: { id: true } });
  return Boolean(running);
}

async function finish(id: string, data: Prisma.StoreReleaseUpdateInput): Promise<void> {
  await db.storeRelease.update({ where: { id }, data: { ...data, finishedAt: new Date() } }).catch((err) => console.error("[store-publish] finish", err));
}

function errorData(err: unknown): Prisma.StoreReleaseUpdateInput {
  if (err instanceof PlayError || err instanceof ReleaseError || err instanceof FdroidError) {
    return { status: "error", error: err.message.slice(0, 1000), result: { errorCode: err.code } };
  }
  console.error("[store-publish]", err);
  return { status: "error", error: (err as Error)?.message?.slice(0, 1000) || "Something went wrong.", result: { errorCode: "other" } };
}

/* ── Google Play ──────────────────────────────────────────────────── */

export type PlayReleaseInput = {
  accountId: string;
  buildId: string;
  track: PlayTrack;
  /** "completed" = release to everyone on the track; "draft" = prepare it in Play Console; "inProgress" = staged rollout. */
  releaseStatus: "completed" | "draft" | "inProgress";
  /** Staged rollout: 0 < userFraction < 1. */
  userFraction?: number;
  notes?: string;
  notesLanguage?: string;
};

export async function startPlayRelease(project: Project, user: Pick<User, "id">, input: PlayReleaseInput): Promise<ReleaseView> {
  if (!PLAY_TRACKS.includes(input.track)) throw new ReleaseError("other", "Unknown track.");
  const account = await db.storeAccount.findFirst({ where: { id: input.accountId, userId: user.id, store: "google_play" } });
  if (!account) throw new ReleaseError("other", "Connect a Google Play account first.", 404);
  const build = await releaseBuild(project.id, input.buildId);
  const file = await engineBuildFile(project.id, build.buildId, "aab");
  if (!file) throw new ReleaseError("noBuild", "That build has no app bundle (AAB).", 404);
  if (await runningFor(project.id)) throw new ReleaseError("busy", "This app is already being sent to a store. Wait for it to finish.", 409);
  const fraction = input.releaseStatus === "inProgress" ? Math.min(0.99, Math.max(0.0001, Number(input.userFraction) || 0.1)) : null;

  const row = await db.storeRelease.create({
    data: {
      projectId: project.id,
      userId: user.id,
      accountId: account.id,
      store: "google_play",
      buildId: build.buildId,
      packageName: build.appId,
      versionCode: build.versionCode,
      versionName: build.version,
      track: input.track,
      releaseStatus: input.releaseStatus,
      userFraction: fraction,
      notes: (input.notes ?? "").trim().slice(0, 500) || null,
      status: "running",
      step: "connecting",
      owner: PROCESS_TAG,
    },
    include: { account: { select: { label: true } } },
  });

  void runPlayRelease(row.id, account, file.path, { ...input, userFraction: fraction ?? undefined }).catch(async (err) => {
    await finish(row.id, errorData(err));
  });
  return releaseView(row);
}

async function runPlayRelease(id: string, account: StoreAccount, aabPath: string, input: PlayReleaseInput): Promise<void> {
  const row = await db.storeRelease.findUniqueOrThrow({ where: { id } });
  const step = (s: string) => db.storeRelease.update({ where: { id }, data: { step: s } }).catch(() => {});
  let token: string;
  try {
    token = await accessTokenFor(account);
  } catch (err) {
    if (err instanceof PlayError) await db.storeAccount.update({ where: { id: account.id }, data: { lastError: err.message.slice(0, 500) } }).catch(() => {});
    throw err;
  }
  const pkg = row.packageName;
  const editId = await insertEdit(token, pkg);
  const result: Record<string, unknown> = { editId };
  try {
    await step("uploading");
    const uploaded = await uploadBundle(token, pkg, editId, aabPath);
    if (uploaded && uploaded !== row.versionCode) result.uploadedVersionCode = uploaded;

    await step("track");
    let status = input.releaseStatus;
    try {
      await updateTrack(token, pkg, editId, input.track, { versionCode: uploaded || row.versionCode, status, userFraction: input.userFraction, notes: row.notes ?? undefined, notesLanguage: input.notesLanguage });
    } catch (err) {
      // Apps that were never published may only have draft releases: keep it as a draft and say so.
      if (!(err instanceof PlayError && err.code === "draftApp") || status === "draft") throw err;
      status = "draft";
      result.draftOnly = true;
      await updateTrack(token, pkg, editId, input.track, { versionCode: uploaded || row.versionCode, status, notes: row.notes ?? undefined, notesLanguage: input.notesLanguage });
    }

    await step("committing");
    try {
      await commitEdit(token, pkg, editId);
    } catch (err) {
      // Some apps (e.g. with changes Google must review by hand) need "send for review" pressed in Play Console.
      if (!(err instanceof PlayError && err.code === "notSentForReview")) throw err;
      await commitEdit(token, pkg, editId, true);
      result.notSentForReview = true;
    }
    await finish(id, { status: "done", step: null, releaseStatus: status, result: result as Prisma.InputJsonValue });
    await db.storeAccount.update({ where: { id: account.id }, data: { lastUsedAt: new Date(), lastError: null } }).catch(() => {});
  } catch (err) {
    await deleteEdit(token, pkg, editId);
    throw err;
  }
}

/* ── F-Droid (the owner's own repository) ─────────────────────────── */

export type FdroidReleaseInput = { buildId: string; summary?: string; description?: string; whatsNew?: string };

export async function startFdroidRelease(project: Project, user: Pick<User, "id">, input: FdroidReleaseInput): Promise<ReleaseView> {
  const repo = await getRepo(user.id);
  if (!repo) throw new ReleaseError("noRepo", "Make your F-Droid repository first.", 404);
  const build = await releaseBuild(project.id, input.buildId);
  const file = await engineBuildFile(project.id, build.buildId, "apk");
  if (!file) throw new ReleaseError("noBuild", "That build has no signed APK.", 404);
  if (await runningFor(project.id)) throw new ReleaseError("busy", "This app is already being sent to a store. Wait for it to finish.", 409);
  const cfg = await nativeConfigFor(project);

  const row = await db.storeRelease.create({
    data: {
      projectId: project.id,
      userId: user.id,
      store: "fdroid",
      buildId: build.buildId,
      packageName: build.appId,
      versionCode: build.versionCode,
      versionName: build.version,
      notes: (input.whatsNew ?? "").trim().slice(0, 500) || null,
      status: "running",
      step: "adding",
      owner: PROCESS_TAG,
    },
  });
  void (async () => {
    try {
      await addApk(repo, project, {
        apkPath: file.path,
        appName: build.appName || cfg.appName,
        themeColor: cfg.themeColor,
        summary: input.summary,
        description: input.description,
        whatsNew: input.whatsNew,
      });
      await finish(row.id, { status: "done", step: null });
    } catch (err) {
      await finish(row.id, errorData(err));
    }
  })();
  return releaseView(row);
}
