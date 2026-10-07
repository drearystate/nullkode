import { nanoid } from "nanoid";
import type { User } from "@prisma/client";
import { db } from "../db";
import { checkProjectLimit, checkPublishLimit } from "../guard";
import { publishDraft } from "../deployments";
import { appPublicUrl } from "../reseller";
import { syncProjectNav } from "../nav-sync";
import { slugify } from "../utils";
import { translator } from "../ai/i18n";
import type { Locale } from "@/i18n/locales";
import { publishGame } from "./events";
import { gameHtml, isEngine } from "./kits";
import { asFiles, ownedGame } from "./store";

/**
 * Publishing a game: it becomes a NullKode app (a Project of kind DESIGNER,
 * so the platform's page styles stay out) whose home page is the game, with
 * every file inline, on the app's own address. From there it gets what any
 * app gets: the phone app, a custom domain, and later accounts and
 * leaderboards. Publishing again replaces the page with the game as it is
 * now and makes a new live version (lib/deployments.ts).
 */

/** The page of a published game: the engine scripts, the game's files inline, NK.boot(). Kept out of the shared app menu. */
export function publishedGameHtml(opts: { engine: string; title: string; files: Record<string, string> }): string {
  if (!isEngine(opts.engine)) throw new Error("unknown engine");
  const inline = Object.fromEntries(Object.entries(opts.files).filter(([p]) => p === "game.json" || p === "assets.lock.json" || p.endsWith(".js") || p.startsWith("levels/")));
  return `<!--nk:no-nav-->\n${gameHtml({ engine: opts.engine, title: opts.title, inline })}`;
}

export async function publishGameAsApp(user: User, gameId: string, locale: Locale): Promise<{ projectId: string; url: string; version: number }> {
  const t = translator(locale, "games");
  const game = await ownedGame(user.id, gameId);
  if (game.seq < 1) throw new Error(t("server.nothingToPublish"));
  const running = await db.gameJob.findFirst({ where: { gameId, status: "running" }, select: { id: true } });
  if (running) throw new Error(t("server.stillBuilding"));
  const html = publishedGameHtml({ engine: game.engine, title: game.name, files: asFiles(game.files) });

  let project = game.projectId ? await db.project.findFirst({ where: { id: game.projectId, ownerId: user.id } }) : null;
  if (project && project.kind !== "DESIGNER") project = null;
  if (!project) {
    const limit = await checkProjectLimit(user);
    if (limit) throw new Error(((await limit.json()) as { error?: string }).error ?? t("server.error"));
    const slug = `${slugify(game.name) || "game"}-${nanoid(6).toLowerCase()}`;
    project = await db.project.create({ data: { name: game.name, slug, kind: "DESIGNER", ownerId: user.id, description: t("publish.appDescription") } });
    await db.gameProject.update({ where: { id: gameId }, data: { projectId: project.id } });
  }
  if (!project.published) {
    const limit = await checkPublishLimit(user);
    if (limit) throw new Error(((await limit.json()) as { error?: string }).error ?? t("server.error"));
  }
  const projectId = project.id;
  await db.$transaction(async (tx) => {
    const home = await tx.page.findFirst({ where: { projectId, isHome: true } });
    if (home) await tx.page.update({ where: { id: home.id }, data: { html, css: "", title: game.name } });
    else await tx.page.create({ data: { projectId, slug: "home", title: game.name, isHome: true, html, css: "" } });
    await tx.project.update({ where: { id: projectId }, data: { name: game.name } });
  });
  await syncProjectNav(projectId).catch(() => 0);
  const { version } = await publishDraft(projectId, user.id);
  publishGame(gameId, { type: "game" });
  const fresh = await db.project.findUniqueOrThrow({ where: { id: projectId } });
  return { projectId, url: await appPublicUrl(fresh), version };
}
