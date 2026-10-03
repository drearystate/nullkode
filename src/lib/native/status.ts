import { readFile, stat } from "fs/promises";
import { join } from "path";
import type { Project } from "@prisma/client";
import { nativeDataRoot } from "@/lib/erase";
import { liveLanguages } from "@/lib/public-page";
import { cachedNativePage, nativeSpec, specDir } from "./compile";
import { NATIVE_SPEC_VERSION, type NativeApp } from "./spec";

/**
 * Where the phone app of a published app stands, for the studio: whether the
 * live version has been turned into the phone app's screens yet.
 *
 * - "offline": not published.
 * - "unused": the phone app was never opened (nothing is prepared until it
 *   is; the first open, preview or build prepares it).
 * - "updating": published again, the phone app's screens are being prepared.
 * - "ready": the phone app shows the live version.
 */
export type NativeSpecState = {
  state: "offline" | "unused" | "updating" | "ready";
  deploymentId: string | null;
  /** When the live version's phone screens were made (ready only). */
  compiledAt: string | null;
};

async function readApp(file: string): Promise<NativeApp | null> {
  try {
    const app = JSON.parse(await readFile(file, "utf8")) as NativeApp;
    return app.v === NATIVE_SPEC_VERSION ? app : null;
  } catch {
    return null;
  }
}

async function everCompiled(projectId: string): Promise<boolean> {
  try {
    return (await stat(join(nativeDataRoot(), projectId, "native", "spec"))).isDirectory();
  } catch {
    return false;
  }
}

export async function nativeSpecState(project: Pick<Project, "id" | "published" | "liveDeploymentId">): Promise<NativeSpecState> {
  if (!project.published || !project.liveDeploymentId) return { state: "offline", deploymentId: null, compiledAt: null };
  const { app: locale } = await liveLanguages(project.id);
  const app = await readApp(join(specDir(project.id, project.liveDeploymentId, locale.locale), "app.json"));
  if (app) return { state: "ready", deploymentId: project.liveDeploymentId, compiledAt: app.compiledAt };
  return { state: (await everCompiled(project.id)) ? "updating" : "unused", deploymentId: project.liveDeploymentId, compiledAt: null };
}

export type NativePageSummary = {
  slug: string;
  title: string;
  isHome: boolean;
  requiresAuth: boolean;
  /** Parts shown as embedded web views, by reason (canvas, iframe, video, audio, embed, script, css); null until compiled. */
  islands: number | null;
  islandReasons: Record<string, number> | null;
};

/**
 * The live version's pages as the phone app has them, in one language.
 * With `prepare`, compiles them first when needed (can take a minute);
 * without, returns null while they aren't ready.
 */
export async function nativePages(
  project: Pick<Project, "id" | "liveDeploymentId">,
  lang: string,
  opts: { prepare?: boolean } = {},
): Promise<{ app: NativeApp; pages: NativePageSummary[] } | null> {
  if (!project.liveDeploymentId) return null;
  const deploymentId = project.liveDeploymentId;
  let app = await readApp(join(specDir(project.id, deploymentId, lang), "app.json"));
  if (!app) {
    if (!opts.prepare) return null;
    app = (await nativeSpec(project.id, lang, deploymentId)).app;
  }
  const pages = await Promise.all(
    app.pages.map(async (ref): Promise<NativePageSummary> => {
      const page = await cachedNativePage(project.id, deploymentId, lang, ref.slug);
      return {
        slug: ref.slug,
        title: ref.title,
        isHome: ref.isHome,
        requiresAuth: ref.requiresAuth,
        islands: page ? page.stats.islands : null,
        islandReasons: page ? page.stats.islandReasons : null,
      };
    }),
  );
  return { app, pages };
}
