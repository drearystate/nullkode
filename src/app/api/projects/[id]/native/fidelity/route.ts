import { json } from "@/lib/utils";
import { ownedProject } from "@/lib/guard";
import { getTranslations } from "next-intl/server";
import { requestLocale } from "@/i18n/request";
import { liveLanguages } from "@/lib/public-page";
import { nativeSpec } from "@/lib/native/compile";
import { nativePages } from "@/lib/native/status";
import { fidelityError, fidelityImage, fidelityResult, fidelityRunning, startFidelityCheck } from "@/lib/native/fidelity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The phone app's pages for the studio's Native app section (owner only):
 *   GET ?lang=            pages of the live version with their web-view parts
 *                         and "looks the same" checks; { preparing: true }
 *                         while the phone screens are being made (starts that)
 *   GET ?lang=&image=slug the side-by-side picture of a page's check (PNG)
 *   POST { page, lang }   check how close a page looks (runs in the
 *                         background; poll GET)
 */

async function tr() {
  return getTranslations({ locale: await requestLocale(), namespace: "nativeStudio.api" });
}

async function language(projectId: string, asked: string | null): Promise<{ lang: string; langs: string[] }> {
  const { app, offered } = await liveLanguages(projectId);
  const langs = offered.map(String);
  return { lang: asked && langs.includes(asked) ? asked : app.locale, langs };
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const r = await ownedProject(id);
  if ("error" in r) return r.error;
  const { project } = r;
  if (!project.published || !project.liveDeploymentId) return json({ error: (await tr())("publishFirst") }, { status: 409 });
  const deploymentId = project.liveDeploymentId;
  const params = new URL(req.url).searchParams;
  const { lang, langs } = await language(id, params.get("lang"));

  const image = params.get("image");
  if (image) {
    const png = await fidelityImage(id, deploymentId, lang, image);
    if (!png) return json({ error: (await tr())("noCheck") }, { status: 404 });
    return new Response(new Uint8Array(png), {
      headers: { "content-type": "image/png", "cache-control": "private, max-age=300", "x-content-type-options": "nosniff" },
    });
  }

  const found = await nativePages(project, lang);
  if (!found) {
    // Make the phone screens now (in the background); the studio asks again.
    void nativeSpec(id, lang, deploymentId).catch((err) => console.error("[native/fidelity] prepare failed:", err instanceof Error ? err.message : err));
    return json({ preparing: true, deploymentId, lang, langs, pages: [] });
  }
  const pages = await Promise.all(
    found.pages.map(async (p) => ({
      ...p,
      check: await fidelityResult(id, deploymentId, lang, p.slug),
      checking: fidelityRunning(id, deploymentId, lang, p.slug),
      checkFailed: fidelityError(id, deploymentId, lang, p.slug) ? true : undefined,
    })),
  );
  return json({ preparing: false, deploymentId, lang, langs, compiledAt: found.app.compiledAt, home: found.app.home, pages });
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const r = await ownedProject(id);
  if ("error" in r) return r.error;
  const { project } = r;
  if (!project.published || !project.liveDeploymentId) return json({ error: (await tr())("publishFirst") }, { status: 409 });
  const body = (await req.json().catch(() => null)) as { page?: unknown; lang?: unknown } | null;
  const { lang } = await language(id, typeof body?.lang === "string" ? body.lang : null);
  const found = await nativePages(project, lang);
  if (!found) return json({ error: (await tr())("preparing") }, { status: 409 });
  const page = typeof body?.page === "string" ? body.page : "";
  if (!found.pages.some((p) => p.slug === page)) return json({ error: (await tr())("noPage") }, { status: 404 });
  void startFidelityCheck(id, project.liveDeploymentId, lang, page).catch(() => {});
  return json({ checking: true, page, lang });
}
