import { db } from "./db";
import { liveSnapshot } from "./deployments";
import { getModule } from "./modules/registry";
import { cleanPermissionText, type PermissionText, type PermissionTextKey } from "./native";

/**
 * Which phone features an app's store builds need: the camera, the
 * microphone, location, and choosing or saving files.
 *
 * The store apps load the live site, so a page that starts using the camera
 * after a build can't get it until the next build: the phone only grants
 * what the app declared. The needs are worked out from the installed
 * modules (their "camera" / "location" tags, see src/lib/modules/types.ts)
 * and from the pages themselves (live and draft), because pages written by
 * AI use these browser features without any module. Each Android build
 * records the set it declared, so the Mobile app tab can say when a new
 * build is needed.
 */

export type PhoneFeature = "camera" | "microphone" | "location" | "files";
export const PHONE_FEATURES: PhoneFeature[] = ["camera", "microphone", "location", "files"];

/** Features that need a permission on the phone. Changing these needs a new store build. */
export type PermissionFeature = "camera" | "microphone" | "location";
export const PERMISSION_FEATURES: PermissionFeature[] = ["camera", "microphone", "location"];

/** Version of the Android app shell (file picker, downloads, permissions, adaptive icon). Builds made before it lack those. */
export const NATIVE_SHELL_VERSION = 2;

/** Why a feature is needed: a module, or a page that uses it. */
export type FeatureSource = { kind: "module" | "page"; label: string };

export type NativeNeeds = {
  features: PhoneFeature[];
  sources: Partial<Record<PhoneFeature, FeatureSource[]>>;
  /** Finer purposes, for the suggested wording (e.g. "qr", "stores"). */
  purposes: string[];
};

/**
 * Modules whose definitions don't carry phone-feature tags yet, and the
 * purpose behind each one (for the wording the phone shows). Taking a photo
 * for an upload needs no camera permission: the phone's camera app takes it.
 */
const MODULE_FEATURES: Record<string, { features: PhoneFeature[]; purpose: string }> = {
  "qr-scanner": { features: ["camera"], purpose: "qr" },
  "file-upload": { features: ["files"], purpose: "uploads" },
  "store-locator": { features: ["location"], purpose: "stores" },
  geofencer: { features: ["location"], purpose: "arrive" },
  "delivery-tracking": { features: ["location"], purpose: "delivery" },
  "delivery-zones": { features: ["location"], purpose: "zones" },
};

