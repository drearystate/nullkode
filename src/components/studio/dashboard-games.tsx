"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { AppWindow, ArrowRight, ArrowUpRight, Clock3, Gamepad2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { LocalTime } from "@/components/local-time";
import type { DashboardGame } from "@/lib/dashboard-games";

/** How often the cards refresh while a game is building (its picture changes after every step). */
const POLL_MS = 8000;

/** "Your games" on the dashboard: the newest games from the Game Studio, or an invitation to make one. */
export function DashboardGames({ games: initial, total: initialTotal }: { games: DashboardGame[]; total: number }) {
  const t = useTranslations("studio.dashboard");
  const [games, setGames] = useState(initial);
  const [total, setTotal] = useState(initialTotal);
  const building = games.some((g) => g.building);

  // While a game builds, check now and then for its new pictures and when it's done.
  useEffect(() => {
    if (!building) return;
    let stopped = false;
    const timer = setTimeout(async () => {
      if (document.visibilityState === "hidden") { if (!stopped) setGames((g) => [...g]); return; }
      const data = await fetch("/api/me/games", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
      if (stopped) return;
      if (data && Array.isArray(data.games)) { setGames(data.games); setTotal(Number(data.total) || data.games.length); }
      else setGames((g) => [...g]);
    }, POLL_MS);
    return () => { stopped = true; clearTimeout(timer); };
  }, [building, games]);

  return <section className="mt-10" aria-labelledby="games-heading" data-testid="dashboard-games">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="studio-eyebrow">{t("gamesEyebrow")}</p><h2 id="games-heading" className="mt-2 text-2xl font-semibold tracking-tight" data-help={t("yourGamesHelp")}>{t("yourGames")} {total > 0 && <span className="studio-count">{total}</span>}</h2></div>
      {total > 0 && <div className="flex items-center gap-4 text-sm"><Link href="/games" className="inline-flex items-center gap-1.5 text-surface-300 hover:text-surface-50" data-help={t("newGameHelp")}><Gamepad2 size={15} />{t("newGame")}</Link><Link href="/games" className="inline-flex items-center gap-1 text-brand-300 hover:text-brand-200" data-help={t("seeAllGamesHelp")} data-testid="see-all-games">{t("seeAllGames")} <ArrowRight size={15} className="rtl:-scale-x-100" /></Link></div>}
    </div>
    {games.length === 0
      ? <div className="studio-empty mt-6 sm:flex-row sm:gap-5 sm:py-7 sm:text-start" data-testid="games-empty">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-brand-500/10 text-brand-300"><Gamepad2 size={24} strokeWidth={1.5} /></span>
        <div className="mt-3 min-w-0 flex-1 sm:mt-0"><h3 className="font-semibold">{t("firstGameTitle")}</h3><p className="mt-1 text-sm text-surface-400">{t("firstGameText")}</p></div>
        <Link href="/games" className="btn-ghost mt-4 shrink-0 sm:mt-0" data-help={t("makeGameHelp")} data-testid="empty-make-game"><Gamepad2 size={16} />{t("makeGame")}</Link>
      </div>
      : <div className="studio-project-grid mt-6">{games.map((g) => <GameCard key={g.id} game={g} />)}</div>}
  </section>;
}

function GameCard({ game }: { game: DashboardGame }) {
  const t = useTranslations("studio.dashboard");
  const engine = game.engine === "three-3d" ? t("engine3d") : t("engine2d");
  return <article className="studio-project-card" data-testid="dashboard-game-card" data-game-id={game.id}>
    <Link href={`/games/${game.id}`} className="block" aria-label={t("openGame", { name: game.name })} data-help={t("openGameHelp")}>
      <div className="studio-project-preview" aria-hidden="true">
        {game.shotSeq !== null
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={`/api/games/${game.id}/versions/${game.shotSeq}/shot`} alt="" className="h-full w-full object-cover" loading="lazy" data-testid="game-shot" />
          : <div className="studio-preview-empty"><Gamepad2 size={36} strokeWidth={1} /><span>{game.building ? t("gameFirstPicture") : t("gameNoPicture")}</span></div>}
        <span className="absolute start-3 top-3 rounded-md bg-black/60 px-1.5 py-0.5 text-[11px] font-medium text-white">{engine}</span>
        <div className="studio-preview-shade" /><span className="studio-preview-open">{t("openInGameStudio")} <ArrowUpRight size={15} className="rtl:-scale-x-100" /></span>
      </div>
    </Link>
    <div className="p-5">
      <div className="flex items-start justify-between gap-3">
        <Link href={`/games/${game.id}`} className="min-w-0" data-help={t("openGameHelp")}><h3 className="truncate font-semibold text-surface-50" dir="auto">{game.name}</h3><p className="mt-1 text-xs text-surface-400">{t("gameKind", { engine })} <span className="mx-1.5">·</span> {t("versionCount", { count: game.versions })}</p></Link>
        <span className="flex shrink-0 items-center gap-1.5">
          {game.building
            ? <span className="studio-status inline-flex items-center gap-1.5 !text-brand-200" data-help={t("gameBuildingHelp")} data-testid="game-building"><span className="!bg-brand-400 animate-pulse" />{t("gameBuilding")}</span>
            : game.projectId ? <span className={`studio-status ${game.published ? "is-live" : ""}`} data-help={game.published ? t("gameLiveHelp") : t("gameDraftHelp")}><span />{game.published ? t("live") : t("draft")}</span> : null}
        </span>
      </div>
      <div className="mt-5 flex items-center justify-between border-t border-white/[0.06] pt-3">
        <span className="flex items-center gap-1.5 text-xs text-surface-400"><Clock3 size={12} /><LocalTime value={game.updatedAt} options={{ month: "short", day: "numeric", timeZone: "UTC" }} /></span>
        <div className="flex items-center gap-2">
          {game.projectId && <Link href={`/projects/${game.projectId}`} className="studio-icon-button" aria-label={t("openGameApp", { name: game.name })} title={t("openGameAppTitle")} data-help={t("openGameAppHelp")}><AppWindow size={15} /></Link>}
          <Link href={`/games/${game.id}`} className="studio-icon-button" aria-label={t("openGame", { name: game.name })} title={t("openInGameStudio")} data-help={t("openGameHelp")}><Gamepad2 size={15} /></Link>
        </div>
      </div>
    </div>
  </article>;
}
