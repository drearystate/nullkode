"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { AlertTriangle, ArrowUpRight, Check, Circle, CircleDot, Download, Gamepad2, History, Loader2, Maximize2, MessageSquareReply, Monitor, Pause, Play, Rocket, RotateCcw, Send, Shapes, Smartphone, Square, StepForward, X } from "lucide-react";
import { addImageFiles, imagesFromPaste, ReferencePicker, referenceDropProps, type PickedImage } from "@/components/ai/reference-picker";
import { GameCanvas, type CanvasStatus, type GameCanvasHandle } from "./game-canvas";
import { ASSET_DRAG_TYPE, AssetsPanel, type PanelAsset } from "./assets-panel";

type Game = { id: string; name: string; engine: "phaser-2d" | "three-3d"; status: string; projectId: string | null; published: boolean; seq: number; plan: Plan | null };
type Visual = { camera?: string; palette?: Array<{ hex: string; role: string }>; shapes?: string; materials?: string; lighting?: string; density?: string; ui?: string; motion?: string; assets?: string };
type Plan = { title?: string; brief?: Record<string, string>; assets?: Array<{ key: string; id: string; use: string }>; message?: string; visual?: Visual | null };
type NoteState = { status: string; step: number | null; label: string | null; planned: string | null };
type Message = { seq: number; kind: "user" | "assistant" | "error"; text: string; versionSeq: number | null; createdAt: string; note?: NoteState };
type Version = { seq: number; label: string; note: string | null; kind: string; ok: boolean | null; hasShot: boolean; createdAt: string };
type Step = { id: string; label: string; status: "todo" | "running" | "done" | "error"; seq?: number; note?: string; added?: boolean; kind?: string };
type Job = { id: string; steps: Step[]; phase: string | null; stopAfterStep?: boolean };

const BRIEF_KEYS = ["pitch", "genre", "coreLoop", "controls", "levels", "winLose", "artStyle", "audio"] as const;
const VISUAL_KEYS = ["camera", "shapes", "materials", "lighting", "density", "ui", "motion", "assets"] as const;

function viewerZone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return undefined;
  }
}

