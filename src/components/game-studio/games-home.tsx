"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Box, Gamepad2, MoreHorizontal, Pencil, Sparkles, Square, Trash2 } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { addImageFiles, imagesFromPaste, ReferencePicker, referenceDropProps, type PickedImage } from "@/components/ai/reference-picker";

type GameCard = { id: string; name: string; engine: "phaser-2d" | "three-3d"; status: string; published: boolean; seq: number; shotSeq: number | null; updatedAt: string };
type Question = { id: string; label: string; options?: string[] };
type EngineChoice = "phaser-2d" | "three-3d" | "auto";

const IDEAS = ["catFish", "spaceShooter", "dungeon", "runner", "kart", "puzzle"] as const;

function useAgo() {
  const t = useTranslations("games");
  const format = useFormatter();
  return (iso: string): string => {
    const d = new Date(iso);
    const s = (Date.now() - d.getTime()) / 1000;
    if (s < 60) return t("card.justNow");
    if (s < 86400) return format.relativeTime(d, { now: new Date(), unit: s < 3600 ? "minute" : "hour" });
    return format.dateTime(d, { dateStyle: "medium" });
  };
}

export function GamesHome({ available, aiReady }: { available: boolean; aiReady: boolean }) {
  const router = useRouter();
  const t = useTranslations("games");
  const ta = useTranslations("ai");
  const [games, setGames] = useState<GameCard[] | null>(null);
  const [prompt, setPrompt] = useState("");
  const [engine, setEngine] = useState<EngineChoice>("phaser-2d");
  const [images, setImages] = useState<PickedImage[]>([]);
  const [imageError, setImageError] = useState<string | null>(null);
  const [dropping, setDropping] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [questions, setQuestions] = useState<{ prompt: string; list: Question[]; answers: Record<string, string> } | null>(null);
  const box = useRef<HTMLTextAreaElement>(null);
  const ready = available && aiReady;

  const load = () => fetch("/api/games").then((r) => r.json()).then((d) => setGames(d.games ?? [])).catch(() => setGames([]));
  useEffect(() => {
    void load();
  }, []);
  // Cards of games still building refresh their picture now and then.
  useEffect(() => {
    if (!games?.some((g) => g.status === "building")) return;
    const timer = setInterval(() => void load(), 8000);
    return () => clearInterval(timer);
  }, [games]);

  async function create(text: string) {
    setBusy(true);
    setError("");
    setImageError(null);
    const sent = images.filter((i) => i.dataUrl).map((i) => ({ data: i.dataUrl!, mediaType: i.mediaType, name: i.name }));
    const res = await fetch("/api/games", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ prompt: text, engine, ...(sent.length ? { images: sent } : {}) }) }).catch(() => null);
    const data = (await res?.json().catch(() => ({}))) ?? {};
    if (!res?.ok || !data.game?.id) {
      setBusy(false);
      if (typeof data.code === "string" && /image|references/.test(data.code) && images.length) setImageError(data.error || t("home.startFailed"));
      else setError(data.error || t("home.startFailed"));
      return;
    }
    router.push(`/games/${data.game.id}`);
  }

  async function start(e?: React.FormEvent) {
    e?.preventDefault();
    const text = prompt.trim();
    if (!text || busy || !ready) return;
    setBusy(true);
    // Quick questions first when the idea leaves big choices open.
    const r = await fetch("/api/games/clarify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ prompt: text }) }).then((x) => x.json()).catch(() => null);
    const list: Question[] = Array.isArray(r?.questions) ? r.questions : [];
    if (list.length) {
      setBusy(false);
      setQuestions({ prompt: text, list, answers: {} });
      return;
    }
    await create(text);
  }

  function buildWithAnswers(skip: boolean) {
    if (!questions) return;
    const answers = skip ? "" : questions.list.map((q) => (questions.answers[q.id] ? `${q.label} ${questions.answers[q.id]}` : "")).filter(Boolean).join("\n");
    const text = answers ? `${questions.prompt}\n\n${answers}` : questions.prompt;
    setQuestions(null);
    void create(text);
  }

  async function addImages(files: File[]) {
    if (files.length === 0) return;
    const result = await addImageFiles(files, images, ta);
    setImageError(result.error);
    if (result.images.length !== images.length) setImages(result.images);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-8">
      <section className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-300">{t("home.eyebrow")}</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-5xl">{t("home.heading")}</h1>
        <p className="mx-auto mt-3 max-w-xl text-surface-400">{t("home.intro")}</p>
        {!available && <p role="status" className="mx-auto mt-4 max-w-xl rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-100">{t("home.notInstalled")}</p>}
        {available && !aiReady && <p role="status" className="mx-auto mt-4 max-w-xl rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-100">{t("home.aiNotReady")}</p>}
        <form onSubmit={start} data-help={t("home.formHelp")} {...referenceDropProps((files) => void addImages(files), setDropping)} className={`mx-auto mt-8 max-w-3xl rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-start shadow-2xl shadow-brand-900/20 focus-within:border-brand-500/60 [[data-theme=light]_&]:bg-surface-900 ${dropping ? "outline-dashed outline-2 outline-brand-400/70" : ""}`}>
          <label htmlFor="game-idea" className="sr-only">{t("home.promptLabel")}</label>
          <textarea
            id="game-idea"
            data-help={t("home.promptHelp")}
            ref={box}
            rows={3}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void start(); }}
            onPaste={(e) => {
              const files = imagesFromPaste(e);
              if (files.length) { e.preventDefault(); void addImages(files); }
            }}
            placeholder={t("home.promptPlaceholder")}
            dir="auto"
            disabled={busy}
            className="w-full resize-none bg-transparent p-2 text-base outline-none placeholder:text-surface-500"
          />
          {(images.length > 0 || imageError) && <div className="px-2 pb-2"><ReferencePicker images={images} onChange={setImages} compact id="game-home-references" error={imageError} onError={setImageError} /></div>}
          <div className="flex flex-wrap items-center justify-between gap-3 px-2 pb-1">
            <div className="flex items-center gap-2">
              <div className="flex rounded-lg border border-white/10 p-0.5 text-sm" role="radiogroup" aria-label={t("home.engineLabel")} data-help={t("home.engineHelp")}>
                {([["phaser-2d", Square, "engine.twoD"], ["three-3d", Box, "engine.threeD"], ["auto", Sparkles, "engine.auto"]] as const).map(([v, Icon, key]) => (
                  <button key={v} type="button" role="radio" aria-checked={engine === v} onClick={() => setEngine(v)} className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 ${engine === v ? "bg-white/10 text-white" : "text-surface-400 hover:text-white"}`} data-testid={`engine-${v}`}><Icon size={14} />{t(key)}</button>
                ))}
              </div>
              {images.length === 0 && <ReferencePicker images={images} onChange={setImages} compact id="game-home-references-add" error={null} onError={setImageError} />}
            </div>
            <button className="btn-primary" data-help={t("home.startHelp")} disabled={!prompt.trim() || busy || !ready} data-testid="start-game">{busy ? t("home.starting") : <>{t("home.start")} <ArrowRight size={16} className="rtl:-scale-x-100" /></>}</button>
          </div>
        </form>
        {error && <p role="alert" className="mx-auto mt-3 max-w-3xl text-sm text-red-400">{error}</p>}
        {questions && (
          <div className="mx-auto mt-4 max-w-3xl space-y-3 rounded-xl border border-brand-500/30 bg-brand-500/5 p-4 text-start text-sm" data-help={t("home.questionsHelp")}>
            <p className="font-medium">{t("home.questionsTitle")}</p>
            {questions.list.map((q) => (
              <div key={q.id}>
                <p className="text-surface-200" dir="auto">{q.label}</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {(q.options ?? []).map((o) => (
                    <button key={o} type="button" data-help={t("home.pickAnswerHelp")} onClick={() => setQuestions({ ...questions, answers: { ...questions.answers, [q.id]: o } })} className={`rounded-full border px-2.5 py-1 text-xs ${questions.answers[q.id] === o ? "border-brand-400 bg-brand-500/20 text-white" : "border-white/15 text-surface-300 hover:border-white/30"}`} dir="auto">{o}</button>
                  ))}
                </div>
                <input className="input mt-1.5 py-1.5 text-xs" placeholder={t("home.typeAnswer")} value={questions.answers[q.id] ?? ""} onChange={(e) => setQuestions({ ...questions, answers: { ...questions.answers, [q.id]: e.target.value } })} dir="auto" />
              </div>
            ))}
            <div className="flex gap-2">
              <button type="button" className="btn-primary px-3 py-1.5 text-sm" data-help={t("home.buildItHelp")} disabled={busy} onClick={() => buildWithAnswers(false)}>{t("home.buildIt")}</button>
              <button type="button" className="btn-ghost px-3 py-1.5 text-sm" data-help={t("home.skipHelp")} disabled={busy} onClick={() => buildWithAnswers(true)}>{t("home.skip")}</button>
            </div>
          </div>
        )}
        <div className="mx-auto mt-5 flex max-w-3xl flex-wrap justify-center gap-2">
          {IDEAS.map((i) => (
            <button key={i} type="button" data-help={t("home.ideaHelp")} className="rounded-full border border-white/10 px-3 py-1.5 text-sm text-surface-300 hover:border-brand-500/60 hover:text-white" onClick={() => { setPrompt(t(`home.ideas.${i}.prompt`)); if (i === "dungeon" || i === "kart") setEngine("three-3d"); else setEngine("phaser-2d"); box.current?.focus(); }}>{t(`home.ideas.${i}.title`)}</button>
          ))}
        </div>
      </section>

      <section className="mt-14" aria-labelledby="games-heading">
        <h2 id="games-heading" data-help={t("home.yourGamesHelp")} className="text-lg font-semibold">{t("home.yourGames")}</h2>
        {games === null ? (
          <p className="mt-4 text-sm text-surface-400">{t("home.loading")}</p>
        ) : games.length === 0 ? (
          <p className="mt-4 text-sm text-surface-400">{t("home.empty")}</p>
        ) : (
          <div className="mt-5 grid gap-6 sm:grid-cols-2 2xl:grid-cols-3">
            {games.map((g) => <Card key={g.id} game={g} onChanged={load} />)}
          </div>
        )}
      </section>
    </div>
  );
}

function Card({ game, onChanged }: { game: GameCard; onChanged: () => void }) {
  const t = useTranslations("games");
  const ago = useAgo();
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menu) return;
    const onDown = (e: PointerEvent) => { if (!menuRef.current?.contains(e.target as Node)) setMenu(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMenu(false); };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onDown); document.removeEventListener("keydown", onKey); };
  }, [menu]);
  async function act(kind: "rename" | "delete") {
    setMenu(false);
    if (kind === "rename") {
      const name = window.prompt(t("card.renamePrompt"), game.name);
      if (!name?.trim()) return;
      await fetch(`/api/games/${game.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ name }) });
    } else {
      if (!window.confirm(t(game.published ? "card.confirmDeletePublished" : "card.confirmDelete", { name: game.name }))) return;
      await fetch(`/api/games/${game.id}`, { method: "DELETE" });
    }
    onChanged();
  }
  return (
    <article className={`group relative rounded-2xl border ${menu ? "z-20" : ""} border-white/10 bg-white/[0.03] transition hover:border-brand-500/50 [[data-theme=light]_&]:bg-surface-900`} data-testid="game-card">
      <Link href={`/games/${game.id}`} className="block overflow-hidden rounded-t-2xl" aria-label={t("card.open", { name: game.name })} data-help={t("card.openHelp")}>
        <div className="relative aspect-video overflow-hidden bg-surface-900">
          {game.shotSeq !== null ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/api/games/${game.id}/versions/${game.shotSeq}/shot`} alt="" className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <div className="grid h-full place-items-center text-surface-500"><Gamepad2 size={30} /></div>
          )}
          <span className="absolute start-2 top-2 rounded bg-black/60 px-1.5 py-0.5 text-[11px] font-medium text-white">{t(game.engine === "three-3d" ? "engine.threeD" : "engine.twoD")}</span>
          {game.status === "building" && <span className="absolute end-2 top-2 rounded bg-brand-600/90 px-1.5 py-0.5 text-[11px] text-white">{t("card.building")}</span>}
        </div>
      </Link>
      <div className="flex items-start justify-between gap-2 px-5 py-4">
        <div className="min-w-0">
          <Link href={`/games/${game.id}`} className="block truncate text-base font-medium hover:underline" dir="auto">{game.name}</Link>
          <p className="mt-0.5 text-sm text-surface-400">{[game.published ? t("card.live") : "", ago(game.updatedAt)].filter(Boolean).join(" · ")}</p>
        </div>
        <div className="relative" ref={menuRef}>
          <button type="button" className="rounded-md p-1.5 text-surface-400 hover:bg-white/10 hover:text-white" aria-label={t("card.options")} data-help={t("card.optionsHelp")} aria-expanded={menu} onClick={() => setMenu(!menu)}><MoreHorizontal size={18} /></button>
          {menu && (
            <div role="menu" className="absolute end-0 top-full z-30 mt-1 w-44 overflow-hidden rounded-lg border border-white/10 bg-surface-900 py-1 text-sm shadow-xl shadow-black/30">
              <button type="button" role="menuitem" className="flex w-full items-center gap-2 px-3 py-2 hover:bg-white/5" data-help={t("card.renameHelp")} onClick={() => act("rename")}><Pencil size={14} />{t("card.rename")}</button>
              <button type="button" role="menuitem" className="flex w-full items-center gap-2 px-3 py-2 text-red-300 hover:bg-white/5" data-help={t("card.deleteHelp")} onClick={() => act("delete")}><Trash2 size={14} />{t("card.delete")}</button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
