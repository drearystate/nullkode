import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { json } from "@/lib/utils";
import JSZip from "jszip";
import {
  publishedAppUrl,
  appNavigationHosts,
  nativeBrandFor,
  capacitorConfigJson,
  packageJson,
  wwwIndexHtml,
  offlinePageHtml,
  gitignore,
  readme,
  nativeMetaJson,
  sanitizeBundleSegment,
  resolveIconPng,
  type NativeConfig,
} from "@/lib/native";
import { iosProjectFiles } from "@/lib/native-ios";
import { nativeConfigForOutput } from "@/lib/apk-build";
import { nativeNeedsFor, permissionFeaturesOf, usageTextsFor } from "@/lib/native-permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Streams the app's mobile project: a Capacitor project that wraps the live
 * published address, with the iOS app already generated (ios/, Swift Package
 * Manager, opens straight in Xcode) and an optional GitHub Actions workflow
 * that builds it on a GitHub Mac and uploads it to TestFlight. `?platform=`
 * only changes the download filename.
 */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const project = await db.project.findUnique({ where: { id } });
  if (!project || project.ownerId !== user.id) {
    return json({ error: "Not found" }, { status: 404 });
  }
  if (!project.published) {
    return json(
      { error: "Publish your app first — the mobile app loads its live URL." },
      { status: 409 },
    );
  }

  const platformParam = new URL(req.url).searchParams.get("platform");
  const platform = platformParam === "ios" ? "ios" : platformParam === "android" ? "android" : null;

  // Saves the bundle ID the first time, so later downloads keep it.
  const cfg = await nativeConfigForOutput(project);
  const url = await publishedAppUrl(project);
  const brand = await nativeBrandFor(project.ownerId);
  const hosts = await appNavigationHosts(project);
  const iconPng = await resolveIconPng(project.icon, cfg.themeColor, 1024);

  const www = {
    "index.html": wwwIndexHtml(cfg, url),
    "offline.html": await offlinePageHtml(cfg, url),
  };

  const zip = new JSZip();
  zip.file("package.json", packageJson(cfg));
  zip.file("capacitor.config.json", capacitorConfigJson(cfg, url, hosts));
  for (const [name, content] of Object.entries(www)) zip.file(`www/${name}`, content);
  zip.file(".gitignore", gitignore());
  zip.file("README.md", readme(cfg, url, brand.name));
  zip.file("mobile-app.json", nativeMetaJson(cfg, url, project.slug));

  // App icon → resources/icon.png (input to `npx @capacitor/assets generate`).
  zip.file("resources/icon.png", iconPng);
  zip.file("resources/README.md", iconResourcesReadme(cfg));

  // The phone's permission prompts: their wording, and location only when the app uses it.
  const needs = await nativeNeedsFor(project.id);
  const privacy = { texts: usageTextsFor(cfg.appName, cfg.permissionText, needs), location: needs.features.includes("location") };
  for (const entry of await iosProjectFiles({ cfg, url, allowNavigation: hosts, iconPng, www, privacy })) {
    zip.file(entry.path, entry.data);
  }
  // Remembered, so the Mobile app tab can say when the iPhone app needs a new build.
  const saved = project.native && typeof project.native === "object" && !Array.isArray(project.native) ? project.native : {};
  await db.project.update({
    where: { id: project.id },
    data: { native: { ...saved, iosDownload: { at: new Date().toISOString(), features: permissionFeaturesOf(needs.features) } } },
  });

  const buffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  const base = sanitizeBundleSegment(project.slug) || "app";
  const suffix = platform ? `-${platform}` : "";
  const filename = `${base}-mobile${suffix}.zip`;

  return new Response(buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      "content-type": "application/zip",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
}

function iconResourcesReadme(cfg: NativeConfig): string {
  return `# App icon

\`icon.png\` is your app's icon. The iPhone app in \`ios/\` already has it (in
the size and format the App Store asks for), so you don't need to do anything.

If you build the Android app yourself with Android Studio, or change the icon,
you can make every size with (Node.js 22 or newer):

    npx @capacitor/assets generate --iconBackgroundColor "${cfg.backgroundColor}" --splashBackgroundColor "${cfg.backgroundColor}"

For the best result use a square PNG of at least 1024 x 1024 pixels.
`;
}
