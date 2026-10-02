"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { AppPlan } from "@/lib/ai/plan";
import { isLocale } from "@/i18n/locales";
import { PlanReview } from "./plan-review";
import { AppLanguageSelect } from "./app-language-select";

type Stage = "input" | "planning" | "review" | "building" | "done" | "error";

type Totals = { tables: number; pages: number; flows: number };
type Completed = { tables: number; pages: number; flows: number };

type ScaffoldEvent =
  | { type: "progress"; step: string; message: string; name?: string }
  | { type: "plan"; totalTables: number; totalPages: number; totalFlows: number }
  | { type: "planned"; plan: AppPlan }
  | { type: "token"; text: string }
  | { type: "done"; projectId: string; homePageId: string }
  | { type: "error"; message: string; refunded?: boolean };

type RunSnapshot = {
  id: string;
  kind: "scaffold" | "plan";
  prompt: string;
  status: "running" | "success" | "error";
  events: ScaffoldEvent[];
  result: { projectId: string; homePageId: string } | null;
  error: string | null;
  /** The failed build's AI action was given back. */
  refunded?: boolean;
};

/** What the user is working on, kept per tab so a refresh or a detour doesn't lose it. */
type Draft = { prompt: string; plan: AppPlan | null; runId?: string; locale?: string };
/** A plan carries the app's language ("locale", lib/ai/multi-pass.ts) to the build. */
type LocalizedPlan = AppPlan & { locale?: string };
const DRAFT_KEY = "nk-new-app-draft";
function readDraft(): Draft | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null;
  }
}
function writeDraft(draft: Draft | null) {
  try {
    if (draft) sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    else sessionStorage.removeItem(DRAFT_KEY);
  } catch {}
}

const MAX_RECONNECTS = 3;

/** Example ideas (texts in messages/en/ai.json, wizard.examples). */
export const EXAMPLES = ["dogWalking", "pizza", "classes", "bookReviews", "party", "chores", "club", "art"] as const;

type Failure = { phase: "plan" | "build"; message: string; quota?: boolean; refunded?: boolean };

async function readError(res: Response, fallback: string): Promise<{ message: string; quota: boolean }> {
  const text = await res.text().catch(() => "");
  try {
    const data = JSON.parse(text) as { error?: string; code?: string };
    if (data.error) return { message: data.error, quota: data.code === "ai_quota" };
  } catch {}
  return { message: text || fallback, quota: false };
}

