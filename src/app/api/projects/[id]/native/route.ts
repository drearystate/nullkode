import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { json } from "@/lib/utils";
import { getTranslations } from "next-intl/server";
import { requestLocale } from "@/i18n/request";
import { z } from "zod";
import {
  cleanPermissionText,
  nativeConfigFor,
  publishedAppUrl,
  isValidBundleId,
  sanitizeBundleSegment,
} from "@/lib/native";
import { nativeNeedsFor, suggestedUsageTexts, usageTextsFor } from "@/lib/native-permissions";
import { normalizeSha256, TEAM_ID_RE } from "@/lib/native/app-links";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Messages for people, in their language (only looked up when needed). */
async function tr() {
  return getTranslations({ locale: await requestLocale(), namespace: "project.nativeApi" });
}

/** Messages of the Mobile app tab's newer parts (messages/<locale>/nativeStudio.json). */
async function trStudio() {
  return getTranslations({ locale: await requestLocale(), namespace: "nativeStudio.api" });
}

const Wording = z.string().max(300);
/** The version rule's message; swapped for the person's language when it's the problem. */
const VERSION_RULE = "Use a version like 1.0.0";

const Body = z.object({
  appId: z.string().min(3).max(120).optional(),
  appName: z.string().min(1).max(30).optional(),
  version: z
    .string()
    .regex(/^\d+(\.\d+){0,2}$/, VERSION_RULE)
    .optional(),
  build: z.number().int().min(1).max(2_000_000).optional(),
  orientation: z.enum(["default", "portrait", "landscape"]).optional(),
  backgroundColor: z.string().regex(/^#[0-9a-fA-F]{3,8}$/).optional(),
  themeColor: z.string().regex(/^#[0-9a-fA-F]{3,8}$/).optional(),
  androidEnabled: z.boolean().optional(),
  iosEnabled: z.boolean().optional(),
  // The wording of the phone's permission prompts; "" goes back to the suggested wording.
  permissionText: z
    .object({ camera: Wording, microphone: Wording, photos: Wording, location: Wording })
    .partial()
    .optional(),
  // App links: the Apple Team ID (10 letters/digits) and the Play app signing
  // key's SHA-256; "" clears them (src/lib/native/app-links.ts).
  iosTeamId: z.string().max(20).optional(),
  playSigningSha256: z.string().max(200).optional(),
});

async function load(id: string) {
  const user = await getCurrentUser();
  if (!user) return { error: (await tr())("unauthorized"), status: 401 };
  const project = await db.project.findUnique({ where: { id } });
  if (!project || project.ownerId !== user.id)
    return { error: (await tr())("notFound"), status: 404 };
  return { project };
}

/** Saved native settings as stored, including keys the config doesn't resolve (iosDownload). */
function savedNative(native: unknown): Record<string, unknown> {
  return native && typeof native === "object" && !Array.isArray(native) ? (native as Record<string, unknown>) : {};
}

/**
 * The app's native settings, plus the phone features it uses (camera,
 * microphone, location, files: from its modules and pages), the wording the
 * phone shows for each, and the features of the last iPhone project
 * download (see src/lib/native-permissions.ts).
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const res = await load(id);
  if ("error" in res) return json({ error: res.error }, { status: res.status });
  const { project } = res;
  const [config, liveUrl, needs] = await Promise.all([
    nativeConfigFor(project),
    publishedAppUrl(project),
    nativeNeedsFor(project.id),
  ]);
  const iosDownload = savedNative(project.native).iosDownload;
  return json({
    config,
    published: project.published,
    liveUrl,
    phone: {
      features: needs.features,
      sources: needs.sources,
      suggested: suggestedUsageTexts(config.appName, needs),
      texts: usageTextsFor(config.appName, config.permissionText, needs),
      iosDownload: iosDownload && typeof iosDownload === "object" ? iosDownload : null,
    },
  });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const res = await load(id);
  if ("error" in res) return json({ error: res.error }, { status: res.status });
  const { project } = res;

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    // zod's own messages for other problems stay as they are (the studio's form never sends them).
    const message = parsed.error.issues[0]?.message;
    const t = await tr();
    return json({ error: message === VERSION_RULE ? t("settings.versionFormat") : message ?? t("settings.invalidInput") }, { status: 400 });
  }

  // Normalize a user-supplied bundle id; reject if it can't be made valid.
  let appId = parsed.data.appId;
  if (appId !== undefined) {
    appId = appId.trim().toLowerCase();
    if (!isValidBundleId(appId)) {
      // Try to coerce dotted segments into validity before giving up.
      appId = appId
        .split(".")
        .map((s) => sanitizeBundleSegment(s))
        .join(".");
      if (!isValidBundleId(appId)) {
        return json(
          { error: (await tr())("settings.bundleId") },
          { status: 400 },
        );
      }
    }
  }

  let iosTeamId = parsed.data.iosTeamId;
  if (iosTeamId !== undefined) {
    iosTeamId = iosTeamId.trim().toUpperCase();
    if (iosTeamId && !TEAM_ID_RE.test(iosTeamId)) return json({ error: (await trStudio())("teamId") }, { status: 400 });
  }
  let playSigningSha256 = parsed.data.playSigningSha256;
  if (playSigningSha256 !== undefined && playSigningSha256.trim()) {
    playSigningSha256 = normalizeSha256(playSigningSha256);
    if (!playSigningSha256) return json({ error: (await trStudio())("sha256") }, { status: 400 });
  }

  const current = await nativeConfigFor(project);
  const { permissionText, iosTeamId: _team, playSigningSha256: _play, ...rest } = parsed.data;
  const next = {
    ...current,
    ...rest,
    ...(appId !== undefined ? { appId } : {}),
    permissionText: cleanPermissionText({ ...current.permissionText, ...(permissionText ?? {}) }),
    ...(iosTeamId !== undefined ? { iosTeamId: iosTeamId.trim() } : {}),
    ...(playSigningSha256 !== undefined ? { playSigningSha256: playSigningSha256.trim() } : {}),
  };

  // Keep what the settings don't cover (such as the last iPhone download).
  await db.project.update({ where: { id }, data: { native: { ...savedNative(project.native), ...next } } });
  return json({ config: next });
}
