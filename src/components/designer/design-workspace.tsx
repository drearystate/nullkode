"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { AlertTriangle, ArrowUpRight, Check, Download, History, Loader2, MessageSquarePlus, Monitor, Send, Smartphone, Square, Tablet, X } from "lucide-react";

type Design = { id: string; name: string; projectId: string | null; inBuilder: boolean; files: Array<{ path: string }> };
type Message = { seq: number; kind: "user" | "assistant" | "step" | "error"; text: string; versionId: string | null; createdAt: string };
type Version = { id: string; prompt: string | null; message: string | null; complete: boolean; createdAt: string };
type Step = { id: string; label: string; status: "running" | "done" | "error" };
type Note = { text: string; html: string; label: string };
type Question = { id: string; label: string; options?: string[] };

const VIEWPORTS = { desktop: "100%", tablet: "820px", phone: "390px" } as const;

/** Version times in the viewer's own time zone (the studio formats in UTC by default). */
function viewerZone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return undefined;
  }
}

export function DesignWorkspace({ id }: { id: string }) {
  const router = useRouter();
  const t = useTranslations("designer");
  const tc = useTranslations("common");
  const format = useFormatter();
  const [design, setDesign] = useState<Design | null>(null);
  // Lets the sandboxed preview open the design's other pages (see preview-token.ts).
  const [pass, setPass] = useState("");
  const [chat, setChat] = useState<Message[]>([]);
  const [versions, setVersions] = useState<Version[]>([]);
  const [running, setRunning] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);
  const [prompt, setPrompt] = useState("");
  const [notes, setNotes] = useState<Note[]>([]);
  const [error, setError] = useState("");
  const [page, setPage] = useState("index.html");
  const [viewport, setViewport] = useState<keyof typeof VIEWPORTS>("desktop");
  const [commenting, setCommenting] = useState(false);
  const [picked, setPicked] = useState<{ html: string; label: string } | null>(null);
  const [pickNote, setPickNote] = useState("");
  const [showVersions, setShowVersions] = useState(false);
  const [viewVersion, setViewVersion] = useState<string | null>(null);
  const [stamp, setStamp] = useState(0);
  const [questions, setQuestions] = useState<{ prompt: string; list: Question[]; answers: Record<string, string> } | null>(null);
  const [mobileView, setMobileView] = useState<"chat" | "preview">("chat");
  const frame = useRef<HTMLIFrameElement>(null);
  const chatEnd = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/designs/${id}`);
    if (res.status === 404) return router.replace("/designer");
    const d = await res.json().catch(() => null);
    if (!d?.design) return;
    setDesign(d.design);
    if (typeof d.previewPass === "string") setPass((old) => old || d.previewPass);
    setChat(d.chat);
    setVersions(d.versions);
    setRunning(Boolean(d.runningJobId));
  }, [id, router]);

  // Live progress while a build runs.
  useEffect(() => {
    void refresh();
    const es = new EventSource(`/api/designs/${id}/events`);
    es.onmessage = (e) => {
      const ev = JSON.parse(e.data);
      if (ev.type === "step") setSteps((s) => [...s.filter((x) => x.id !== ev.id), { id: ev.id, label: ev.label, status: ev.status }]);
      else if (ev.type === "file") setStamp((n) => n + 1);
      else if (ev.type === "job") {
        setRunning(ev.status === "running");
        if (ev.status === "running") setSteps([]);
        void refresh();
        setStamp((n) => n + 1);
      } else if (ev.type === "chat" || ev.type === "versions") void refresh();
    };
    return () => es.close();
  }, [id, refresh]);

  // Block body on purpose: newer browsers make scrollIntoView() return a
  // promise, and an effect that returns anything but a function crashes React.
  useEffect(() => {
    chatEnd.current?.scrollIntoView({ block: "end" });
  }, [chat.length, steps.length]);

  // The first request comes from the Designer home: ask quick questions first.
  useEffect(() => {
    if (!design) return;
    let first: string | null = null;
    try { first = sessionStorage.getItem(`nk-design-first:${id}`); sessionStorage.removeItem(`nk-design-first:${id}`); } catch {}
    if (!first || design.files.length > 0) return;
    const firstPrompt = first;
    setPrompt(firstPrompt);
    fetch(`/api/designs/${id}/clarify`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ prompt: firstPrompt }) })
      .then((r) => r.json())
      .then((d) => {
        const list: Question[] = Array.isArray(d.questions) ? d.questions : [];
        if (list.length) setQuestions({ prompt: firstPrompt, list, answers: {} });
        else void send(firstPrompt, []);
      })
      .catch(() => void send(firstPrompt, []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [design?.id]);

  // Messages from the preview: which page is showing, and picked elements.
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.source !== frame.current?.contentWindow || !e.data || typeof e.data !== "object") return;
      if (e.data.type === "nk-page" && typeof e.data.path === "string") setPage(e.data.path.split("?")[0] || "index.html");
      if (e.data.type === "nk-pick" && typeof e.data.html === "string") {
        const label = (typeof e.data.text === "string" && e.data.text) || `<${e.data.tag}>`;
        setPicked({ html: e.data.html, label: label.slice(0, 60) });
        setPickNote("");
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  async function send(text: string, withNotes: Note[]) {
    if (running || (!text.trim() && withNotes.length === 0)) return;
    setError("");
    setRunning(true);
    setSteps([]);
    const res = await fetch(`/api/designs/${id}/generate`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ prompt: text, notes: withNotes.map((n) => ({ text: n.text, html: n.html })) }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setRunning(false);
      setError(data.error || t("workspace.startFailed"));
      return;
    }
    setPrompt("");
    setNotes([]);
    setCommenting(false);
    setViewVersion(null);
  }

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    void send(prompt, notes);
  }

  function buildWithAnswers(skip: boolean) {
    if (!questions) return;
    const answers = skip ? "" : questions.list.map((q) => (questions.answers[q.id] ? `${q.label} ${questions.answers[q.id]}` : "")).filter(Boolean).join("\n");
    setQuestions(null);
    void send(answers ? `${questions.prompt}\n\n${answers}` : questions.prompt, []);
  }

  async function restore(v: Version) {
    if (!window.confirm(v.complete ? t("workspace.confirmRestore") : t("workspace.confirmRestoreHome"))) return;
    const res = await fetch(`/api/designs/${id}/versions/${v.id}/restore`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setError(data.error || t("workspace.restoreFailed"));
    setViewVersion(null);
    setStamp((n) => n + 1);
    void refresh();
  }

  async function moveToBuilder() {
    if (!window.confirm(t("workspace.confirmMove"))) return;
    const res = await fetch(`/api/designs/${id}/builder`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setError(data.error || t("workspace.moveFailed"));
    router.push(data.url);
  }

  async function copyDesign() {
    const r = await fetch(`/api/designs/${id}/duplicate`, { method: "POST" }).then((x) => x.json()).catch(() => null);
    if (r?.design?.id) router.push(`/designer/${r.design.id}`);
  }

  const pages = useMemo(() => {
    const list = (design?.files ?? []).map((f) => f.path).filter((p) => /^[^/]+\.html?$/i.test(p));
    return list.sort((a, b) => (a === "index.html" ? -1 : b === "index.html" ? 1 : a.localeCompare(b)));
  }, [design]);
  const src = `/api/designs/${id}/preview/${pass ? `${pass}/` : ""}${encodeURIComponent(page)}?${viewVersion ? `version=${viewVersion}&` : ""}${commenting ? "pick=1&" : ""}t=${stamp}`;
  const readOnly = design?.inBuilder ?? false;
  const localZone = viewerZone();

  if (!design) return <div className="grid min-h-[60vh] place-items-center text-surface-400"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="flex h-[calc(100dvh-68px)] flex-col lg:flex-row">
      {/* Phone: switch between the conversation and the preview. */}
      <div className="flex border-b border-white/10 lg:hidden" role="tablist">
        {(["chat", "preview"] as const).map((v) => (
          <button key={v} role="tab" aria-selected={mobileView === v} data-help={v === "chat" ? t("workspace.tabChatHelp") : t("workspace.tabPreviewHelp")} className={`flex-1 py-2.5 text-sm ${mobileView === v ? "border-b-2 border-brand-500 text-white" : "text-surface-400"}`} onClick={() => setMobileView(v)}>{v === "chat" ? t("workspace.tabChat") : t("workspace.tabPreview")}</button>
        ))}
      </div>

      {/* Conversation */}
      <section className={`${mobileView === "chat" ? "flex" : "hidden"} min-h-0 w-full flex-col border-white/10 lg:flex lg:w-[400px] lg:shrink-0 lg:border-e`} aria-label={t("workspace.conversation")} data-help={t("workspace.conversationHelp")}>
        <div className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate font-medium" dir="auto">{design.name}</p>
            <p className="text-xs text-surface-400">{t("workspace.versionCount", { count: versions.length })}</p>
          </div>
          {design.projectId && !readOnly && <Link href={`/projects/${design.projectId}`} className="btn-ghost shrink-0 px-3 py-1.5 text-xs" data-help={t("workspace.openAppHelp")}>{t("workspace.openApp")}</Link>}
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
          {chat.length === 0 && !running && !questions && <p className="text-sm text-surface-400">{t("workspace.emptyChat")}</p>}
          {chat.map((m) =>
            m.kind === "step" ? (
              <p key={m.seq} className="flex items-center gap-2 text-xs text-surface-400"><Check size={12} className="text-emerald-400" /><span dir="auto">{m.text}</span></p>
            ) : (
              <div key={m.seq} className={m.kind === "user" ? "ms-8 rounded-2xl rounded-ee-md bg-brand-600/25 px-3.5 py-2.5 text-sm" : m.kind === "error" ? "flex gap-2 rounded-xl border border-red-400/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-200" : "me-6 text-sm text-surface-200"}>
                {m.kind === "error" && <AlertTriangle size={15} className="mt-0.5 shrink-0" />}
                <p className="whitespace-pre-wrap" dir="auto">{m.text}</p>
                {m.versionId && <button type="button" className="mt-1 text-xs text-brand-300 hover:underline" data-help={t("workspace.seeVersionHelp")} onClick={() => { setViewVersion(m.versionId); setMobileView("preview"); }}>{t("workspace.seeVersion")}</button>}
              </div>
            ),
          )}
          {running && (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm">
              <p className="flex items-center gap-2 font-medium"><Loader2 size={15} className="animate-spin text-brand-300" />{t("workspace.working")}</p>
              <ul className="mt-2 space-y-1">
                {steps.map((s) => (
                  <li key={s.id} className="flex items-center gap-2 text-xs text-surface-300">
                    {s.status === "running" ? <Loader2 size={12} className="animate-spin" /> : s.status === "done" ? <Check size={12} className="text-emerald-400" /> : <X size={12} className="text-red-400" />}
                    {s.label}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {questions && (
            <div className="space-y-3 rounded-xl border border-brand-500/30 bg-brand-500/5 p-3 text-sm" data-help={t("workspace.questionsHelp")}>
              <p className="font-medium">{t("workspace.questionsTitle")}</p>
              {questions.list.map((q) => (
                <div key={q.id}>
                  <p className="text-surface-200">{q.label}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {(q.options ?? []).map((o) => (
                      <button key={o} type="button" data-help={t("workspace.pickAnswerHelp")} onClick={() => setQuestions({ ...questions, answers: { ...questions.answers, [q.id]: o } })} className={`rounded-full border px-2.5 py-1 text-xs ${questions.answers[q.id] === o ? "border-brand-400 bg-brand-500/20 text-white" : "border-white/15 text-surface-300 hover:border-white/30"}`}>{o}</button>
                    ))}
                  </div>
                  <input className="input mt-1.5 py-1.5 text-xs" placeholder={t("workspace.typeAnswer")} value={questions.answers[q.id] ?? ""} onChange={(e) => setQuestions({ ...questions, answers: { ...questions.answers, [q.id]: e.target.value } })} />
                </div>
              ))}
              <div className="flex gap-2">
                <button type="button" className="btn-primary px-3 py-1.5 text-sm" data-help={t("workspace.buildItHelp")} onClick={() => buildWithAnswers(false)}>{t("workspace.buildIt")}</button>
                <button type="button" className="btn-ghost px-3 py-1.5 text-sm" data-help={t("workspace.skipQuestionsHelp")} onClick={() => buildWithAnswers(true)}>{t("workspace.skipQuestions")}</button>
              </div>
            </div>
          )}
          <div ref={chatEnd} />
        </div>

        {readOnly ? (
          <div className="space-y-2 border-t border-white/10 p-4 text-sm">
            <p className="text-surface-300">{t("workspace.movedNotice")}</p>
            <div className="flex flex-wrap gap-2">
              {design.projectId && <Link className="btn-primary px-3 py-1.5 text-sm" href={`/designer/open-in-builder/${design.id}`} data-help={t("workspace.openInBuilderHelp")}>{t("workspace.openInBuilder")}</Link>}
              <button type="button" className="btn-ghost px-3 py-1.5 text-sm" data-help={t("workspace.copyToKeepHelp")} onClick={copyDesign}>{t("workspace.copyToKeep")}</button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="border-t border-white/10 p-3">
            {notes.length > 0 && (
              <ul className="mb-2 flex flex-wrap gap-1.5">
                {notes.map((n, i) => (
                  <li key={i} className="flex max-w-full items-center gap-1 rounded-full bg-brand-500/15 px-2.5 py-1 text-xs text-brand-100">
                    <span className="truncate" dir="auto">{t("workspace.noteChip", { label: n.label, text: n.text })}</span>
                    <button type="button" aria-label={t("workspace.removeNote")} data-help={t("workspace.removeNoteHelp")} onClick={() => setNotes(notes.filter((_, j) => j !== i))}><X size={12} /></button>
                  </li>
                ))}
              </ul>
            )}
            {error && <p role="alert" className="mb-2 text-xs text-red-300">{error}</p>}
            <div className="flex items-end gap-2 rounded-xl border border-white/10 bg-white/[0.03] [[data-theme=light]_&]:bg-surface-900 p-2 focus-within:border-brand-500/60">
              <label htmlFor="design-prompt" className="sr-only">{t("workspace.askLabel")}</label>
              <textarea
                id="design-prompt"
                data-help={t("workspace.askHelp")}
                rows={2}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
                placeholder={chat.length ? t("workspace.askPlaceholder") : t("workspace.describePlaceholder")}
                className="min-h-[44px] flex-1 resize-none bg-transparent p-1 text-sm outline-none placeholder:text-surface-500"
                disabled={running}
              />
              {running ? (
                <button type="button" className="btn-ghost shrink-0 p-2" aria-label={t("workspace.stop")} data-help={t("workspace.stopHelp")} onClick={() => fetch(`/api/designs/${id}/generate`, { method: "DELETE" })}><Square size={16} /></button>
              ) : (
                <button className="btn-primary shrink-0 p-2" aria-label={t("workspace.send")} data-help={t("workspace.sendHelp")} disabled={!prompt.trim() && notes.length === 0}><Send size={16} className="rtl:-scale-x-100" /></button>
              )}
            </div>
          </form>
        )}
      </section>

      {/* Preview */}
      <section className={`${mobileView === "preview" ? "flex" : "hidden"} min-h-0 min-w-0 flex-1 flex-col lg:flex`} aria-label={t("workspace.tabPreview")}>
        <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-3 py-2">
          <label className="sr-only" htmlFor="design-page">{t("workspace.page")}</label>
          <select id="design-page" data-help={t("workspace.pageHelp")} className="input w-auto py-1.5 text-sm" value={page} onChange={(e) => setPage(e.target.value)} disabled={pages.length === 0}>
            {(pages.length ? pages : ["index.html"]).map((p) => <option key={p} value={p}>{p === "index.html" ? t("workspace.homePage") : p.replace(/\.html?$/, "")}</option>)}
          </select>
          <div className="flex rounded-lg border border-white/10 p-0.5" role="group" aria-label={t("workspace.screenSize")} data-help={t("workspace.screenSizeHelp")}>
            {([["desktop", Monitor], ["tablet", Tablet], ["phone", Smartphone]] as const).map(([v, Icon]) => (
              <button key={v} type="button" aria-label={t(`workspace.${v}`)} data-help={t(`workspace.${v}Help`)} aria-pressed={viewport === v} onClick={() => setViewport(v)} className={`rounded-md p-1.5 ${viewport === v ? "bg-white/10 text-white" : "text-surface-400 hover:text-white"}`}><Icon size={16} /></button>
            ))}
          </div>
          {!readOnly && (
            <button type="button" aria-pressed={commenting} data-help={t("workspace.commentHelp")} onClick={() => { setCommenting(!commenting); setViewVersion(null); }} className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-sm ${commenting ? "border-brand-400 bg-brand-500/20 text-white" : "border-white/10 text-surface-300 hover:text-white"}`}>
              <MessageSquarePlus size={15} />{commenting ? t("workspace.commenting") : t("workspace.comment")}
            </button>
          )}
          <div className="ms-auto flex items-center gap-1">
            <button type="button" aria-pressed={showVersions} data-help={t("workspace.versionsHelp")} onClick={() => setShowVersions(!showVersions)} className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-surface-300 hover:bg-white/5 hover:text-white"><History size={15} />{t("workspace.versions")}</button>
            {pages.length > 0 && <a href={`/api/designs/${id}/export`} data-help={t("workspace.downloadHelp")} className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-surface-300 hover:bg-white/5 hover:text-white"><Download size={15} />{t("workspace.download")}</a>}
            {pages.length > 0 && <a href={src.replace(/[?&]pick=1/, "")} target="_blank" rel="noopener" className="rounded-lg p-1.5 text-surface-300 hover:bg-white/5 hover:text-white" aria-label={t("workspace.openNewTab")} data-help={t("workspace.openNewTabHelp")}><ArrowUpRight size={16} className="rtl:-scale-x-100" /></a>}
            {!readOnly && design.projectId && <button type="button" onClick={moveToBuilder} data-help={t("workspace.moveToBuilderHelp")} className="rounded-lg px-2.5 py-1.5 text-sm text-surface-300 hover:bg-white/5 hover:text-white">{t("workspace.moveToBuilder")}</button>}
          </div>
        </div>

        {viewVersion && (
          <div className="flex flex-wrap items-center gap-3 border-b border-amber-400/20 bg-amber-400/10 px-4 py-2 text-sm text-amber-100">
            <span>{t("workspace.earlierVersion")}</span>
            {!readOnly && <button type="button" className="font-medium underline" data-help={t("workspace.restoreItHelp")} onClick={() => { const v = versions.find((x) => x.id === viewVersion); if (v) void restore(v); }}>{t("workspace.restoreIt")}</button>}
            <button type="button" className="underline" data-help={t("workspace.backToCurrentHelp")} onClick={() => setViewVersion(null)}>{t("workspace.backToCurrent")}</button>
          </div>
        )}

        <div className="relative flex min-h-0 flex-1">
          <div className="flex min-h-0 flex-1 justify-center overflow-auto bg-surface-950 p-3 [[data-theme=light]_&]:bg-surface-800/60">
            <iframe
              ref={frame}
              key={`${viewport}`}
              title={t("workspace.previewTitle")}
              src={src}
              sandbox="allow-scripts allow-forms allow-popups allow-modals"
              className="h-full rounded-lg border border-white/10 bg-fixed-white transition-[width]"
              style={{ width: VIEWPORTS[viewport], maxWidth: "100%" }}
            />
          </div>

          {picked && (
            <div className="absolute inset-x-3 bottom-3 z-20 mx-auto max-w-lg rounded-xl border border-brand-500/40 bg-surface-900 p-3 shadow-2xl">
              <p className="text-xs text-surface-400">{t.rich("workspace.commentOn", { label: picked.label, b: (c) => <span className="text-surface-200">{c}</span> })}</p>
              <form onSubmit={(e) => { e.preventDefault(); if (!pickNote.trim()) return; setNotes([...notes, { text: pickNote.trim(), html: picked.html, label: picked.label.slice(0, 24) }]); setPicked(null); }} className="mt-2 flex gap-2">
                <input autoFocus className="input py-1.5 text-sm" data-help={t("workspace.commentInputHelp")} placeholder={t("workspace.commentPlaceholder")} value={pickNote} onChange={(e) => setPickNote(e.target.value)} />
                <button className="btn-primary px-3 py-1.5 text-sm" data-help={t("workspace.addHelp")}>{t("workspace.add")}</button>
                <button type="button" className="btn-ghost px-2 py-1.5" aria-label={tc("cancel")} data-help={t("workspace.cancelNoteHelp")} onClick={() => setPicked(null)}><X size={14} /></button>
              </form>
              <p className="mt-2 text-xs text-surface-500">{t("workspace.commentTip")}</p>
            </div>
          )}

          {showVersions && (
            <aside data-help={t("workspace.versionsPanelHelp")} className="absolute inset-y-0 end-0 z-10 w-80 max-w-full overflow-y-auto border-s border-white/10 bg-surface-900 p-4 shadow-2xl" aria-label={t("workspace.versions")}>
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">{t("workspace.versions")}</h2>
                <button type="button" aria-label={tc("close")} data-help={t("workspace.closeVersionsHelp")} className="rounded p-1 text-surface-400 hover:text-white" onClick={() => setShowVersions(false)}><X size={16} /></button>
              </div>
              {versions.length === 0 ? (
                <p className="mt-3 text-sm text-surface-400">{t("workspace.noVersions")}</p>
              ) : (
                <ol className="mt-3 space-y-2">
                  {versions.map((v, i) => (
                    <li key={v.id} className={`rounded-lg border p-3 text-sm ${viewVersion === v.id ? "border-brand-400" : "border-white/10"}`}>
                      <p className="line-clamp-2 text-surface-200" dir="auto">{v.message || v.prompt || t("workspace.savedVersion")}</p>
                      <p className="mt-1 text-xs text-surface-500">{[format.dateTime(new Date(v.createdAt), { dateStyle: "medium", timeStyle: "short", timeZone: localZone }), i === 0 ? t("workspace.current") : "", !v.complete ? t("workspace.homeOnly") : ""].filter(Boolean).join(" · ")}</p>
                      <div className="mt-2 flex gap-3 text-xs">
                        <button type="button" className="text-brand-300 hover:underline" data-help={t("workspace.viewHelp")} onClick={() => { setViewVersion(i === 0 ? null : v.id); setCommenting(false); }}>{t("workspace.view")}</button>
                        {i > 0 && !readOnly && <button type="button" className="text-brand-300 hover:underline" data-help={t("workspace.restoreHelp")} onClick={() => restore(v)}>{t("workspace.restore")}</button>}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </aside>
          )}
        </div>
      </section>
    </div>
  );
}
