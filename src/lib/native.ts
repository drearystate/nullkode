import { appPublicUrl, publicBaseUrlFor, resellerBrandConfig, resellerForUser } from "./reseller";
import { getBrand } from "./brand";
import { appOrigin } from "./app-hosts";
import { defaultAppIconPng } from "./app-icon";
import { db } from "./db";
import type { Project } from "@prisma/client";
import { readFile } from "node:fs/promises";
import { join, resolve, sep } from "node:path";

/**
 * Native mobile-app packaging for published apps.
 *
 * Every published project is already a server-rendered web app with a
 * PWA manifest, service worker, theme color and icon. To ship it to the App
 * Store / Google Play we wrap that live URL in a thin native shell. The shell
 * loads the published URL, so the app's content keeps updating every time the
 * user re-publishes — no rebuild needed.
 *
 * - Android: src/lib/apk-build.ts builds APKs and Google Play bundles on the
 *   server from native-templates/android-webview.
 * - iOS: the downloadable Capacitor project (this file and
 *   src/lib/native-ios.ts) includes a ready-to-open Xcode project that uses
 *   Swift Package Manager, and an optional GitHub Actions workflow that builds
 *   it on a GitHub Mac and uploads it to TestFlight. Apple only lets Macs
 *   build iOS apps.
 *
 * White-label: nothing in the native outputs names this platform. Defaults
 * (bundle ID prefix, names in READMEs) come from the app owner's brand: their
 * reseller's for a reseller's clients, else the operator's (getBrand).
 */

export type NativePlatform = "android" | "ios";

export type NativeConfig = {
  /** Reverse-DNS bundle / application id, e.g. com.company.myapp */
  appId: string;
  /** Home-screen display name */
  appName: string;
  /** Marketing version, e.g. 1.0.0 */
  version: string;
  /** Integer build number (Android versionCode / iOS CFBundleVersion) */
  build: number;
  orientation: "default" | "portrait" | "landscape";
  /** Splash-screen / page background color */
  backgroundColor: string;
  /** Accent / theme color */
  themeColor: string;
  androidEnabled: boolean;
  iosEnabled: boolean;
  /**
   * The owner's own wording for the phone's permission prompts (iPhone shows
   * it). Empty keys use the suggested wording, which names the app and the
   * feature (src/lib/native-permissions.ts).
   */
  permissionText: PermissionText;
};

/** Wording keys for the phone's permission prompts. */
export type PermissionTextKey = "camera" | "microphone" | "photos" | "location";
export type PermissionText = Partial<Record<PermissionTextKey, string>>;
const PERMISSION_TEXT_KEYS: PermissionTextKey[] = ["camera", "microphone", "photos", "location"];

/** Saved permission wording, cleaned: one line each, at most 300 characters, empty ones dropped. */
export function cleanPermissionText(value: unknown): PermissionText {
  const source = value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  const out: PermissionText = {};
  for (const key of PERMISSION_TEXT_KEYS) {
    const text = source[key];
    if (typeof text !== "string") continue;
    const clean = text.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 300);
    if (clean) out[key] = clean;
  }
  return out;
}

type ThemeShape = { primary?: string; background?: string; text?: string } | null | undefined;

/**
 * Capacitor version of the generated project. It must match the exact
 * capacitor-swift-pm version in native-templates/capacitor-ios (see its README).
 */
export const CAP_VERSION = "8.5.2";

/** Make a single reverse-DNS segment valid: lowercase, alnum only, leading letter. */
export function sanitizeBundleSegment(s: string): string {
  let out = (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!out) out = "app";
  if (/^[0-9]/.test(out)) out = "a" + out;
  return out;
}

/** Validate a full reverse-DNS bundle id (at least two segments). */
export function isValidBundleId(id: string): boolean {
  return /^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)+$/.test(id);
}

/** The brand an app's native outputs carry, and its default bundle ID prefix. */
export type NativeBrand = { name: string; bundlePrefix: string };

/**
 * A reseller's clients (and the reseller itself) get the reseller's name and
 * com.<reseller-slug>; everyone else gets the operator's brand.
 */
export async function nativeBrandFor(ownerId: string): Promise<NativeBrand> {
  const [owner, platform] = await Promise.all([
    db.user.findUnique({ where: { id: ownerId }, select: { id: true, role: true, resellerId: true } }),
    getBrand(),
  ]);
  const reseller = await resellerForUser(owner);
  if (reseller) {
    return { name: resellerBrandConfig(reseller, platform).appName, bundlePrefix: `com.${sanitizeBundleSegment(reseller.slug)}` };
  }
  return { name: platform.appName, bundlePrefix: `com.${sanitizeBundleSegment(platform.appName)}` };
}

