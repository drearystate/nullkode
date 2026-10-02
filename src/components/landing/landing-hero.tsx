"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useTranslations } from "next-intl";

/** Longest idea the box takes. */
const IDEA_MAX_CHARS = 600;
/**
 * The idea travels in the address through sign-up (/signup?next=/new?idea=…),
 * encoded twice. Proxies refuse addresses over about 8 KB, and one character
 * in some scripts takes nine bytes once encoded, so the encoded length is
 * capped too.
 */
const IDEA_MAX_ENCODED = 2400;

// Starting points for the box (landing.hero.ideas.<id>). Tapping one fills it in to edit.
const IDEAS = ["bakery", "salon", "gym", "tutoring"] as const;

/** The idea as it will travel: at most IDEA_MAX_CHARS characters and IDEA_MAX_ENCODED encoded. */
function capIdea(text: string): string {
  let encoded = 0;
  let out = "";
  for (const ch of Array.from(text.trim()).slice(0, IDEA_MAX_CHARS)) {
    let size: number;
    try {
      size = encodeURIComponent(ch).length;
    } catch {
      continue; // a broken character from a paste
    }
    if (encoded + size > IDEA_MAX_ENCODED) break;
    encoded += size;
    out += ch;
  }
  return out;
}

export function LandingHero({ authed, moduleCount = 135, aiReady = false }: { authed: boolean; moduleCount?: number; aiReady?: boolean }) {
  const router = useRouter();
  const t = useTranslations("landing.hero");
  const [idea, setIdea] = useState("");
  const [going, setGoing] = useState(false);
  const box = useRef<HTMLTextAreaElement>(null);
  const ready = idea.trim().length >= 5 && !going;

  function start(e?: React.FormEvent) {
    e?.preventDefault();
    const text = capIdea(idea);
    if (going || text.length < 5) return;
    setGoing(true);
    // Re-enabled in case the visitor comes back to this page.
    setTimeout(() => setGoing(false), 4000);
    const target = `/new?idea=${encodeURIComponent(text)}`;
    // New visitors make an account first, then land on the plan for their idea.
    router.push(authed ? target : `/signup?next=${encodeURIComponent(target)}`);
  }

  function fillExample(prompt: string) {
    setIdea(prompt);
    box.current?.focus();
  }

  return (
    <section className="relative pt-28 pb-20 bg-surface-950 overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 -translate-x-1/2 top-[-120px] h-[500px] w-[900px] rounded-full bg-blue-900/60 blur-[100px]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-6">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-surface-900 px-4 py-1.5 text-xs text-surface-300 font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
            {t("badge")}
          </div>

          <h1 className="mt-6 text-5xl sm:text-6xl md:text-7xl font-bold leading-[1.05] tracking-tight text-surface-50">
            {t.rich("headline", { accent: (c) => <span className="bg-gradient-to-r from-[var(--nk-brand-primary,rgb(var(--c-blue-400)))] to-cyan-500 bg-clip-text text-transparent">{c}</span> })}
          </h1>

          <p className="mt-6 max-w-2xl mx-auto text-lg md:text-xl text-surface-400 leading-relaxed">
            {t("intro")}
          </p>

          {aiReady ? (
            <form onSubmit={start} className="mt-9 mx-auto max-w-2xl text-start">
              <div className="rounded-2xl border border-white/10 bg-surface-900 p-2 shadow-xl shadow-black/5 transition focus-within:border-surface-600">
                <label htmlFor="landing-idea" className="block px-3 pt-2 text-sm font-semibold text-surface-50">
                  {t("ideaLabel")}
                </label>
                <textarea
                  id="landing-idea"
                  ref={box}
                  rows={3}
                  maxLength={IDEA_MAX_CHARS}
                  value={idea}
                  onChange={(e) => setIdea(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) start(); }}
                  placeholder={t("ideaPlaceholder")}
                  className="w-full resize-none bg-transparent px-3 py-2 text-base text-surface-50 placeholder:text-surface-500 focus:outline-none"
                />
                <div className="flex flex-wrap items-center justify-between gap-3 px-2 pb-1">
                  <span className="text-xs text-surface-500" aria-live="polite">
                    {idea.length > IDEA_MAX_CHARS - 100 ? t("charsLeft", { count: IDEA_MAX_CHARS - idea.length }) : t("ideaHint")}
                  </span>
                  <button
                    type="submit"
                    disabled={!ready}
                    className="inline-flex items-center gap-2 rounded-xl bg-surface-50 hover:bg-surface-100 text-surface-900 px-6 py-3 text-sm font-semibold transition shadow-lg shadow-black/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {going ? t("opening") : t("planMyApp")}
                    <span aria-hidden className="text-surface-600 rtl:-scale-x-100">&rarr;</span>
                  </button>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <span className="text-xs text-surface-400">{t("tryOne")}</span>
                {IDEAS.map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => fillExample(t(`ideas.${id}.prompt`))}
                    className="rounded-full border border-white/10 bg-surface-900/70 px-3.5 py-1.5 text-xs font-medium text-surface-300 transition hover:border-surface-700 hover:text-surface-50"
                  >
                    {t(`ideas.${id}.label`)}
                  </button>
                ))}
              </div>
              <p className="mt-5 text-center text-sm text-surface-400">
                {t("checkPlan")}{" "}
                {authed ? (
                  <Link href="/dashboard" className="font-medium text-surface-200 underline-offset-4 hover:underline">{t("openYourDashboard")}</Link>
                ) : (
                  <a href="#features" className="font-medium text-surface-200 underline-offset-4 hover:underline">{t("seeHow")}</a>
                )}
              </p>
            </form>
          ) : (
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href={authed ? "/dashboard" : "/signup"}
                className="inline-flex items-center gap-2 rounded-xl bg-surface-50 hover:bg-surface-100 text-surface-900 px-7 py-3.5 text-sm font-semibold transition shadow-lg shadow-black/20"
              >
                {authed ? t("openDashboard") : t("startFree")}
                <span aria-hidden className="text-surface-600 rtl:-scale-x-100">&rarr;</span>
              </Link>
              <a
                href="#features"
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-surface-900 hover:bg-surface-950 text-surface-200 px-7 py-3.5 text-sm font-semibold transition"
              >
                {t("seeHow")}
              </a>
            </div>
          )}
        </div>

        {/* Stats strip — social proof without a dark screenshot */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
          {[
            { value: String(moduleCount), label: t("stats.features") },
            { value: "31k+", label: t("stats.icons") },
            { value: "6", label: t("stats.ways") },
            { value: t("stats.platformsValue"), label: t("stats.platforms") },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-[var(--nk-brand-primary,rgb(var(--c-blue-400)))] to-cyan-500 bg-clip-text text-transparent">
                {s.value}
              </div>
              <div className="mt-1 text-sm text-surface-400">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs text-surface-500 uppercase tracking-widest font-medium">
          <span>{t("noCard")}</span>
          <span className="hidden sm:inline text-surface-700">&middot;</span>
          <span>{t("freeForever")}</span>
          <span className="hidden sm:inline text-surface-700">&middot;</span>
          <span>{t("ownData")}</span>
        </div>
      </div>
    </section>
  );
}
