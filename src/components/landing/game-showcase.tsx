import Link from "next/link";
import { getTranslations } from "next-intl/server";

/**
 * Official NullKode games (nk-games/showcase/): real, playable 3D games on the
 * Game Studio's engine kits and the CC0 asset library. Screenshots are real
 * frames from the games (public/showcase/). `play` is the published app's
 * address; a game without one shows no Play button.
 */
const GAMES = [
  { id: "village", image: "/showcase/village", play: "https://hearthvale-m920yo.apps.nullkode.io" },
  { id: "mars", image: "/showcase/mars-base", play: "https://red-horizon-q-nmxt.apps.nullkode.io" },
  { id: "dungeon", image: "/showcase/dungeon", play: "https://vault-of-embers-tjene-e467c8.apps.nullkode.io" },
] as const;

export async function GameShowcase({ authed }: { authed: boolean }) {
  const t = await getTranslations("landing.games");
  return (
    <section id="games" className="bg-surface-950 py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <p className="text-xs uppercase tracking-[0.2em] text-blue-400 font-semibold">
            {t("eyebrow")}
          </p>
          <h2 className="mt-3 text-4xl md:text-5xl font-bold tracking-tight text-surface-50">
            {t("heading")}
          </h2>
          <p className="mt-4 text-lg text-surface-400">
            {t("intro")}
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {GAMES.map((g) => (
            <article
              key={g.id}
              className="group flex flex-col rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden transition hover:border-blue-800"
            >
              <div className="relative aspect-[16/9] bg-surface-900">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`${g.image}.webp`}
                  srcSet={`${g.image}-800.webp 800w, ${g.image}.webp 1600w`}
                  sizes="(min-width: 1024px) 380px, 100vw"
                  alt={t(`items.${g.id}.alt`)}
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover"
                />
              </div>
              <div className="flex flex-1 flex-col p-6">
                <p className="text-[11px] uppercase tracking-[0.15em] text-surface-500 font-semibold">
                  {t(`items.${g.id}.genre`)}
                </p>
                <h3 className="mt-2 text-lg font-bold text-surface-50">
                  {t(`items.${g.id}.title`)}
                </h3>
                <p className="mt-2 flex-1 text-sm text-surface-400 leading-relaxed">
                  {t(`items.${g.id}.body`)}
                </p>
                {g.play && (
                  <a
                    href={g.play}
                    target="_blank"
                    rel="noopener"
                    className="mt-5 inline-flex w-fit items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-500 px-4 py-2 text-sm font-semibold text-white transition"
                  >
                    {t("play")}
                    <span aria-hidden className="rtl:-scale-x-100">&rarr;</span>
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm text-surface-500 max-w-2xl mx-auto">
            {t("note")}
          </p>
          <Link
            href={authed ? "/games" : "/signup"}
            className="mt-6 inline-flex items-center gap-2 rounded-xl border border-white/15 hover:border-blue-700 bg-white/[0.04] px-6 py-3 text-sm font-semibold text-surface-50 transition"
          >
            {t("cta")}
            <span aria-hidden className="text-surface-500 rtl:-scale-x-100">&rarr;</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