export function GameWorkspace({ id }: { id: string }) {
  const router = useRouter();
  const t = useTranslations("games");
  const ta = useTranslations("ai");
  const format = useFormatter();
  const [game, setGame] = useState<Game | null>(null);
  const [pass, setPass] = useState("");
  const [chat, setChat] = useState<Message[]>([]);
  const [versions, setVersions] = useState<Version[]>([]);
  const [used, setUsed] = useState<PanelAsset[]>([]);
  const [job, setJob] = useState<Job | null>(null);
  const [appUrl, setAppUrl] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [chips, setChips] = useState<Array<{ id: string; name: string }>>([]);
  const [images, setImages] = useState<PickedImage[]>([]);
  const [imageError, setImageError] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<{ text: string; href?: string } | null>(null);
  const [dropping, setDropping] = useState(false);
  const [side, setSide] = useState<"assets" | "versions" | null>(null);
  const [mobileView, setMobileView] = useState<"chat" | "game" | "assets">("chat");
  const [frame, setFrame] = useState<"desktop" | "phone">("desktop");
  const [viewSeq, setViewSeq] = useState<number | null>(null);
  const [status, setStatus] = useState<CanvasStatus | null>(null);
  const [paused, setPaused] = useState(false);
  const [busy, setBusy] = useState<"publish" | "export" | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [sending, setSending] = useState(false);
  const [stopping, setStopping] = useState(false);
  const canvas = useRef<GameCanvasHandle>(null);
  const chatEnd = useRef<HTMLDivElement>(null);
  const running = Boolean(job);

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/games/${id}`);
    if (res.status === 404) return router.replace("/games");
    const d = await res.json().catch(() => null);
    if (!d?.game) return;
    setGame(d.game);
    if (typeof d.playPass === "string") setPass((old) => old || d.playPass);
    setChat(d.chat ?? []);
    setVersions(d.versions ?? []);
    setUsed(d.assets ?? []);
    setAppUrl(d.appUrl ?? null);
    setJob(d.job ? { id: d.job.id, steps: Array.isArray(d.job.steps) ? d.job.steps : [], phase: d.job.phase, stopAfterStep: Boolean(d.job.stopAfterStep) } : null);
  }, [id, router]);

  useEffect(() => {
    void refresh();
    const es = new EventSource(`/api/games/${id}/events`);
    es.onmessage = (e) => {
      const ev = JSON.parse(e.data);
      if (ev.type === "steps") setJob((j) => ({ id: ev.jobId, steps: ev.steps ?? [], phase: ev.phase ?? j?.phase ?? null, stopAfterStep: j && j.id === ev.jobId ? j.stopAfterStep : false }));
      else if (ev.type === "version") {
        setGame((g) => (g ? { ...g, seq: Math.max(g.seq, ev.seq) } : g));
        void refresh();
      } else if (ev.type === "job") {
        if (ev.status !== "running") {
          setJob(null);
          setStopping(false);
        } else if (typeof ev.stopAfterStep === "boolean") setJob((j) => (j ? { ...j, stopAfterStep: ev.stopAfterStep } : j));
        void refresh();
      } else if (ev.type === "chat" || ev.type === "game") void refresh();
    };
    return () => es.close();
  }, [id, refresh]);

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ block: "end" });
  }, [chat.length, job?.steps.length]);

  const latestLabel = useMemo(() => versions[0]?.label ?? "", [versions]);

  // While a build runs, a message is a note on it (steer while building); otherwise it starts a change.
  const starting = job?.id === "pending";

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    if (starting || sending) return;
    const text = [prompt.trim(), ...chips.map((c) => t("chat.useAssetLine", { name: c.name, id: c.id }))].filter(Boolean).join("\n");
    if (!text && images.length === 0) return;
    setError("");
    setImageError(null);
    const sentImages = images.filter((img) => img.dataUrl).map((img) => ({ data: img.dataUrl!, mediaType: img.mediaType, name: img.name }));
    const body = JSON.stringify({ prompt: text, text, ...(sentImages.length ? { images: sentImages } : {}) });
    const clear = () => {
      setPrompt("");
      setChips([]);
      setImages([]);
    };
    const failed = (data: { error?: string; code?: string }, fallback: string) => {
      if (typeof data.code === "string" && /image|references/.test(data.code) && images.length) setImageError(data.error || fallback);
      else setError(data.error || fallback);
    };
    if (running) {
      setSending(true);
      const res = await fetch(`/api/games/${id}/notes`, { method: "POST", headers: { "content-type": "application/json" }, body }).catch(() => null);
      const data = (await res?.json().catch(() => ({}))) ?? {};
      setSending(false);
      if (res?.ok) {
        clear();
        void refresh();
        return;
      }
      // The build ended a moment ago: send it as a change instead.
      if (res?.status !== 409 || data.code !== "not_running") return failed(data, t("chat.noteFailed"));
    }
    setJob({ id: "pending", steps: [], phase: "plan" });
    const res = await fetch(`/api/games/${id}/build`, { method: "POST", headers: { "content-type": "application/json" }, body }).catch(() => null);
    const data = (await res?.json().catch(() => ({}))) ?? {};
    if (!res || !res.ok) {
      setJob(null);
      return failed(data, t("chat.startFailed"));
    }
    clear();
    setViewSeq(null);
    void refresh();
  }

  async function stop() {
    setStopping(true);
    await fetch(`/api/games/${id}/build`, { method: "DELETE" }).catch(() => null);
  }

  async function stopAfterStep(on: boolean) {
    setJob((j) => (j ? { ...j, stopAfterStep: on } : j));
    await fetch(`/api/games/${id}/build`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ stopAfterStep: on }) }).catch(() => null);
  }

  async function addImages(files: File[]) {
    if (files.length === 0) return;
    const result = await addImageFiles(files, images, ta);
    setImageError(result.error);
    if (result.images.length !== images.length) setImages(result.images);
  }

  function addAssetChip(a: { id: string; name: string }) {
    setChips((c) => (c.some((x) => x.id === a.id) ? c : [...c, { id: a.id, name: a.name }].slice(-6)));
    setMobileView("chat");
  }

  async function restore(v: Version) {
    if (!window.confirm(t("versions.confirmRestore", { label: v.label }))) return;
    const res = await fetch(`/api/games/${id}/versions/${v.seq}/restore`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setError(data.error || t("versions.restoreFailed"));
    setViewSeq(null);
    void refresh();
  }

  async function publish() {
    setBusy("publish");
    setNotice(null);
    const res = await fetch(`/api/games/${id}/publish`, { method: "POST" }).catch(() => null);
    const data = (await res?.json().catch(() => ({}))) ?? {};
    setBusy(null);
    if (!res?.ok) return setError(data.error || t("publish.failed"));
    setAppUrl(data.url);
    setNotice({ text: t("publish.done"), href: data.url });
    void refresh();
  }

  async function exportZip() {
    setBusy("export");
    const r = await fetch(`/api/games/${id}/export?check=1`).then((x) => x.json()).catch(() => null);
    setBusy(null);
    const excluded: Array<{ id: string; name: string }> = Array.isArray(r?.excluded) ? r.excluded : [];
    if (excluded.length && !window.confirm(t("export.confirmExcluded", { count: excluded.length, names: excluded.slice(0, 5).map((x) => x.name).join(", ") }))) return;
    window.location.href = `/api/games/${id}/export`;
  }

  const onStatus = useCallback((s: CanvasStatus) => setStatus(s), []);
  const localZone = viewerZone();

  if (!game) return <div className="grid min-h-[60vh] place-items-center text-surface-400"><Loader2 className="animate-spin" /></div>;

  const plan = game.plan;
  const steps = job?.steps ?? [];
  const doneCount = steps.filter((s) => s.status === "done").length;
  const errors = status?.errors ?? [];
  const stepShown = status?.shownSeq !== undefined && status.shownSeq >= 0 ? versions.find((v) => v.seq === status.shownSeq)?.label ?? null : null;

  const fileDrop = referenceDropProps((files) => void addImages(files), setDropping);
  const assetsPanel = <AssetsPanel used={used} defaultDim={game.engine === "three-3d" ? "3d" : "2d"} onUse={addAssetChip} onClose={side ? () => setSide(null) : undefined} />;

  return (
    <div className="flex h-[calc(100dvh-68px)] flex-col lg:flex-row">
      {/* Phone: one area at a time. */}
      <div className="flex border-b border-white/10 lg:hidden" role="tablist">
        {(["chat", "game", "assets"] as const).map((v) => (
          <button key={v} role="tab" aria-selected={mobileView === v} data-help={t(`tabs.${v}Help`)} className={`flex-1 py-2.5 text-sm ${mobileView === v ? "border-b-2 border-brand-500 text-white" : "text-surface-400"}`} onClick={() => setMobileView(v)}>{t(`tabs.${v}`)}</button>
        ))}
      </div>

      {/* Conversation */}
      <section className={`${mobileView === "chat" ? "flex" : "hidden"} min-h-0 w-full flex-col border-white/10 lg:flex lg:w-[400px] lg:shrink-0 lg:border-e`} aria-label={t("chat.title")} data-help={t("chat.help")}>
        <div className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate font-medium" dir="auto">{game.name}</p>
            <p className="text-xs text-surface-400">{t(game.engine === "three-3d" ? "engine.three" : "engine.phaser")} · {t("chat.versionCount", { count: Math.max(0, versions.length - 1) })}</p>
          </div>
          {game.projectId && <Link href={`/projects/${game.projectId}`} className="btn-ghost shrink-0 px-3 py-1.5 text-xs" data-help={t("chat.openAppHelp")}>{t("chat.openApp")}</Link>}
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
          {plan?.brief && (
            <details open={versions.length <= 2} className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm [[data-theme=light]_&]:bg-surface-900" data-help={t("plan.help")} data-testid="plan-card">
              <summary className="flex cursor-pointer items-center gap-2 font-medium"><Gamepad2 size={15} className="text-brand-300" />{t("plan.title")}</summary>
              <dl className="mt-2 space-y-1.5">
                {BRIEF_KEYS.filter((k) => plan.brief?.[k]).map((k) => (
                  <div key={k}><dt className="text-xs text-surface-400">{t(`plan.${k}`)}</dt><dd className="text-surface-200" dir="auto">{plan.brief![k]}</dd></div>
                ))}
              </dl>
              {plan.visual && (
                <div className="mt-3 border-t border-white/10 pt-2" data-testid="visual-spec" data-help={t("plan.visual.help")}>
                  <p className="text-xs font-medium text-surface-300">{t("plan.visual.title")}</p>
                  {(plan.visual.palette?.length ?? 0) > 0 && (
                    <ul className="mt-1.5 flex flex-wrap gap-1" aria-label={t("plan.visual.palette")}>
                      {plan.visual.palette!.map((c) => (
                        <li key={c.hex + c.role} className="flex items-center gap-1 rounded-full border border-white/10 py-0.5 pe-2 ps-0.5 text-[10px] text-surface-300" title={c.hex}>
                          <span className="h-3.5 w-3.5 rounded-full border border-black/20" style={{ background: c.hex }} aria-hidden />
                          <span dir="auto">{c.role || c.hex}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <dl className="mt-1.5 space-y-1">
                    {VISUAL_KEYS.filter((k) => plan.visual?.[k]).map((k) => (
                      <div key={k} className="text-xs"><dt className="inline text-surface-400">{t(`plan.visual.${k}`)}: </dt><dd className="inline text-surface-200" dir="auto">{plan.visual![k]}</dd></div>
                    ))}
                  </dl>
                </div>
              )}
            </details>
          )}
          {chat.length === 0 && !running && <p className="text-sm text-surface-400">{t("chat.empty")}</p>}
          {chat.map((m) => (
            <div key={m.seq} className={m.kind === "user" ? "ms-8 rounded-2xl rounded-ee-md bg-brand-600/25 px-3.5 py-2.5 text-sm" : m.kind === "error" ? "flex gap-2 rounded-xl border border-red-400/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-200" : "me-6 text-sm text-surface-200"}>
              {m.kind === "error" && <AlertTriangle size={15} className="mt-0.5 shrink-0" />}
              <p className="whitespace-pre-wrap" dir="auto">{m.text}</p>
              {m.note && <NoteBadge note={m.note} />}
              {m.versionSeq !== null && m.kind !== "user" && <button type="button" className="mt-1 text-xs text-brand-300 hover:underline" data-help={t("chat.seeVersionHelp")} onClick={() => { setViewSeq(m.versionSeq === game.seq ? null : m.versionSeq); setMobileView("game"); }}>{t("chat.seeVersion")}</button>}
            </div>
          ))}
          {running && (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm [[data-theme=light]_&]:bg-surface-900" data-testid="step-list" data-help={t("steps.help")}>
              <p className="flex items-center gap-2 font-medium"><Loader2 size={15} className="animate-spin text-brand-300" />{steps.length ? t("steps.progress", { done: doneCount, total: steps.length }) : t("steps.planning")}</p>
              {!starting && (
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs" data-testid="stop-controls">
                  {job?.stopAfterStep ? (
                    <>
                      <span className="flex items-center gap-1 rounded-full bg-amber-400/15 px-2 py-1 text-amber-100" role="status"><StepForward size={12} className="rtl:-scale-x-100" />{t("steps.stoppingAfter")}</span>
                      <button type="button" className="rounded-md px-2 py-1 text-brand-300 hover:bg-white/5" data-help={t("steps.keepGoingHelp")} onClick={() => void stopAfterStep(false)}>{t("steps.keepGoing")}</button>
                    </>
                  ) : (
                    <button type="button" className="flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-surface-200 hover:bg-white/5" data-help={t("steps.stopAfterHelp")} onClick={() => void stopAfterStep(true)} disabled={stopping}><StepForward size={12} className="rtl:-scale-x-100" />{t("steps.stopAfter")}</button>
                  )}
                  <button type="button" className="flex items-center gap-1 rounded-md border border-red-400/30 px-2 py-1 text-red-200 hover:bg-red-500/10" data-help={t("steps.stopNowHelp")} onClick={() => void stop()} disabled={stopping}>{stopping ? <Loader2 size={12} className="animate-spin" /> : <Square size={12} />}{t("steps.stopNow")}</button>
                </div>
              )}
              {steps.length > 0 && (
                <ol className="mt-2 space-y-1.5">
                  {steps.map((s) => (
                    <li key={s.id} className="flex items-start gap-2 text-xs" data-status={s.status}>
                      <span className="mt-0.5">{s.status === "running" ? <Loader2 size={12} className="animate-spin text-brand-300" /> : s.status === "done" ? <Check size={12} className="text-emerald-400" /> : s.status === "error" ? <X size={12} className="text-red-400" /> : <Circle size={12} className="text-surface-500" />}</span>
                      <span className={s.status === "todo" ? "text-surface-500" : "text-surface-200"} dir="auto">{s.label}{s.added && <span className="ms-1.5 rounded bg-brand-500/15 px-1 py-px text-[10px] text-brand-200" data-testid="step-added">{t("steps.added")}</span>}{s.kind === "playtest-fix" && <span className="ms-1.5 rounded bg-amber-400/15 px-1 py-px text-[10px] text-amber-100" data-testid="step-playtest" data-help={t("steps.playtestHelp")}>{t("steps.playtestTag")}</span>}{s.note && s.status === "done" ? <span className="block text-surface-400">{s.note}</span> : null}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}
          <div ref={chatEnd} />
        </div>

        <form
          onSubmit={send}
          className={`border-t border-white/10 p-3 ${dropping ? "outline-dashed outline-2 -outline-offset-4 outline-brand-400/70" : ""}`}
          onDragOver={(e) => {
            if (e.dataTransfer.types.includes(ASSET_DRAG_TYPE)) {
              e.preventDefault();
              e.dataTransfer.dropEffect = "copy";
              setDropping(true);
              return;
            }
            fileDrop.onDragOver(e);
          }}
          onDragLeave={fileDrop.onDragLeave}
          onDrop={(e) => {
            const raw = e.dataTransfer.getData(ASSET_DRAG_TYPE);
            if (raw) {
              e.preventDefault();
              setDropping(false);
              try {
                addAssetChip(JSON.parse(raw));
              } catch {
                /* not an asset */
              }
              return;
            }
            fileDrop.onDrop(e);
          }}
        >
          {chips.length > 0 && (
            <ul className="mb-2 flex flex-wrap gap-1.5" aria-label={t("chat.assetChips")}>
              {chips.map((c) => (
                <li key={c.id} className="flex max-w-full items-center gap-1 rounded-full bg-brand-500/15 px-2.5 py-1 text-xs text-brand-100">
                  <Shapes size={12} />
                  <span className="truncate" dir="auto" title={c.id}>{c.name}</span>
                  <button type="button" aria-label={t("chat.removeAsset", { name: c.name })} data-help={t("chat.removeAssetHelp")} onClick={() => setChips(chips.filter((x) => x.id !== c.id))}><X size={12} /></button>
                </li>
              ))}
            </ul>
          )}
          {error && <p role="alert" className="mb-2 text-xs text-red-300">{error}</p>}
          {(images.length > 0 || imageError) && (
            <div className="mb-2">
              <ReferencePicker images={images} onChange={setImages} compact id="game-references" error={imageError} onError={setImageError} />
            </div>
          )}
          <div className="flex items-end gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-2 focus-within:border-brand-500/60 [[data-theme=light]_&]:bg-surface-900">
            <label htmlFor="game-prompt" className="sr-only">{running ? t("chat.steerLabel") : t("chat.askLabel")}</label>
            <textarea
              id="game-prompt"
              data-help={running ? t("chat.steerHelp") : t("chat.askHelp")}
              rows={2}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
              onPaste={(e) => {
                const files = imagesFromPaste(e);
                if (files.length) { e.preventDefault(); void addImages(files); }
              }}
              placeholder={running ? t("chat.steerPlaceholder") : versions.length > 1 ? t("chat.askPlaceholder") : t("chat.describePlaceholder")}
              className="min-h-[44px] flex-1 resize-none bg-transparent p-1 text-sm outline-none placeholder:text-surface-500"
              dir="auto"
            />
            {images.length === 0 && <ReferencePicker images={images} onChange={setImages} compact id="game-references-add" error={null} onError={setImageError} />}
            <button className="btn-primary shrink-0 p-2" aria-label={running ? t("chat.sendNote") : t("chat.send")} data-help={running ? t("chat.sendNoteHelp") : t("chat.sendHelp")} data-testid="send-message" disabled={starting || sending || (!prompt.trim() && chips.length === 0 && images.length === 0)}>{sending ? <Loader2 size={16} className="animate-spin" /> : running ? <MessageSquareReply size={16} className="rtl:-scale-x-100" /> : <Send size={16} className="rtl:-scale-x-100" />}</button>
          </div>
        </form>
      </section>

      {/* Canvas */}
      <section className={`${mobileView === "game" ? "flex" : "hidden"} min-h-0 min-w-0 flex-1 flex-col lg:flex`} aria-label={t("canvas.title")}>
        <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-3 py-2">
          <div className="flex min-w-0 items-center gap-2 text-sm" data-help={t("canvas.stepHelp")}>
            <span className={`h-2 w-2 shrink-0 rounded-full ${status?.ready ? (errors.length ? "bg-amber-400" : "bg-emerald-400") : "bg-surface-500"}`} aria-hidden />
            <span className="truncate text-surface-200" dir="auto" data-testid="canvas-step">{viewSeq !== null ? t("canvas.viewing", { label: versions.find((v) => v.seq === viewSeq)?.label ?? "" }) : stepShown ?? latestLabel ?? ""}</span>
            {status?.fps != null && status.fps > 0 && status.ready && <span className="shrink-0 rounded bg-white/5 px-1.5 py-0.5 text-xs tabular-nums text-surface-400" data-help={t("canvas.fpsHelp")}>{t("canvas.fps", { fps: status.fps })}</span>}
            {errors.length > 0 && <button type="button" className="flex shrink-0 items-center gap-1 rounded bg-amber-400/15 px-1.5 py-0.5 text-xs text-amber-100" data-help={t("canvas.errorsHelp")} onClick={() => setShowErrors(!showErrors)}><AlertTriangle size={12} />{t("canvas.errors", { count: errors.length })}</button>}
          </div>
          <div className="flex items-center gap-1">
            <button type="button" className="rounded-md p-1.5 text-surface-300 hover:bg-white/5 hover:text-white" aria-label={paused ? t("canvas.resume") : t("canvas.pause")} data-help={t("canvas.pauseHelp")} onClick={() => { canvas.current?.command(paused ? "resume" : "pause"); setPaused(!paused); }}>{paused ? <Play size={16} className="rtl:-scale-x-100" /> : <Pause size={16} />}</button>
            <button type="button" className="rounded-md p-1.5 text-surface-300 hover:bg-white/5 hover:text-white" aria-label={t("canvas.restart")} data-help={t("canvas.restartHelp")} onClick={() => { canvas.current?.command("start"); setPaused(false); }}><RotateCcw size={16} /></button>
            <div className="mx-1 flex rounded-lg border border-white/10 p-0.5" role="group" aria-label={t("canvas.frame")} data-help={t("canvas.frameHelp")}>
              {([["desktop", Monitor], ["phone", Smartphone]] as const).map(([v, Icon]) => (
                <button key={v} type="button" aria-label={t(`canvas.${v}`)} aria-pressed={frame === v} onClick={() => setFrame(v)} className={`rounded-md p-1.5 ${frame === v ? "bg-white/10 text-white" : "text-surface-400 hover:text-white"}`}><Icon size={15} /></button>
              ))}
            </div>
            <button type="button" className="rounded-md p-1.5 text-surface-300 hover:bg-white/5 hover:text-white" aria-label={t("canvas.fullscreen")} data-help={t("canvas.fullscreenHelp")} onClick={() => canvas.current?.fullscreen()}><Maximize2 size={16} /></button>
            {pass && <a href={`/api/games/${id}/play/${pass}/index.html`} target="_blank" rel="noopener" className="rounded-md p-1.5 text-surface-300 hover:bg-white/5 hover:text-white" aria-label={t("canvas.openNewTab")} data-help={t("canvas.openNewTabHelp")}><ArrowUpRight size={16} className="rtl:-scale-x-100" /></a>}
          </div>
          <div className="ms-auto flex flex-wrap items-center gap-1">
            <button type="button" aria-pressed={side === "assets"} data-help={t("toolbar.assetsHelp")} onClick={() => setSide(side === "assets" ? null : "assets")} className="hidden items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-surface-300 hover:bg-white/5 hover:text-white lg:flex"><Shapes size={15} />{t("toolbar.assets")}</button>
            <button type="button" aria-pressed={side === "versions"} data-help={t("toolbar.versionsHelp")} onClick={() => setSide(side === "versions" ? null : "versions")} className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-surface-300 hover:bg-white/5 hover:text-white"><History size={15} /><span className="hidden sm:inline">{t("toolbar.versions")}</span></button>
            {game.seq > 0 && <button type="button" data-help={t("toolbar.exportHelp")} disabled={busy !== null} onClick={exportZip} className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-surface-300 hover:bg-white/5 hover:text-white"><Download size={15} /><span className="hidden sm:inline">{t("toolbar.export")}</span></button>}
            {game.seq > 0 && <button type="button" data-help={t("toolbar.publishHelp")} disabled={busy !== null || running} onClick={publish} className="btn-primary flex items-center gap-1.5 px-3 py-1.5 text-sm" data-testid="publish-game">{busy === "publish" ? <Loader2 size={15} className="animate-spin" /> : <Rocket size={15} />}{game.published ? t("toolbar.republish") : t("toolbar.publish")}</button>}
          </div>
        </div>

        {(notice || (appUrl && game.published)) && (
          <div className="flex flex-wrap items-center gap-3 border-b border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm text-emerald-100" role="status">
            <span>{notice?.text ?? t("publish.live")}</span>
            {appUrl && <a href={appUrl} target="_blank" rel="noopener" className="font-medium underline" dir="ltr" data-help={t("publish.openHelp")}>{appUrl.replace(/^https?:\/\//, "")}</a>}
            {notice && <button type="button" className="ms-auto" aria-label={t("publish.dismiss")} onClick={() => setNotice(null)}><X size={14} /></button>}
          </div>
        )}
        {viewSeq !== null && (
          <div className="flex flex-wrap items-center gap-3 border-b border-amber-400/20 bg-amber-400/10 px-4 py-2 text-sm text-amber-100">
            <span>{t("versions.earlier")}</span>
            <button type="button" className="font-medium underline" data-help={t("versions.restoreItHelp")} onClick={() => { const v = versions.find((x) => x.seq === viewSeq); if (v) void restore(v); }}>{t("versions.restoreIt")}</button>
            <button type="button" className="underline" data-help={t("versions.backHelp")} onClick={() => setViewSeq(null)}>{t("versions.back")}</button>
          </div>
        )}

        <div className="relative flex min-h-0 flex-1">
          <div className="flex min-h-0 flex-1 p-3">
            <GameCanvas key={game.engine} ref={canvas} gameId={id} pass={pass} seq={game.seq} label={latestLabel} viewSeq={viewSeq} frame={frame} onStatus={onStatus} />
          </div>
          {showErrors && errors.length > 0 && (
            <div className="absolute inset-x-3 bottom-3 z-20 max-h-48 overflow-y-auto rounded-xl border border-amber-400/30 bg-surface-900 p-3 text-xs shadow-2xl" role="log" data-help={t("canvas.errorListHelp")}>
              <div className="mb-1 flex items-center justify-between"><p className="font-medium text-amber-100">{t("canvas.errorList")}</p><button type="button" aria-label={t("canvas.closeErrors")} onClick={() => setShowErrors(false)}><X size={14} /></button></div>
              <ul className="space-y-1 font-mono text-surface-300" dir="ltr">{errors.map((er, i) => <li key={i}>{er}</li>)}</ul>
              <button type="button" className="mt-2 text-brand-300 hover:underline" data-help={t("canvas.askFixHelp")} onClick={() => { setPrompt(t("canvas.fixPrompt", { errors: errors.slice(-3).join("\n") })); setShowErrors(false); setMobileView("chat"); }}>{t("canvas.askFix")}</button>
            </div>
          )}
          {side && (
            <aside className="absolute inset-y-0 end-0 z-10 hidden w-80 max-w-full flex-col border-s border-white/10 bg-surface-900 shadow-2xl lg:flex" aria-label={side === "assets" ? t("assets.title") : t("versions.title")}>
              {side === "assets" ? assetsPanel : (
                <VersionsList versions={versions} current={game.seq} viewSeq={viewSeq} gameId={id} onView={(s) => setViewSeq(s === game.seq ? null : s)} onRestore={restore} onClose={() => setSide(null)} format={(d) => format.dateTime(new Date(d), { dateStyle: "medium", timeStyle: "short", timeZone: localZone })} />
              )}
            </aside>
          )}
          {/* Versions on phones open over the canvas. */}
          {side === "versions" && (
            <aside className="absolute inset-0 z-10 flex flex-col bg-surface-900 lg:hidden" aria-label={t("versions.title")}>
              <VersionsList versions={versions} current={game.seq} viewSeq={viewSeq} gameId={id} onView={(s) => { setViewSeq(s === game.seq ? null : s); setSide(null); }} onRestore={restore} onClose={() => setSide(null)} format={(d) => format.dateTime(new Date(d), { dateStyle: "medium", timeStyle: "short", timeZone: localZone })} />
            </aside>
          )}
        </div>
      </section>

      {/* Phone: the asset library as its own tab. */}
      <section className={`${mobileView === "assets" ? "flex" : "hidden"} min-h-0 w-full flex-1 flex-col lg:hidden`} aria-label={t("assets.title")}>
        {assetsPanel}
      </section>
    </div>
  );
}

function NoteBadge({ note }: { note: NoteState }) {
  const t = useTranslations("games");
  const text =
    note.status === "applied" && note.step
      ? t("chat.note.applied", { step: note.step, label: note.label ?? "" })
      : note.status === "accepted"
        ? note.planned
          ? t("chat.note.planned", { step: note.planned })
          : t("chat.note.accepted")
        : note.status === "question"
          ? t("chat.note.question")
          : note.status === "refused"
            ? t("chat.note.refused")
            : note.status === "dropped"
              ? t("chat.note.dropped")
              : t("chat.note.checking");
  const tone = note.status === "applied" ? "text-emerald-300" : note.status === "refused" || note.status === "dropped" ? "text-surface-400" : "text-brand-200";
  return (
    <p className={`mt-1 flex items-center gap-1 text-xs ${tone}`} data-testid="note-status" data-status={note.status} data-help={t("chat.note.help")}>
      {note.status === "applied" ? <Check size={12} /> : note.status === "new" || note.status === "checking" ? <Loader2 size={12} className="animate-spin" /> : <CircleDot size={12} />}
      <span dir="auto">{text}</span>
    </p>
  );
}

function VersionsList({ versions, current, viewSeq, gameId, onView, onRestore, onClose, format }: { versions: Version[]; current: number; viewSeq: number | null; gameId: string; onView: (seq: number) => void; onRestore: (v: Version) => void; onClose: () => void; format: (iso: string) => string }) {
  const t = useTranslations("games");
  return (
    <div className="flex h-full min-h-0 flex-col" data-help={t("versions.help")} data-testid="versions-panel">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
        <h2 className="font-semibold">{t("versions.title")}</h2>
        <button type="button" aria-label={t("versions.close")} data-help={t("versions.closeHelp")} className="rounded p-1 text-surface-400 hover:text-white" onClick={onClose}><X size={16} /></button>
      </div>
      {versions.length <= 1 ? (
        <p className="p-4 text-sm text-surface-400">{t("versions.none")}</p>
      ) : (
        <ol className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
          {versions.filter((v) => v.seq > 0).map((v) => (
            <li key={v.seq} className={`flex gap-3 rounded-lg border p-2 text-sm ${(viewSeq ?? current) === v.seq ? "border-brand-400" : "border-white/10"}`}>
              <div className="h-12 w-20 shrink-0 overflow-hidden rounded bg-black">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {v.hasShot && <img src={`/api/games/${gameId}/versions/${v.seq}/shot`} alt="" loading="lazy" className="h-full w-full object-cover" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-surface-200" dir="auto">{v.label}</p>
                <p className="mt-0.5 text-xs text-surface-500">{[format(v.createdAt), v.seq === current ? t("versions.current") : ""].filter(Boolean).join(" · ")}</p>
                <div className="mt-1 flex gap-3 text-xs">
                  <button type="button" className="text-brand-300 hover:underline" data-help={t("versions.viewHelp")} onClick={() => onView(v.seq)}>{t("versions.view")}</button>
                  {v.seq !== current && <button type="button" className="text-brand-300 hover:underline" data-help={t("versions.restoreHelp")} onClick={() => onRestore(v)}>{t("versions.restore")}</button>}
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