export function ScaffoldWizard({ aiProblem = null, below }: { aiProblem?: string | null; below?: React.ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("ai");
  const studioLocale = useLocale();
  // The app's language: from the dashboard's idea box (?lang=), else the
  // studio language. The planner may pick another one the idea asks for.
  const [appLocale, setAppLocale] = useState(() => {
    const fromUrl = searchParams.get("lang");
    return isLocale(fromUrl) ? fromUrl : studioLocale;
  });
  const appLocaleRef = useRef(appLocale);
  appLocaleRef.current = appLocale;
  const [prompt, setPrompt] = useState("");
  const [stage, setStage] = useState<Stage>("input");
  const [plan, setPlan] = useState<AppPlan | null>(null);
  const [status, setStatus] = useState("");
  const [totals, setTotals] = useState<Totals | null>(null);
  const [completed, setCompleted] = useState<Completed>({ tables: 0, pages: 0, flows: 0 });
  const [builtPages, setBuiltPages] = useState<string[]>([]);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [revising, setRevising] = useState(false);
  const [reviseError, setReviseError] = useState<string | null>(null);
  const streamAbortRef = useRef<AbortController | null>(null);
  const seenRef = useRef(0);
  const startedRef = useRef(false);
  const promptRef = useRef(prompt);
  promptRef.current = prompt;

  const setRunInUrl = useCallback((runId: string | null) => {
    const url = new URL(window.location.href);
    if (runId) url.searchParams.set("runId", runId);
    else url.searchParams.delete("runId");
    url.searchParams.delete("idea");
    window.history.replaceState(null, "", url.toString());
  }, []);

  const openEditor = useCallback((result: { projectId: string; homePageId: string }) => {
    writeDraft(null);
    setStage("done");
    setTimeout(() => router.push(`/projects/${result.projectId}/pages/${result.homePageId}/edit?welcome=1`), 900);
  }, [router]);

  const applyEvent = useCallback((ev: ScaffoldEvent) => {
    if (ev.type === "progress") {
      setStatus(ev.message);
      if (ev.step === "table" || ev.step === "page" || ev.step === "flow") {
        const key = `${ev.step}s` as keyof Completed;
        setCompleted((c) => ({ ...c, [key]: c[key] + 1 }));
        if (ev.step === "page") setBuiltPages((p) => [...p, ev.name ?? ev.message.replace(/^Page:\s*/, "")]);
      }
    } else if (ev.type === "plan") {
      setTotals({ tables: ev.totalTables ?? 0, pages: ev.totalPages ?? 0, flows: ev.totalFlows ?? 0 });
    } else if (ev.type === "planned") {
      const planned = ev.plan as LocalizedPlan;
      const locale = isLocale(planned.locale) ? planned.locale : appLocaleRef.current;
      setAppLocale(locale);
      setPlan(planned);
      setRevising(false);
      setReviseError(null);
      setStage("review");
      writeDraft({ prompt: promptRef.current, plan: planned, locale });
      setRunInUrl(null);
    } else if (ev.type === "done") {
      openEditor({ projectId: ev.projectId, homePageId: ev.homePageId });
    }
  }, [openEditor, setRunInUrl]);

  const fail = useCallback((f: Failure) => {
    setRevising(false);
    setRunInUrl(null);
    const draft = readDraft();
    if (draft?.runId) writeDraft({ ...draft, runId: undefined });
    setFailure(f);
    setStage("error");
  }, [setRunInUrl]);

  // Follow a run's event stream until it ends, reconnecting after dropped
  // connections (proxies cut long streams) without replaying seen events.
  const followRun = useCallback(async (runId: string, phase: "plan" | "build", reconnects = 0, onFail: (f: Failure) => void = fail): Promise<void> => {
    const controller = new AbortController();
    streamAbortRef.current = controller;
    let toSkip = seenRef.current;
    let serverError: string | null = null;
    let serverRefunded = false;
    let ended = false;
    try {
      const res = await fetch(`/api/ai/runs/${runId}/stream`, { signal: controller.signal, cache: "no-store" });
      if (!res.ok || !res.body) throw new Error(res.status === 404 ? t("wizard.buildGone") : t("wizard.connectionProblem", { status: res.status }));
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() ?? "";
        for (const chunk of chunks) {
          const line = chunk.trim();
          if (!line.startsWith("data:")) continue;
          let ev: ScaffoldEvent;
          try {
            ev = JSON.parse(line.slice(5).trim()) as ScaffoldEvent;
          } catch {
            continue;
          }
          if (toSkip > 0) { toSkip -= 1; continue; }
          seenRef.current += 1;
          if (ev.type === "error") {
            serverError = ev.message;
            serverRefunded = Boolean(ev.refunded);
          }
          if (ev.type === "done" || ev.type === "planned") ended = true;
          applyEvent(ev);
        }
      }
      if (serverError) return onFail({ phase, message: serverError, refunded: serverRefunded });
      if (ended) return;
      // The stream closed early. Ask where the run is and carry on from there.
      const snap = await fetch(`/api/ai/runs/${runId}`, { cache: "no-store" }).then((r) => (r.ok ? (r.json() as Promise<RunSnapshot>) : null)).catch(() => null);
      if (!snap) throw new Error(t("wizard.connectionEnded"));
      for (const ev of snap.events.slice(seenRef.current)) {
        seenRef.current += 1;
        applyEvent(ev);
      }
      if (snap.status === "running") return followRun(runId, phase, reconnects, onFail);
      if (snap.status === "error") return onFail({ phase, message: snap.error ?? t("wizard.stoppedUnexpectedly"), refunded: Boolean(snap.refunded) });
      if (snap.status === "success" && snap.result && phase === "build") openEditor(snap.result);
    } catch (err) {
      if (controller.signal.aborted) return;
      if (reconnects < MAX_RECONNECTS) {
        await new Promise((r) => setTimeout(r, 1000 * (reconnects + 1)));
        return followRun(runId, phase, reconnects + 1, onFail);
      }
      onFail({ phase, message: err instanceof Error ? err.message : t("wizard.genericError") });
    }
  }, [applyEvent, fail, openEditor, t]);

  const startPlanning = useCallback(async (text: string, revision?: { change: string; previous: AppPlan }) => {
    const p = text.trim();
    if (p.length < 5) return;
    setFailure(null);
    setReviseError(null);
    if (revision) setRevising(true);
    else { setStage("planning"); setPlan(null); }
    setStatus(revision ? t("wizard.updatingPlan") : t("wizard.readingIdea"));
    seenRef.current = 0;
    const res = await fetch("/api/ai/plan-app", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(revision ? { prompt: p, change: revision.change, previous: revision.previous, locale: appLocaleRef.current } : { prompt: p, locale: appLocaleRef.current }),
    }).catch(() => null);
    if (!res || !res.ok) {
      const { message, quota } = res ? await readError(res, t("wizard.serverError", { status: res.status })) : { message: t("wizard.noServer"), quota: false };
      if (revision) { setRevising(false); setReviseError(message); return; }
      return fail({ phase: "plan", message, quota });
    }
    const { runId } = (await res.json()) as { runId: string };
    if (!revision) {
      setRunInUrl(runId);
      return followRun(runId, "plan");
    }
    // A revision keeps the current plan on screen until the new one lands,
    // and a failed revision leaves that plan in place.
    await followRun(runId, "plan", 0, (f) => { setRevising(false); setReviseError(f.message); });
  }, [fail, followRun, setRunInUrl, t]);

  const startBuild = useCallback(async () => {
    if (!plan) return;
    setFailure(null);
    setStage("building");
    setStatus(t("wizard.startingBuild"));
    setTotals({ tables: plan.tables.length, pages: plan.pages.length, flows: plan.flows.length });
    setCompleted({ tables: 0, pages: 0, flows: 0 });
    setBuiltPages([]);
    seenRef.current = 0;
    const res = await fetch("/api/ai/scaffold", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt: prompt.trim(), plan: { ...plan, locale: appLocale }, locale: appLocale }),
    }).catch(() => null);
    if (!res || !res.ok) {
      const { message, quota } = res ? await readError(res, t("wizard.serverError", { status: res.status })) : { message: t("wizard.noServer"), quota: false };
      return fail({ phase: "build", message, quota });
    }
    const { runId } = (await res.json()) as { runId: string };
    writeDraft({ prompt: prompt.trim(), plan, runId, locale: appLocale });
    setRunInUrl(runId);
    await followRun(runId, "build");
  }, [plan, prompt, appLocale, fail, followRun, setRunInUrl, t]);

  // Pick up where the user left off: a run in the URL (refresh), an idea
  // handed over from the dashboard, or a plan still under review in this tab.
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    const runId = searchParams.get("runId") ?? readDraft()?.runId ?? null;
    const idea = searchParams.get("idea");
    (async () => {
      if (runId) {
        const snap = await fetch(`/api/ai/runs/${runId}`, { cache: "no-store" }).then((r) => (r.ok ? (r.json() as Promise<RunSnapshot>) : null)).catch(() => null);
        if (snap) {
          setPrompt(snap.prompt);
          promptRef.current = snap.prompt;
          const phase = snap.kind === "plan" ? "plan" : "build";
          if (phase === "build") {
            const draft = readDraft();
            if (draft?.plan) setPlan(draft.plan);
            if (isLocale(draft?.locale)) setAppLocale(draft.locale);
            if (snap.status === "success" && snap.result) return openEditor(snap.result);
          }
          if (snap.status === "error") return fail({ phase, message: snap.error ?? t("wizard.stoppedUnexpectedly"), refunded: Boolean(snap.refunded) });
          setStage(phase === "plan" ? "planning" : "building");
          seenRef.current = 0;
          for (const ev of snap.events) {
            seenRef.current += 1;
            applyEvent(ev);
          }
          if (snap.status === "running") await followRun(runId, phase);
          return;
        }
        setRunInUrl(null);
        const draft = readDraft();
        if (draft?.runId) writeDraft({ ...draft, runId: undefined });
      }
      if (idea && idea.trim().length >= 5) {
        setPrompt(idea);
        promptRef.current = idea;
        if (!aiProblem) return startPlanning(idea);
        setRunInUrl(null);
        return;
      }
      const draft = readDraft();
      if (draft?.plan) {
        setPrompt(draft.prompt);
        promptRef.current = draft.prompt;
        setPlan(draft.plan);
        const kept = draft.locale ?? (draft.plan as LocalizedPlan).locale;
        if (isLocale(kept)) setAppLocale(kept);
        setStage("review");
      }
    })();
    return () => streamAbortRef.current?.abort();
    // Runs once on mount by design; later URL changes are our own.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startOver = useCallback(() => {
    streamAbortRef.current?.abort();
    writeDraft(null);
    setRunInUrl(null);
    setPlan(null);
    setFailure(null);
    setRevising(false);
    setStage("input");
  }, [setRunInUrl]);

  const updatePlan = useCallback((next: AppPlan) => {
    setPlan(next);
    writeDraft({ prompt: promptRef.current, plan: next, locale: appLocaleRef.current });
  }, []);

  const changeAppLocale = useCallback((code: string) => {
    setAppLocale(code);
    appLocaleRef.current = code;
    setPlan((current) => {
      if (current) writeDraft({ prompt: promptRef.current, plan: current, locale: code });
      return current;
    });
  }, []);

  return (
    <div className="relative mx-auto max-w-4xl px-5 py-10 md:py-16">
      <div className="pointer-events-none absolute -inset-20 bg-gradient-to-br from-brand-700/20 via-transparent to-cyan-500/10 blur-3xl" />
      <div className="relative">
        {stage === "input" && (
          <>
            <IdeaInput prompt={prompt} setPrompt={setPrompt} onSubmit={() => startPlanning(prompt)} aiProblem={aiProblem} appLocale={appLocale} onAppLocale={changeAppLocale} />
            {below}
          </>
        )}
        {stage === "planning" && <PlanningStage prompt={prompt} status={status} onCancel={startOver} />}
        {stage === "review" && plan && (
          <PlanReview plan={plan} onChange={updatePlan} onBuild={startBuild} onStartOver={startOver} appLocale={appLocale} onAppLocale={changeAppLocale}
            onRevise={(change) => startPlanning(prompt, { change, previous: plan })} revising={revising} reviseError={reviseError} />
        )}
        {stage === "building" && <BuildingStage plan={plan} status={status} totals={totals} completed={completed} builtPages={builtPages} />}
        {stage === "done" && (
          <div className="card p-10 text-center" role="status">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300"><Check size={24} aria-hidden /></span>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight">{t("wizard.ready")}</h2>
            <p className="mt-2 text-surface-300">{t("wizard.opening")}</p>
          </div>
        )}
        {stage === "error" && failure && (
          <div className="card p-8 text-center" role="alert">
            <h2 className="text-xl font-semibold">{failure.quota ? t("wizard.quotaTitle") : t("wizard.retryTitle")}</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm text-surface-400">
              {failure.quota ? failure.message
                : failure.phase === "plan" ? t("wizard.planFailed")
                : t(failure.refunded ? "wizard.buildFailedRefunded" : "wizard.buildFailed")}
            </p>
            {!failure.quota && (
              <details className="mx-auto mt-3 max-w-lg text-xs text-surface-500">
                <summary className="cursor-pointer">{t("wizard.details")}</summary>
                <p className="mt-2 break-words">{failure.message}</p>
              </details>
            )}
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {failure.quota ? (
                <>
                  <Link href="/billing" className="btn-primary" data-help={t("wizard.seePlansHelp")}>{t("wizard.seePlans")}</Link>
                  <Link href="/new?mode=template" className="btn-ghost" data-help={t("wizard.useTemplateHelp")}>{t("wizard.useTemplate")}</Link>
                </>
              ) : failure.phase === "build" && plan ? (
                <>
                  <button className="btn-primary" onClick={startBuild} data-help={t("wizard.buildAgainHelp")}>{t("wizard.buildAgain")}</button>
                  <button className="btn-ghost" onClick={() => { setFailure(null); setStage("review"); }} data-help={t("wizard.backToPlanHelp")}>{t("wizard.backToPlan")}</button>
                </>
              ) : (
                <>
                  <button className="btn-primary" onClick={() => startPlanning(prompt)} data-help={t("wizard.tryAgainHelp")}>{t("wizard.tryAgain")}</button>
                  <button className="btn-ghost" onClick={() => { setFailure(null); setStage("input"); }} data-help={t("wizard.changeDescriptionHelp")}>{t("wizard.changeDescription")}</button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function IdeaInput({ prompt, setPrompt, onSubmit, aiProblem, appLocale, onAppLocale }: { prompt: string; setPrompt: (s: string) => void; onSubmit: () => void; aiProblem: string | null; appLocale: string; onAppLocale: (code: string) => void }) {
  const t = useTranslations("ai");
  const ready = prompt.trim().length >= 5 && !aiProblem;
  return (
    <>
      <div className="text-center">
        <p className="studio-eyebrow text-brand-300">{t("wizard.eyebrow")}</p>
        <h1 className="studio-display mt-4">{t("wizard.headingLine1")}<br /><span>{t("wizard.headingLine2")}</span></h1>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-surface-400">{t("wizard.intro")}</p>
      </div>
      <form className="card mt-9 p-2" data-help={t("wizard.formHelp")} onSubmit={(e) => { e.preventDefault(); if (ready) onSubmit(); }}>
        <textarea
          className="w-full resize-none bg-transparent p-4 text-base text-surface-50 placeholder:text-surface-500 focus:outline-none"
          rows={4}
          maxLength={2000}
          aria-label={t("wizard.promptLabel")}
          data-help={t("wizard.promptHelp")}
          placeholder={t("wizard.promptPlaceholder")}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && ready) onSubmit(); }}
          disabled={Boolean(aiProblem)}
          autoFocus
        />
        <div className="flex flex-wrap items-center justify-between gap-3 px-2 pb-2">
          <span className="min-w-0 text-xs text-surface-500">{prompt.length > 1500 ? t("wizard.charsLeft", { count: 2000 - prompt.length }) : t("wizard.tip")}</span>
          <span className="flex min-w-0 flex-wrap items-center gap-3">
            <AppLanguageSelect value={appLocale} onChange={onAppLocale} id="wizard-app-language" />
            <button className="btn-primary px-6" disabled={!ready} data-help={t("wizard.planItHelp")}>{t("wizard.planIt")}</button>
          </span>
        </div>
      </form>
      {aiProblem && <p role="status" className="mt-3 rounded-lg border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">{t("wizard.aiProblem", { problem: aiProblem })}</p>}
      {!aiProblem && (
        <div className="mt-5">
          <p className="mb-2 text-center text-xs text-surface-500">{t("wizard.needIdea")}</p>
          <div className="flex flex-wrap justify-center gap-2">
            {EXAMPLES.map((ex) => (
              <button key={ex} type="button" onClick={() => setPrompt(t(`wizard.examples.${ex}.prompt`))} data-help={t("wizard.exampleHelp")} className="rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-sm text-surface-200 transition hover:border-brand-400/60 hover:bg-white/[0.06]">
                {t(`wizard.examples.${ex}.label`)}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function PlanningStage({ prompt, status, onCancel }: { prompt: string; status: string; onCancel: () => void }) {
  const t = useTranslations("ai");
  const tc = useTranslations("common");
  return (
    <div className="card p-8 text-center md:p-10" role="status" aria-live="polite">
      <Loader2 size={32} className="mx-auto animate-spin text-brand-300" aria-hidden />
      <h2 className="mt-5 text-2xl font-semibold tracking-tight">{t("wizard.planning")}</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm italic text-surface-400">{t("wizard.quoted", { prompt })}</p>
      <p className="mt-6 text-sm text-surface-300">{status || t("wizard.readingIdea")}</p>
      <p className="mt-6 text-xs text-surface-500">{t("wizard.planningNote")}</p>
      <button type="button" className="mt-5 text-sm text-surface-400 hover:text-surface-100" onClick={onCancel} data-help={t("wizard.cancelHelp")}>{tc("cancel")}</button>
    </div>
  );
}

function BuildingStage({ plan, status, totals, completed, builtPages }: { plan: AppPlan | null; status: string; totals: Totals | null; completed: Completed; builtPages: string[] }) {
  const total = totals ? totals.pages + totals.flows : 0;
  const done = completed.pages + completed.flows;
  const percent = totals ? Math.min(98, Math.round(((done + 0.5) / Math.max(1, total + 1)) * 100)) : 5;
  const pages = plan?.pages ?? [];
  const current = pages.find((p) => !builtPages.includes(p.title));
  const flowsDone = totals ? completed.flows >= totals.flows && completed.pages >= totals.pages : false;
  const t = useTranslations("ai");
  return (
    <div className="card p-8 md:p-10">
      <div className="text-center">
        <h2 className="text-2xl font-semibold tracking-tight">{plan?.project.name ? t("wizard.building", { name: plan.project.name }) : t("wizard.buildingYourApp")}</h2>
        <p className="mt-2 text-sm text-surface-400">{t("wizard.buildingNote")}</p>
      </div>
      <div className="mt-8" role="progressbar" aria-label={t("wizard.progress")} data-help={t("wizard.progressHelp")} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
        <div className="h-2 overflow-hidden rounded-full bg-surface-800">
          <div className="h-full bg-gradient-to-r from-brand-400 to-cyan-400 transition-all duration-700 ease-out" style={{ width: `${percent}%` }} />
        </div>
      </div>
      {pages.length > 0 && (
        <ol className="mx-auto mt-8 max-w-md space-y-2.5 text-sm">
          <Step state="done" label={t("wizard.planApproved")} />
          {pages.map((p) => <Step key={p.slug} state={builtPages.includes(p.title) ? "done" : p === current ? "active" : "waiting"} label={t("wizard.pageStep", { title: p.title })} />)}
          <Step state={flowsDone ? "done" : current ? "waiting" : "active"} label={t("wizard.connecting")} />
        </ol>
      )}
      <p className="mt-6 text-center text-xs text-surface-500" aria-live="polite">{status}</p>
    </div>
  );
}

function Step({ state, label }: { state: "done" | "active" | "waiting"; label: string }) {
  const t = useTranslations("ai");
  return (
    <li className={`flex items-center gap-3 ${state === "waiting" ? "text-surface-500" : "text-surface-100"}`}>
      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${state === "done" ? "bg-emerald-500/20 text-emerald-300" : state === "active" ? "text-brand-300" : "border border-white/15"}`}>
        {state === "done" ? <Check size={12} aria-hidden /> : state === "active" ? <Loader2 size={14} className="animate-spin" aria-hidden /> : null}
      </span>
      <span>{label}</span>
      <span className="sr-only">{state === "done" ? t("wizard.stepDone") : state === "active" ? t("wizard.stepActive") : t("wizard.stepWaiting")}</span>
    </li>
  );
}
