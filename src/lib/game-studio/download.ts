import type { Locale } from "@/i18n/locales";
import { hitLimit } from "../rate-limit";
import { translator } from "../ai/i18n";
import { GameError } from "./errors";
import { exportGameZip, exportPreview, type ExportInfo } from "./export";
import { isEngine } from "./kits";
import { asFiles, ownedGame } from "./store";

/**
 * Downloading a person's game (export.ts makes the .zip): the workspace's
 * Download button and the partner API's GET /games/{id}/export.
 */

/** What a download of the person's game would leave out (the "check" before the download). */
export async function exportCheck(userId: string, gameId: string): Promise<ExportInfo> {
  return exportPreview(asFiles((await ownedGame(userId, gameId)).files));
}

/**
 * The download of a person's game: the .zip and its file name. Refused before
 * the first build, and limited to 20 an hour per person.
 */
export async function exportOwnedGame(userId: string, gameId: string, locale: Locale): Promise<{ zip: Buffer; filename: string; info: ExportInfo }> {
  const t = translator(locale, "games");
  const game = await ownedGame(userId, gameId);
  if (!isEngine(game.engine) || game.seq < 1) throw new GameError("nothing_to_export", t("server.nothingToExport"));
  if (!hitLimit(`game-export:${userId}`, 20, 60 * 60_000).ok) throw new GameError("rate_limited", t("server.tryAgain"));
  const { zip, info } = await exportGameZip({ name: game.name, engine: game.engine, version: game.kitVersion, files: asFiles(game.files) });
  const name = (game.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "game").slice(0, 60);
  return { zip, filename: `${name}.zip`, info };
}
