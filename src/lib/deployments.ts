import { createHash } from "crypto";
import type { Flow, Page } from "@prisma/client";
import { db } from "./db";
import { isPlatformHost, normalizeHost } from "./hosts";
import { resellerForHost } from "./reseller";

/**
 * Safe publishing. "Publish" freezes the app's pages, flows and theme into an
 * immutable Deployment; the public site serves that snapshot while the owner
 * keeps editing a draft. Any earlier deployment can be made live again
 * (rollback). Apps published before this existed have no live deployment
 * and keep serving their saved pages until they next publish.
 */

export type SnapshotPage = Pick<Page, "id" | "title" | "slug" | "isHome" | "html" | "css"> & Partial<Pick<Page, "components" | "styles">>;
export type SnapshotFlow = Pick<Flow, "id" | "name" | "slug" | "graph"> & Partial<Pick<Flow, "trigger" | "httpPath" | "httpMethod" | "schedule" | "enabled">>;
/** A page in one of a multilingual app's other languages (lib/app-translations.ts). */
export type SnapshotTranslation = { pageId: string; locale: string; title: string; html: string };
export type Snapshot = {
  pages: SnapshotPage[];
  flows: SnapshotFlow[];
  theme?: unknown;
  hash?: string;
  /** Multilingual apps only: every language published, the default first. */
  locales?: string[];
  /** Multilingual apps only: the translated pages, frozen like the pages. */
  translations?: SnapshotTranslation[];
};

/** Fingerprint of everything a visitor can see or trigger. */
export function contentHash(input: { pages: Array<Pick<Page, "slug" | "title" | "isHome" | "html" | "css">>; flows: Array<Pick<Flow, "id" | "slug" | "graph"> & Partial<Pick<Flow, "trigger" | "schedule" | "enabled">>>; theme: unknown; locales?: string[]; translations?: SnapshotTranslation[] }): string {
  const h = createHash("sha256");
  for (const p of [...input.pages].sort((a, b) => a.slug.localeCompare(b.slug))) h.update(`P|${p.slug}|${p.title}|${p.isHome}|${p.html}|${p.css}\n`);
  // A flow's schedule is published like its steps (the scheduler runs the
  // live version's), so it counts as a change. Only scheduled flows add it,
  // so every other app's fingerprint stays as it was.
  const sched = (f: Partial<Pick<Flow, "trigger" | "schedule" | "enabled">>) => (f.trigger === "SCHEDULE" ? `|S|${f.schedule ?? ""}|${f.enabled === false ? 0 : 1}` : "");
  for (const f of [...input.flows].sort((a, b) => a.id.localeCompare(b.id))) h.update(`F|${f.id}|${f.slug}|${JSON.stringify(f.graph)}${sched(f)}\n`);
  h.update(`T|${JSON.stringify(input.theme ?? null)}`);
  // Languages and translations count only for multilingual apps, so every
  // other app's fingerprint stays as it was.
  if (input.locales?.length) h.update(`\nL|${input.locales.join(",")}`);
  for (const t of [...(input.translations ?? [])].sort((a, b) => `${a.pageId}|${a.locale}`.localeCompare(`${b.pageId}|${b.locale}`))) h.update(`\nX|${t.pageId}|${t.locale}|${t.title}|${t.html}`);
  return h.digest("hex");
}

/** The current draft, as a snapshot ready to publish. */
export async function draftSnapshot(projectId: string): Promise<Snapshot> {
  const [project, pages, flows, app] = await Promise.all([
    db.project.findUnique({ where: { id: projectId }, select: { theme: true } }),
    db.page.findMany({ where: { projectId } }),
    db.flow.findMany({ where: { projectId } }),
    import("./app-locale").then((m) => m.getAppLocale(projectId)),
  ]);
  const theme = project?.theme ?? null;
  if (app.locales.length < 2) return { pages, flows, theme, hash: contentHash({ pages, flows, theme }) };
  // A multilingual app publishes its languages and translated pages too.
  const locales: string[] = app.locales;
  const translations: SnapshotTranslation[] = await db.pageTranslation.findMany({
    where: { page: { projectId }, locale: { in: locales.slice(1) } },
    select: { pageId: true, locale: true, title: true, html: true },
  });
  return { pages, flows, theme, locales, translations, hash: contentHash({ pages, flows, theme, locales, translations }) };
}

// Deployments never change, so they can be cached by id indefinitely (with a
// size cap so a large install doesn't hold every snapshot in memory).
const cache = new Map<string, Snapshot>();
const CACHE_MAX = 200;

export async function deploymentSnapshot(deploymentId: string): Promise<Snapshot | null> {
  const hit = cache.get(deploymentId);
  if (hit) return hit;
  const row = await db.deployment.findUnique({ where: { id: deploymentId }, select: { snapshot: true } });
  if (!row) return null;
  const snap = row.snapshot as unknown as Snapshot;
  if (!Array.isArray(snap?.pages)) return null;
  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value!);
  cache.set(deploymentId, snap);
  return snap;
}

/** The snapshot the public site serves, or null for legacy (serve saved pages). */
export async function liveSnapshot(projectId: string): Promise<Snapshot | null> {
  const project = await db.project.findUnique({ where: { id: projectId }, select: { liveDeploymentId: true } });
  return project?.liveDeploymentId ? deploymentSnapshot(project.liveDeploymentId) : null;
}

/** Publish the current draft as a new version and make it live. */
export async function publishDraft(projectId: string, userId: string | null): Promise<{ version: number; deploymentId: string }> {
  const snap = await draftSnapshot(projectId);
  const last = await db.deployment.findFirst({ where: { projectId }, orderBy: { version: "desc" }, select: { version: true } });
  const version = (last?.version ?? 0) + 1;
  const deployment = await db.deployment.create({
    data: { projectId, version, snapshot: snap as unknown as object, createdBy: userId },
  });
  await db.project.update({
    where: { id: projectId },
    data: { published: true, publishedAt: new Date(), liveDeploymentId: deployment.id },
  });
  // Schedules are published too: work out their next runs from this version
  // now rather than at the next scheduler tick.
  await import("./flow/scheduler")
    .then((m) => m.planFlows(new Date(), projectId))
    .catch((err) => console.error("[scheduler] couldn't plan schedules after publishing:", err instanceof Error ? err.message : err));
  return { version, deploymentId: deployment.id };
}

/** Whether the draft differs from what's live (always true for legacy apps). */
export async function hasUnpublishedChanges(projectId: string): Promise<boolean> {
  const [live, draft] = await Promise.all([liveSnapshot(projectId), draftSnapshot(projectId)]);
  if (!live) return true;
  return (live.hash ?? contentHash({ pages: live.pages, flows: live.flows, theme: live.theme, locales: live.locales, translations: live.translations })) !== draft.hash;
}

/**
 * True when a request comes from a builder page (editor canvas, preview,
 * flow tester) rather than the published app. The Referer is only a hint:
 * callers must also check that the signed-in user owns the project before
 * running the draft, because anyone can send any Referer.
 */
export async function fromBuilderPage(req: Request): Promise<boolean> {
  const referer = req.headers.get("referer");
  if (!referer) return false;
  let url: URL;
  try {
    url = new URL(referer);
  } catch {
    return false;
  }
  if (!/^\/(projects|preview|designer)(\/|$)/.test(url.pathname)) return false;
  // Only the builder's own domains count — a published app on its own domain
  // can have a page called "projects".
  const host = normalizeHost(url.host);
  return isPlatformHost(host) || Boolean(await resellerForHost(host));
}
