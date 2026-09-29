import { db } from "@/lib/db";
import { defaultBundleId, nativeBrandFor, publishedAppUrl } from "@/lib/native";
import { getCurrentUser } from "@/lib/auth";
import { json } from "@/lib/utils";
import { macInstaller, windowsInstaller } from "@/lib/desktop-installer";

/**
 * Downloadable "installers" for a published app (see src/lib/desktop-installer.ts):
 * a Windows .bat that adds app-window shortcuts, and a macOS .command that
 * builds a small .app on the Desktop.
 *
 * Phones don't need a file: the published app already serves a PWA
 * manifest + service worker, so "Add to Home Screen" does the job (the
 * publish tab shows a QR for that), and the Mobile App tab builds real
 * store apps.
 *
 * White-label: the header names the owner's brand, and the Mac bundle ID
 * uses the owner's prefix (com.<reseller> for a reseller's clients) plus
 * ".desktop", so it never clashes with the same app's iPhone build (iPhone
 * apps also run on Apple Silicon Macs).
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; platform: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });

  const { id, platform } = await params;
  if (platform !== "windows" && platform !== "mac") {
    return json({ error: "Unknown platform" }, { status: 404 });
  }

  const project = await db.project.findUnique({
    where: { id },
    select: { id: true, name: true, slug: true, published: true, ownerId: true, hostLabel: true },
  });
  if (!project || project.ownerId !== user.id) {
    return json({ error: "Project not found" }, { status: 404 });
  }
  if (!project.published) {
    return json(
      { error: "Publish the project first — the installer points at the live URL." },
      { status: 400 }
    );
  }

  const [url, brand] = await Promise.all([publishedAppUrl(project), nativeBrandFor(project.ownerId)]);
  const isWin = platform === "windows";
  const body = isWin
    ? windowsInstaller({ appName: project.name, url, brandName: brand.name })
    : macInstaller({
        appName: project.name,
        url,
        brandName: brand.name,
        bundleId: `${defaultBundleId(project, brand.bundlePrefix)}.desktop`,
      });
  const filename = `install-${project.slug}${isWin ? ".bat" : ".command"}`;

  return new Response(body, {
    headers: {
      "content-type": "application/octet-stream",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
}
