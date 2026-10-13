import { db } from "@/lib/db";
import { json } from "@/lib/utils";
import { hitLimit } from "@/lib/rate-limit";
import { googleOAuthClient, PLAY_TRACKS, type PlayTrack } from "@/lib/store-publish/google-play";
import { getRepo } from "@/lib/store-publish/fdroid";
import { listReleases, startFdroidRelease, startPlayRelease } from "@/lib/store-publish/releases";
import { accountView, errorResponse, ownedProject, repoView, tr } from "@/lib/store-publish/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Sending this app's Google Play builds to the stores (src/lib/store-publish):
 * GET lists the owner's store connections and this app's sends (poll it while
 * one is running); POST starts a send.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const res = await ownedProject(id);
  if ("response" in res) return res.response;
  const [accounts, repo, client, releases, fdroidApps] = await Promise.all([
    db.storeAccount.findMany({ where: { userId: res.user.id }, orderBy: { createdAt: "asc" } }),
    getRepo(res.user.id),
    googleOAuthClient(),
    listReleases(id),
    db.fdroidRepoApp.findMany({ where: { projectId: id }, orderBy: { versionCode: "desc" }, select: { versionCode: true, versionName: true, addedAt: true } }),
  ]);
  return json({
    accounts: accounts.map(accountView),
    googleSignIn: Boolean(client),
    repo: repo ? await repoView(repo) : null,
    fdroidVersions: fdroidApps.map((a) => ({ versionCode: a.versionCode, versionName: a.versionName, addedAt: a.addedAt.toISOString() })),
    releases,
  });
}

/**
 * Body for Google Play: { store: "google_play", accountId, buildId, track, releaseStatus: "completed"|"draft"|"inProgress",
 * userFraction? (0-1, staged rollout), notes?, notesLanguage? }.
 * Body for F-Droid: { store: "fdroid", buildId, summary?, description?, whatsNew? }.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const res = await ownedProject(id, { write: true });
  if ("response" in res) return res.response;
  const t = await tr();
  if (!hitLimit(`store-publish:${id}`, 30, 60 * 60_000).ok) return json({ error: t("tooManyTries") }, { status: 429 });
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const text = (k: string) => (typeof body?.[k] === "string" ? (body[k] as string) : undefined);
  const buildId = text("buildId") ?? "";
  if (!buildId) return json({ error: t("chooseBuild") }, { status: 400 });

  try {
    if (body?.store === "google_play") {
      const track = text("track") as PlayTrack | undefined;
      if (!track || !PLAY_TRACKS.includes(track)) return json({ error: t("chooseTrack") }, { status: 400 });
      const releaseStatus = text("releaseStatus");
      if (releaseStatus !== "completed" && releaseStatus !== "draft" && releaseStatus !== "inProgress") return json({ error: t("chooseTrack") }, { status: 400 });
      const userFraction = typeof body.userFraction === "number" ? body.userFraction : undefined;
      if (releaseStatus === "inProgress" && !(userFraction && userFraction > 0 && userFraction < 1)) return json({ error: t("badRollout") }, { status: 400 });
      const release = await startPlayRelease(res.project, res.user, {
        accountId: text("accountId") ?? "",
        buildId,
        track,
        releaseStatus,
        userFraction,
        notes: text("notes"),
        notesLanguage: text("notesLanguage"),
      });
      return json({ release });
    }
    if (body?.store === "fdroid") {
      const release = await startFdroidRelease(res.project, res.user, { buildId, summary: text("summary"), description: text("description"), whatsNew: text("whatsNew") });
      return json({ release });
    }
    return json({ error: t("chooseStore") }, { status: 400 });
  } catch (err) {
    return errorResponse(err, "native/publish");
  }
}