export function defaultBundleId(project: Pick<Project, "slug">, bundlePrefix: string): string {
  return `${bundlePrefix}.${sanitizeBundleSegment(project.slug)}`;
}

type AppAddress = Pick<Project, "id" | "slug" | "ownerId"> & { hostLabel?: string | null };

/**
 * The live address the native shell loads: the app's public URL (its own
 * domain, its <label>.<APPS_DOMAIN> origin, or /app/<slug> on the owner's
 * platform address). See appPublicUrl.
 */
export async function publishedAppUrl(project: AppAddress): Promise<string> {
  return appPublicUrl(project);
}

/**
 * Every host the app's pages may live on, so the wrapper keeps them inside the
 * app instead of opening the phone's browser: the app's own address, its
 * active custom domains, its <label>.<APPS_DOMAIN> origin, and the platform
 * address (older installs start at /app/<slug> there and are redirected; it
 * also serves /api and /uploads).
 */
export async function appNavigationHosts(project: AppAddress): Promise<string[]> {
  const hosts = new Set<string>();
  const add = (url: string | null | undefined) => {
    if (!url) return;
    try {
      hosts.add(new URL(url).hostname.toLowerCase());
    } catch {
      // Not a URL.
    }
  };
  add(await appPublicUrl(project));
  const hostLabel =
    project.hostLabel !== undefined
      ? project.hostLabel
      : (await db.project.findUnique({ where: { id: project.id }, select: { hostLabel: true } }))?.hostLabel ?? null;
  add(await appOrigin({ id: project.id, slug: project.slug, hostLabel }).catch(() => null));
  const domains = await db.domain.findMany({ where: { projectId: project.id, status: "ACTIVE" }, select: { host: true } });
  for (const d of domains) hosts.add(d.host.toLowerCase());
  const owner = await db.user.findUnique({ where: { id: project.ownerId }, select: { id: true, role: true, resellerId: true } });
  add(await publicBaseUrlFor(owner));
  add(process.env.PUBLIC_BASE_URL);
  return [...hosts];
}

export function defaultNativeConfig(
  project: Pick<Project, "slug" | "name" | "theme">,
  bundlePrefix: string,
): NativeConfig {
  const theme = (project.theme as ThemeShape) ?? null;
  return {
    appId: defaultBundleId(project, bundlePrefix),
    appName: project.name.slice(0, 30),
    version: "1.0.0",
    build: 1,
    orientation: "default",
    backgroundColor: theme?.background ?? "#0b0b0b",
    themeColor: theme?.primary ?? "#0b0b0b",
    androidEnabled: true,
    iosEnabled: true,
    permissionText: {},
  };
}

/**
 * Merge any saved native config over the derived defaults. A saved bundle ID
 * always wins (store listings depend on it); see nativeConfigFor for the
 * owner's default prefix.
 */
export function resolveNativeConfig(
  project: Pick<Project, "slug" | "name" | "theme" | "native">,
  bundlePrefix: string,
): NativeConfig {
  const defaults = defaultNativeConfig(project, bundlePrefix);
  const saved = (project.native as Partial<NativeConfig> | null) ?? null;
  if (!saved) return defaults;
  return {
    appId: typeof saved.appId === "string" && saved.appId ? saved.appId : defaults.appId,
    appName:
      typeof saved.appName === "string" && saved.appName ? saved.appName : defaults.appName,
    version:
      typeof saved.version === "string" && saved.version ? saved.version : defaults.version,
    build: Number.isFinite(saved.build) ? Number(saved.build) : defaults.build,
    orientation:
      saved.orientation === "portrait" ||
      saved.orientation === "landscape" ||
      saved.orientation === "default"
        ? saved.orientation
        : defaults.orientation,
    backgroundColor:
      typeof saved.backgroundColor === "string" && saved.backgroundColor
        ? saved.backgroundColor
        : defaults.backgroundColor,
    themeColor:
      typeof saved.themeColor === "string" && saved.themeColor
        ? saved.themeColor
        : defaults.themeColor,
    androidEnabled: saved.androidEnabled !== false,
    iosEnabled: saved.iosEnabled !== false,
    permissionText: cleanPermissionText(saved.permissionText),
  };
}