/** Browser features a page's HTML uses, with a purpose hint. */
export function featuresInHtml(html: string): Array<{ feature: PhoneFeature; purpose: string }> {
  const found: Array<{ feature: PhoneFeature; purpose: string }> = [];
  if (/data-nk-qr-scanner/i.test(html)) found.push({ feature: "camera", purpose: "qr" });
  for (const m of html.matchAll(/getUserMedia\s*\(([^)]{0,300})/gi)) {
    const args = m[1];
    const audio = /\baudio\s*:\s*(?:true|\{)/i.test(args);
    const video = /\bvideo\s*:\s*(?:true|\{)/i.test(args) || !audio;
    if (video) found.push({ feature: "camera", purpose: "camera" });
    if (audio) found.push({ feature: "microphone", purpose: "record" });
  }
  if (/\b(?:webkit)?SpeechRecognition\b/.test(html)) found.push({ feature: "microphone", purpose: "speech" });
  if (/navigator\s*\.\s*geolocation|\.(?:getCurrentPosition|watchPosition)\s*\(/i.test(html)) found.push({ feature: "location", purpose: "near" });
  if (/<input\b[^>]*\btype\s*=\s*["']?file\b/i.test(html)) found.push({ feature: "files", purpose: "uploads" });
  return found;
}

/** Phone features of one installed module: its own tags, else the built-in list above. */
export function moduleFeatures(moduleId: string): { features: PhoneFeature[]; purpose: string | null } {
  const known = MODULE_FEATURES[moduleId];
  const tagged = (getModule(moduleId)?.provides ?? []).filter((c): c is "camera" | "location" => c === "camera" || c === "location");
  const features = [...new Set<PhoneFeature>([...(known?.features ?? []), ...tagged])];
  return { features, purpose: known?.purpose ?? (tagged.length ? tagged[0] : null) };
}

/** What the app's store builds need, from its installed modules and its live and draft pages. */
export async function nativeNeedsFor(projectId: string): Promise<NativeNeeds> {
  const [installed, draft, live] = await Promise.all([
    db.projectModule.findMany({ where: { projectId }, select: { moduleId: true } }),
    db.page.findMany({ where: { projectId }, select: { slug: true, title: true, html: true } }),
    liveSnapshot(projectId).catch(() => null),
  ]);
  const sources = new Map<PhoneFeature, Map<string, FeatureSource>>();
  const purposes = new Set<string>();
  const add = (feature: PhoneFeature, source: FeatureSource) => {
    const list = sources.get(feature) ?? new Map<string, FeatureSource>();
    list.set(`${source.kind}:${source.label}`, source);
    sources.set(feature, list);
  };

  for (const { moduleId } of installed) {
    const { features, purpose } = moduleFeatures(moduleId);
    if (!features.length) continue;
    const label = getModule(moduleId)?.name ?? moduleId;
    for (const f of features) add(f, { kind: "module", label });
    if (purpose) purposes.add(purpose);
  }
  const pages = new Map<string, { title: string; html: string[] }>();
  for (const p of [...(live?.pages ?? []), ...draft]) {
    const entry = pages.get(p.slug) ?? { title: p.title || p.slug, html: [] };
    entry.html.push(p.html ?? "");
    pages.set(p.slug, entry);
  }
  for (const page of pages.values()) {
    for (const { feature, purpose } of featuresInHtml(page.html.join("\n"))) {
      add(feature, { kind: "page", label: page.title });
      purposes.add(purpose);
    }
  }

  const features = PHONE_FEATURES.filter((f) => sources.has(f));
  return {
    features,
    sources: Object.fromEntries(features.map((f) => [f, [...sources.get(f)!.values()]])),
    purposes: [...purposes].sort(),
  };
}

/* ── Android ─────────────────────────────────────────────────────────── */

/** The Android permissions a set of features needs, in manifest order. */
export function androidPermissions(features: readonly string[]): string[] {
  const out: string[] = [];
  if (features.includes("camera")) out.push("android.permission.CAMERA");
  if (features.includes("microphone")) out.push("android.permission.RECORD_AUDIO", "android.permission.MODIFY_AUDIO_SETTINGS");
  if (features.includes("location")) out.push("android.permission.ACCESS_COARSE_LOCATION", "android.permission.ACCESS_FINE_LOCATION");
  return out;
}

/**
 * The <uses-permission> and <uses-feature> lines for AndroidManifest.xml.
 * Every hardware feature is optional (required="false"): without that,
 * Google Play would hide the app from phones and tablets that lack it,
 * because a permission such as CAMERA implies the hardware is required.
 */
export function androidManifestLines(features: readonly string[]): string {
  const lines = androidPermissions(features).map((p) => `<uses-permission android:name="${p}" />`);
  const hardware = ["android.hardware.camera", "android.hardware.camera.autofocus"];
  if (features.includes("microphone")) hardware.push("android.hardware.microphone");
  if (features.includes("location")) hardware.push("android.hardware.location", "android.hardware.location.gps", "android.hardware.location.network");
  for (const h of hardware) lines.push(`<uses-feature android:name="${h}" android:required="false" />`);
  return lines.map((l) => `    ${l}`).join("\n");
}

/** Permission features a build declared, from its saved feature list. */
export function permissionFeaturesOf(features: readonly string[] | undefined): PermissionFeature[] {
  return PERMISSION_FEATURES.filter((f) => (features ?? []).includes(f));
}

/* ── Wording the phone shows (iOS purpose strings) ───────────────────── */

export type UsageKey = PermissionTextKey;
export const USAGE_KEYS: UsageKey[] = ["camera", "microphone", "photos", "location"];
export type UsageTexts = Record<UsageKey, string>;

function list(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/**
 * Suggested wording for each permission prompt. Apple turns down vague
 * wording (guideline 5.1.1), so each one names the app and says what the
 * feature is for.
 */
export function suggestedUsageTexts(appName: string, needs: Pick<NativeNeeds, "purposes" | "features">): UsageTexts {
  const app = appName.trim() || "This app";
  const p = new Set(needs.purposes);

  const camera = p.has("qr")
    ? `${app} uses your camera to scan QR codes, and to take a photo when you choose to add one.`
    : needs.features.includes("camera")
      ? `${app} uses your camera when you choose to take a photo or video in the app.`
      : `${app} uses your camera only when you choose to take a photo to upload.`;

  const microphone = p.has("speech")
    ? `${app} uses your microphone to turn what you say into text, and when you choose to record a video.`
    : `${app} uses your microphone only when you choose to record a video or voice message in the app.`;

  const photos = `${app} lets you choose photos from your library to upload in the app.`;

  const uses: string[] = [];
  if (p.has("stores")) uses.push("to show the stores nearest to you");
  if (p.has("arrive")) uses.push("to check you in when you arrive at a place");
  if (p.has("delivery")) uses.push("to share where you are for your delivery");
  if (p.has("zones")) uses.push("to check whether your address is in a delivery area");
  if (!uses.length || p.has("near")) uses.push("to show things near you");
  const location = `${app} uses your location ${list(uses)}, only while you use the app.`;

  return { camera, microphone, photos, location };
}

/** The wording to use: the owner's own where they wrote some, else the suggestion. */
export function usageTextsFor(
  appName: string,
  custom: PermissionText | undefined,
  needs: Pick<NativeNeeds, "purposes" | "features">,
): UsageTexts {
  return { ...suggestedUsageTexts(appName, needs), ...cleanPermissionText(custom) };
}