/** The app's native config, with defaults from its owner's brand. */
export async function nativeConfigFor(
  project: Pick<Project, "slug" | "name" | "theme" | "native" | "ownerId">,
): Promise<NativeConfig> {
  return resolveNativeConfig(project, (await nativeBrandFor(project.ownerId)).bundlePrefix);
}

/* ── Colors ──────────────────────────────────────────────────────────── */

/**
 * "#rrggbb" for any "#rgb", "#rrggbb" or "#rrggbbaa" (alpha dropped: native
 * backgrounds are opaque). Anything else gives the fallback.
 */
export function normalizeHexColor(value: string | null | undefined, fallback = "#0b0b0b"): string {
  const parse = (v: string | null | undefined): string | null => {
    const raw = (v ?? "").trim().replace(/^#/, "");
    if (/^[0-9a-f]{3,4}$/i.test(raw)) return `#${raw.slice(0, 3).replace(/./g, (c) => c + c)}`.toLowerCase();
    if (/^[0-9a-f]{6}([0-9a-f]{2})?$/i.test(raw)) return `#${raw.slice(0, 6)}`.toLowerCase();
    return null;
  };
  return parse(value) ?? parse(fallback) ?? "#0b0b0b";
}

export function hexToRgb(hex: string): [number, number, number] {
  const h = normalizeHexColor(hex).slice(1);
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
}

function luminance(hex: string): number {
  const channel = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** White or near-black text, whichever is easier to read on the color. */
export function readableOn(background: string): string {
  return contrast("#ffffff", background) >= contrast("#111111", background) ? "#ffffff" : "#111111";
}

/* ── Project file generators ──────────────────────────────────────────────
   Each returns the text content of one file in the generated Capacitor
   project. The route maps these into the zip. */

export function capacitorConfigJson(cfg: NativeConfig, url: string, allowNavigation: string[] = []): string {
  const background = normalizeHexColor(cfg.backgroundColor);
  const config = {
    appId: cfg.appId,
    appName: cfg.appName,
    webDir: "www",
    // Live wrapper: load the published site directly. Re-publishing
    // updates the app instantly with no store resubmission.
    server: {
      url,
      cleartext: false,
      androidScheme: "https",
      // Shown instead of a blank screen when the site can't be reached.
      errorPath: "offline.html",
      // The app's other addresses stay inside the app (Capacitor opens any
      // other site in the phone's browser).
      ...(allowNavigation.length ? { allowNavigation } : {}),
    },
    backgroundColor: background,
    android: { backgroundColor: background },
    ios: { backgroundColor: background, contentInset: "always" },
  };
  return JSON.stringify(config, null, 2) + "\n";
}

export function packageJson(cfg: NativeConfig): string {
  const pkgName = sanitizeBundleSegment(cfg.appName) || "mobile-app";
  const pkg = {
    name: pkgName,
    version: cfg.version,
    private: true,
    description: `${cfg.appName} — native app project`,
    engines: { node: ">=22" },
    scripts: {
      "add:android": "cap add android",
      "sync": "cap sync",
      "sync:ios": "cap sync ios",
      "open:android": "cap open android",
      "open:ios": "cap open ios",
    },
    // Exact versions: ios/App/CapApp-SPM/Package.swift pins the same one.
    // (Icons are made by the builder; `npx @capacitor/assets` can remake them.)
    dependencies: {
      "@capacitor/android": CAP_VERSION,
      "@capacitor/core": CAP_VERSION,
      "@capacitor/ios": CAP_VERSION,
    },
    devDependencies: {
      "@capacitor/cli": CAP_VERSION,
    },
  };
  return JSON.stringify(pkg, null, 2) + "\n";
}

/** Loading shell shown for the split second before the live URL takes over. */
export function wwwIndexHtml(cfg: NativeConfig, url: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="theme-color" content="${esc(cfg.themeColor)}" />
    <title>${esc(cfg.appName)}</title>
    <style>
      html, body { margin: 0; height: 100%; background: ${esc(cfg.backgroundColor)}; }
      .nk-loading {
        display: flex; align-items: center; justify-content: center;
        height: 100%; color: ${esc(cfg.themeColor)};
        font-family: -apple-system, system-ui, sans-serif; font-size: 15px;
      }
    </style>
  </head>
  <body>
    <div class="nk-loading">Loading ${esc(cfg.appName)}…</div>
    <script>
      // The native shell loads the live published site via capacitor.config server.url.
      // This fallback only runs in a plain browser preview.
      if (!window.Capacitor) { location.replace(${jsString(url)}); }
    </script>
  </body>
</html>
`;
}

/** The offline page template, shared with the Android app (see the file's header). */
export function offlineTemplatePath(): string {
  return join(process.cwd(), "native-templates", "android-webview", "app", "src", "main", "assets", "offline.html");
}

/**
 * The page the app shows when it can't reach its site, in the app's colors.
 * "Try again" opens retryUrl.
 */
export async function offlinePageHtml(cfg: NativeConfig, retryUrl: string): Promise<string> {
  const template = await readFile(offlineTemplatePath(), "utf8");
  const background = normalizeHexColor(cfg.backgroundColor);
  const theme = normalizeHexColor(cfg.themeColor, background);
  const text = readableOn(background);
  // A button in the theme color, unless it would blend into the background.
  const themeShows = contrast(theme, background) >= 1.6;
  const values: Record<string, string> = {
    "{{BG}}": background,
    "{{FG}}": text,
    "{{ACCENT}}": themeShows ? theme : text,
    "{{ACCENT_FG}}": themeShows ? readableOn(theme) : background,
    "{{APP_NAME}}": esc(cfg.appName),
    "{{RETRY_URL_JSON}}": jsString(retryUrl),
  };
  return template.replace(/\{\{[A-Z_]+\}\}/g, (token) => values[token] ?? token);
}

export function gitignore(): string {
  return ["node_modules/", ".DS_Store", "*.log", ""].join("\n");
}

export function nativeMetaJson(cfg: NativeConfig, url: string, slug: string): string {
  return (
    JSON.stringify(
      {
        kind: "capacitor-live-wrapper",
        projectSlug: slug,
        liveUrl: url,
        capacitor: CAP_VERSION,
        config: cfg,
        generatedAt: new Date().toISOString(),
      },
      null,
      2,
    ) + "\n"
  );
}

const ICON_MAX_BYTES = 8 * 1024 * 1024;

/** Why the owner's icon couldn't go into a native app (shown to the owner). */
export const ICON_PROBLEM = {
  notPng: "Your app icon isn't a PNG file.",
  tooBig: "Your app icon file is bigger than 8 MB.",
  unreachable: "Your app icon couldn't be loaded.",
  unreadable: "Your app icon couldn't be read.",
} as const;

/** What a store build says when it had to use the default icon instead of the owner's. */
export function iconNote(problem: string): string {
  return `${problem} This build has a plain icon in your app's colors instead. Upload your icon again as a square PNG (1024 x 1024 pixels is best), then build again.`;
}

/**
 * The project icon for native packaging, as PNG bytes: the owner's icon, or
 * the generated default icon in the theme color (like the published web app)
 * when there is none or it can't be used. Then `problem` says why, so a build
 * can tell the owner. Published apps never show the platform's logo.
 * Handles on-disk files (`/uploads/...` → public/uploads/...) and https URLs.
 */
export async function resolveAppIcon(
  icon: string | null,
  fallbackColor = "#4f46e5",
  fallbackSize = 512,
): Promise<{ png: Buffer; problem?: string }> {
  const fallback = (problem?: string) => ({
    png: defaultAppIconPng(fallbackSize, normalizeHexColor(fallbackColor, "#4f46e5")),
    ...(problem ? { problem } : {}),
  });
  const checked = (bytes: Buffer) =>
    bytes.length > ICON_MAX_BYTES ? fallback(ICON_PROBLEM.tooBig) : isPng(bytes) ? { png: bytes } : fallback(ICON_PROBLEM.notPng);
  if (!icon) return fallback();
  try {
    if (/^https:\/\//i.test(icon)) {
      const res = await fetch(icon, { signal: AbortSignal.timeout(10_000), redirect: "follow" });
      if (!res.ok) return fallback(ICON_PROBLEM.unreachable);
      if (!/image\/png/i.test(res.headers.get("content-type") ?? "")) return fallback(ICON_PROBLEM.notPng);
      if (Number(res.headers.get("content-length")) > ICON_MAX_BYTES) return fallback(ICON_PROBLEM.tooBig);
      return checked(Buffer.from(await res.arrayBuffer()));
    }
    if (icon.startsWith("/")) {
      const path = decodeURIComponent(icon.split(/[?#]/)[0]);
      if (!/\.png$/i.test(path)) return fallback(ICON_PROBLEM.notPng);
      // Only files under public/ (uploads, bundled images).
      const root = resolve(process.cwd(), "public");
      const file = resolve(root, `.${path}`);
      if (!file.startsWith(root + sep)) return fallback(ICON_PROBLEM.unreachable);
      return checked(await readFile(file));
    }
  } catch {
    return fallback(ICON_PROBLEM.unreachable);
  }
  return fallback(ICON_PROBLEM.unreachable);
}

/** The project icon as PNG bytes for native packaging (see resolveAppIcon). */
export async function resolveIconPng(icon: string | null, fallbackColor = "#4f46e5", fallbackSize = 512): Promise<Buffer> {
  return (await resolveAppIcon(icon, fallbackColor, fallbackSize)).png;
}

function isPng(bytes: Buffer): boolean {
  return bytes.length > 8 && bytes.readUInt32BE(0) === 0x89504e47 && bytes.readUInt32BE(4) === 0x0d0a1a0a;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** A JavaScript string literal that is also safe inside an HTML <script>. */
function jsString(s: string): string {
  return JSON.stringify(s).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
}

function orientationLine(cfg: NativeConfig): string {
  if (cfg.orientation === "portrait")
    return "The app stays in **portrait** (upright) on phones. iPads can still rotate, as Apple requires.";
  if (cfg.orientation === "landscape")
    return "The app stays in **landscape** (sideways) on phones. iPads can still rotate, as Apple requires.";
  return "The app turns with the phone.";
}

export function readme(cfg: NativeConfig, url: string, brandName: string): string {
  return `# ${cfg.appName} — mobile app project

This folder holds your app for iPhone, iPad and Android phones. The app shows
your live published site:

> ${url}

Every time you publish changes, the app shows them right away. You only need a
new build when you change the app's name, icon, colors or version.

| | |
|---|---|
| App name | ${cfg.appName} |
| Bundle ID / Application ID | \`${cfg.appId}\` |
| Version | ${cfg.version} (build ${cfg.build}) |
| Theme color | ${cfg.themeColor} |
| Background | ${cfg.backgroundColor} |

${orientationLine(cfg)}

What's inside:

- \`ios/\` — the iPhone and iPad app, ready to open in Xcode. It uses Swift
  Package Manager, so there are no extra setup commands.
- \`.github/workflows/ios.yml\` — builds the iPhone app on GitHub's Mac
  computers and sends it to TestFlight, for people without a Mac.
- \`capacitor.config.json\`, \`www/\` and \`package.json\` — the app's settings
  and the pages it shows before your site loads (\`www/offline.html\` appears
  when there's no internet).

---

## Android

The easiest way: open your app in ${brandName}, go to **Mobile app**, and use:

- **Test on your phone (APK)** — a quick test copy you install yourself.
- **Publish on Google Play (AAB)** — the file you upload to the Google Play
  Console, signed with your app's own upload key. Download the key backup too.

Advanced: to build Android yourself with Android Studio, install
[Node.js 22 or newer](https://nodejs.org), then run \`npm install\`,
\`npm run add:android\`, \`npx @capacitor/assets generate --android\` and
\`npm run open:android\`.

---

## iPhone and iPad (iOS)

Before you start, be sure you have:

- A paid **Apple Developer Program** membership ($99 a year):
  <https://developer.apple.com/programs/>. Apple requires it to put apps on
  the App Store or TestFlight.
- A way to build: **a Mac with Xcode 26 or newer** (option A), or a free
  **GitHub** account, which lends you a Mac in the cloud (option B). Apple
  only lets Macs build iPhone apps, and only accepts apps built with Xcode 26
  or newer.

In both cases, first create the app in App Store Connect
(<https://appstoreconnect.apple.com>): **Apps → + → New App**, platform iOS,
and pick the Bundle ID \`${cfg.appId}\`. If it isn't in the list, register it
first at <https://developer.apple.com/account/resources/identifiers/list>:
**+ → App IDs → App**, choose **Explicit** and type \`${cfg.appId}\`.

### Option A: with a Mac

1. Install Xcode from the Mac App Store.
2. Double-click \`ios/App/App.xcodeproj\`. Xcode opens the app and downloads
   what it needs by itself (this takes a minute the first time).
3. Click **App** in the left list, open **Signing & Capabilities**, and pick
   your team under **Team**.
4. At the top, choose **Any iOS Device (arm64)**, then **Product → Archive**.
5. When it's done, click **Distribute App → App Store Connect → Distribute**.
6. After Apple processes the build (usually under 30 minutes), it shows up in
   App Store Connect under **TestFlight**. From there you can test it on your
   phone, then submit it for review.

Each upload needs a higher build number: in Xcode, click **App**, open
**General**, and raise **Build**.

### Option B: without a Mac (GitHub)

The workflow in \`.github/workflows/ios.yml\` builds the app on a GitHub Mac
and uploads it to TestFlight. You set it up once:

1. **Make an App Store Connect API key.** In App Store Connect, go to
   **Users and Access → Integrations → App Store Connect API → Team Keys**, and
   click **+**. Give it a name and the **App Manager** role. Download the
   \`.p8\` file (you can only download it once), and write down the **Key ID**
   and the **Issuer ID** shown on that page.
2. **Make a distribution certificate.** You need a computer with OpenSSL
   (built into macOS and Linux; on Windows it comes with Git for Windows).
   In a terminal, run:

   \`\`\`bash
   openssl genrsa -out ios_distribution.key 2048
   openssl req -new -key ios_distribution.key -out ios_distribution.csr -subj "/CN=iOS Distribution"
   \`\`\`

   At <https://developer.apple.com/account/resources/certificates/list>
   click **+**, choose **Apple Distribution**, upload \`ios_distribution.csr\`,
   and download the certificate (\`distribution.cer\`). Then run:

   \`\`\`bash
   openssl x509 -inform der -in distribution.cer -out distribution.pem
   openssl pkcs12 -export -legacy -inkey ios_distribution.key -in distribution.pem -out ios_distribution.p12
   \`\`\`

   Choose a password when it asks, and remember it. (If your OpenSSL says
   \`-legacy\` is unknown, run the last command without it.) Keep
   \`ios_distribution.key\` and \`ios_distribution.p12\` private.
3. **Make a provisioning profile.** At
   <https://developer.apple.com/account/resources/profiles/list> click **+**,
   choose **App Store Connect** (under Distribution), pick the App ID
   \`${cfg.appId}\`, pick the certificate from step 2, give it a name, and
   download the \`.mobileprovision\` file.
4. **Put this folder on GitHub.** Create a new repository (private is fine)
   and upload everything in this folder, including the \`.github\` folder.
5. **Add the secrets.** In the repository, open **Settings → Secrets and
   variables → Actions → New repository secret**, and add these six:

   | Secret | What to paste |
   |---|---|
   | \`IOS_CERTIFICATE_P12\` | \`ios_distribution.p12\` as base64 (see below) |
   | \`IOS_CERTIFICATE_PASSWORD\` | the password from step 2 |
   | \`IOS_PROVISIONING_PROFILE\` | the \`.mobileprovision\` file as base64 |
   | \`APP_STORE_CONNECT_KEY_ID\` | the Key ID from step 1 |
   | \`APP_STORE_CONNECT_ISSUER_ID\` | the Issuer ID from step 1 |
   | \`APP_STORE_CONNECT_KEY\` | everything inside the \`.p8\` file, including the BEGIN and END lines |

   To turn a file into base64: on a Mac or Linux run
   \`base64 -i ios_distribution.p12 | tr -d '\\n'\`; in Windows PowerShell run
   \`[Convert]::ToBase64String([IO.File]::ReadAllBytes("ios_distribution.p12"))\`.
   Copy the whole output.
6. **Run it.** Open the repository's **Actions** tab, pick
   **iOS (TestFlight)**, and click **Run workflow**. It takes about 10 to 20
   minutes. When it's green, the build appears in App Store Connect under
   **TestFlight** after Apple finishes processing it.

Each run uses today's date and time as the build number, so it always goes
up. Public repositories run for free; private ones use your GitHub Actions
minutes, and Mac minutes count more than Linux minutes.

If a run fails, open it and read the red step. Common fixes: the profile must
be an **App Store Connect** profile for \`${cfg.appId}\` made with the same
certificate; the certificate secret must be the \`.p12\` (not the \`.cer\`); and
if the upload step says the key isn't allowed, make a new key with the
**Admin** role.

### Sending it to the App Store

In App Store Connect, open your app, fill in the store listing (description,
screenshots, privacy details), pick the build from TestFlight, and click
**Add for Review**. Apple reviews every app. Apps that only show a website
can be turned down, so make sure yours works well as an app (sign-in, useful
screens, no broken links).

### Changing the app later

Your site's content updates by itself. To change the name, icon, colors or
version, change them in ${brandName}, download this project again, and build a new
version. If you edit \`capacitor.config.json\` or \`www/\` yourself, run
\`npm install\` and \`npm run sync:ios\` before building (the GitHub workflow
does this for you).

---

Your server must use a secure address (https) — phones don't open apps over
http.
`;
}
