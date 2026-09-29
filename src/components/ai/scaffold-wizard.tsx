"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import type { AppPlan } from "@/lib/ai/plan";
import { PlanReview } from "./plan-review";

type Stage = "input" | "planning" | "review" | "building" | "done" | "error";

type Totals = { tables: number; pages: number; flows: number };
type Completed = { tables: number; pages: number; flows: number };

type ScaffoldEvent =
  | { type: "progress"; step: string; message: string }
  | { type: "plan"; totalTables: number; totalPages: number; totalFlows: number }
  | { type: "planned"; plan: AppPlan }
  | { type: "token"; text: string }
  | { type: "done"; projectId: string; homePageId: string }
  | { type: "error"; message: string };

type RunSnapshot = {
  id: string;
  kind: "scaffold" | "plan";
  prompt: string;
  status: "running" | "success" | "error";
  events: ScaffoldEvent[];
  result: { projectId: string; homePageId: string } | null;
  error: string | null;
};

/** What the user is working on, kept per tab so a refresh or a detour doesn't lose it. */
type Draft = { prompt: string; plan: AppPlan | null; runId?: string };
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

export const EXAMPLES = [
  { label: "Dog walking bookings", prompt: "A booking app for my dog walking business. Customers pick a date, a time and their dog's size, and I can see all bookings in one place." },
  { label: "Pizza orders", prompt: "An order form for my pizza shop. People pick their pizza, add their name and phone number, and the orders show up on an admin page." },
  { label: "Class sign-ups", prompt: "A sign-up app for my yoga classes. People pick a class from the timetable and enter their name and email. I can see who is coming to each class." },
  { label: "Book reviews", prompt: "A site where I post reviews of books I've read, with a rating out of 5 and the review text. Visitors can read the list of reviews." },
  { label: "Party RSVPs", prompt: "An RSVP page for my birthday party. Guests enter their name, whether they're coming and how many people they're bringing. I can see the guest list and the total." },
  { label: "Family chores", prompt: "A family chore tracker. Each chore has a name, who is doing it, and whether it's done. We can add chores, tick them off and see what's left." },
  { label: "Club members", prompt: "A members area for my running club. Members sign in to see upcoming runs and sign up for them. Admins can add runs and see who is coming." },
  { label: "Art portfolio", prompt: "A portfolio to show off my drawings. Each drawing has a title, a picture and a description. Visitors see them in a gallery and can send me a message." },
];

type Failure = { phase: "plan" | "build"; message: string; quota?: boolean };

async function readError(res: Response): Promise<{ message: string; quota: boolean }> {
  const text = await res.text().catch(() => "");
  try {
    const data = JSON.parse(text) as { error?: string; code?: string };
    if (data.error) return { message: data.error, quota: data.code === "ai_quota" };
  } catch {}
  return { message: text || `Something went wrong (${res.status}).`, quota: false };
}

export function ScaffoldWizard({ aiProblem = null, below }: { aiProblem?: string | null; below?: React.ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
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
        if (ev.step === "page") setBuiltPages((p) => [...p, ev.message.replace(/^Page:\s*/, "")]);
      }
    } else if (ev.type === "plan") {
      setTotals({ tables: ev.totalTables ?? 0, pages: ev.totalPages ?? 0, flows: ev.totalFlows ?? 0 });
    } else if (ev.type === "planned") {
      setPlan(ev.plan);
      setRevising(false);
      setReviseError(null);
      setStage("review");
      writeDraft({ prompt: promptRef.current, plan: ev.plan });
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
    let ended = false;
    try {
      const res = await fetch(`/api/ai/runs/${runId}/stream`, { signal: controller.signal, cache: "no-store" });
      if (!res.ok || !res.body) throw new Error(res.status === 404 ? "This build is no longer available." : `Connection problem (${res.status})`);
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
          if (ev.type === "error") serverError = ev.message;
          if (ev.type === "done" || ev.type === "planned") ended = true;
          applyEvent(ev);
        }
      }
      if (serverError) return onFail({ phase, message: serverError });
      if (ended) return;
      // The stream closed early. Ask where the run is and carry on from there.
      const snap = await fetch(`/api/ai/runs/${runId}`, { cache: "no-store" }).then((r) => (r.ok ? (r.json() as Promise<RunSnapshot>) : null)).catch(() => null);
      if (!snap) throw new Error("Connection ended before the work finished.");
      for (const ev of snap.events.slice(seenRef.current)) {
        seenRef.current += 1;
        applyEvent(ev);
      }
      if (snap.status === "running") return followRun(runId, phase, reconnects, onFail);
      if (snap.status === "error") return onFail({ phase, message: snap.error ?? "The work stopped unexpectedly." });
      if (snap.status === "success" && snap.result && phase === "build") openEditor(snap.result);
    } catch (err) {
      if (controller.signal.aborted) return;
      if (reconnects < MAX_RECONNECTS) {
        await new Promise((r) => setTimeout(r, 1000 * (reconnects + 1)));
        return followRun(runId, phase, reconnects + 1, onFail);
      }
      onFail({ phase, message: err instanceof Error ? err.message : "Something went wrong." });
    }
  }, [applyEvent, fail, openEditor]);

  const startPlanning = useCallback(async (text: string, revision?: { change: string; previous: AppPlan }) => {
    const p = text.trim();
    if (p.length < 5) return;
    setFailure(null);
    setReviseError(null);
    if (revision) setRevising(true);
    else { setStage("planning"); setPlan(null); }
    setStatus(revision ? "Updating the plan..." : "Reading your idea...");
    seenRef.current = 0;
    const res = await fetch("/api/ai/plan-app", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(revision ? { prompt: p, change: revision.change, previous: revision.previous } : { prompt: p }),
    }).catch(() => null);
    if (!res || !res.ok) {
      const { message, quota } = res ? await readError(res) : { message: "Couldn't reach the server. Check your connection.", quota: false };
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
  }, [fail, followRun, setRunInUrl]);

  const startBuild = useCallback(async () => {
    if (!plan) return;
    setFailure(null);
    setStage("building");
    setStatus("Starting the build...");
    setTotals({ tables: plan.tables.length, pages: plan.pages.length, flows: plan.flows.length });
    setCompleted({ tables: 0, pages: 0, flows: 0 });
    setBuiltPages([]);
    seenRef.current = 0;
    const res = await fetch("/api/ai/scaffold", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt: prompt.trim(), plan }),
    }).catch(() => null);
    if (!res || !res.ok) {
      const { message, quota } = res ? await readError(res) : { message: "Couldn't reach the server. Check your connection.", quota: false };
      return fail({ phase: "build", message, quota });
    }
    const { runId } = (await res.json()) as { runId: string };
    writeDraft({ prompt: prompt.trim(), plan, runId });
    setRunInUrl(runId);
    await followRun(runId, "build");
  }, [plan, prompt, fail, followRun, setRunInUrl]);

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
            if (snap.status === "success" && snap.result) return openEditor(snap.result);
          }
          if (snap.status === "error") return fail({ phase, message: snap.error ?? "The work stopped unexpectedly." });
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
    writeDraft({ prompt: promptRef.current, plan: next });
  }, []);

  return (
    <div className="relative mx-auto max-w-4xl px-5 py-10 md:py-16">
      <div className="pointer-events-none absolute -inset-20 bg-gradient-to-br from-brand-700/20 via-transparent to-cyan-500/10 blur-3xl" />
      <div className="relative">
        {stage === "input" && (
          <>
            <IdeaInput prompt={prompt} setPrompt={setPrompt} onSubmit={() => startPlanning(prompt)} aiProblem={aiProblem} />
            {below}
          </>
        )}
        {stage === "planning" && <PlanningStage prompt={prompt} status={status} onCancel={startOver} />}
        {stage === "review" && plan && (
          <PlanReview plan={plan} onChange={updatePlan} onBuild={startBuild} onStartOver={startOver}
            onRevise={(change) => startPlanning(prompt, { change, previous: plan })} revising={revising} reviseError={reviseError} />
        )}
        {stage === "building" && <BuildingStage plan={plan} status={status} totals={totals} completed={completed} builtPages={builtPages} />}
        {stage === "done" && (
          <div className="card p-10 text-center" role="status">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300"><Check size={24} aria-hidden /></span>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight">Your app is ready</h2>
            <p className="mt-2 text-surface-300">Opening it in the editor…</p>
          </div>
        )}
        {stage === "error" && failure && (
          <div className="card p-8 text-center" role="alert">
            <h2 className="text-xl font-semibold">{failure.quota ? "You're out of AI actions for now" : "Let's try that again"}</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm text-surface-400">
              {failure.quota ? failure.message
                : failure.phase === "plan" ? "The AI couldn't plan this one. Try again, or describe your idea a little differently."
                : "The build didn't finish. Your plan is saved, so you can build it again."}
            </p>
            {!failure.quota && (
              <details className="mx-auto mt-3 max-w-lg text-xs text-surface-500">
                <summary className="cursor-pointer">Details</summary>
                <p className="mt-2 break-words">{failure.message}</p>
              </details>
            )}
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {failure.quota ? (
                <>
                  <Link href="/billing" className="btn-primary">See plans</Link>
                  <Link href="/new?mode=template" className="btn-ghost">Use a template instead</Link>
                </>
              ) : failure.phase === "build" && plan ? (
                <>
                  <button className="btn-primary" onClick={startBuild}>Build again</button>
                  <button className="btn-ghost" onClick={() => { setFailure(null); setStage("review"); }}>Back to the plan</button>
                </>
              ) : (
                <>
                  <button className="btn-primary" onClick={() => startPlanning(prompt)}>Try again</button>
                  <button className="btn-ghost" onClick={() => { setFailure(null); setStage("input"); }}>Change my description</button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function IdeaInput({ prompt, setPrompt, onSubmit, aiProblem }: { prompt: string; setPrompt: (s: string) => void; onSubmit: () => void; aiProblem: string | null }) {
  const ready = prompt.trim().length >= 5 && !aiProblem;
  return (
    <>
      <div className="text-center">
        <p className="studio-eyebrow text-brand-300">NEW APP</p>
        <h1 className="studio-display mt-4">What do you want<br /><span>to make?</span></h1>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-surface-400">Describe it in your own words. You&apos;ll see a plan before anything is built.</p>
      </div>
      <form className="card mt-9 p-2" onSubmit={(e) => { e.preventDefault(); if (ready) onSubmit(); }}>
        <textarea
          className="w-full resize-none bg-transparent p-4 text-base text-surface-50 placeholder:text-surface-500 focus:outline-none"
          rows={4}
          maxLength={2000}
          aria-label="Describe the app you want to make"
          placeholder="e.g. A booking app for my dog walking business, where customers pick a time and I see every booking"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && ready) onSubmit(); }}
          disabled={Boolean(aiProblem)}
          autoFocus
        />
        <div className="flex flex-wrap items-center justify-between gap-3 px-2 pb-2">
          <span className="text-xs text-surface-500">{prompt.length > 1500 ? `${2000 - prompt.length} characters left` : "Tip: say who uses it and what they do."}</span>
          <button className="btn-primary px-6" disabled={!ready}>Plan my app</button>
        </div>
      </form>
      {aiProblem && <p role="status" className="mt-3 rounded-lg border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">{aiProblem} Templates and the editor still work.</p>}
      {!aiProblem && (
        <div className="mt-5">
          <p className="mb-2 text-center text-xs text-surface-500">Need an idea? Tap one to fill it in, then make it yours.</p>
          <div className="flex flex-wrap justify-center gap-2">
            {EXAMPLES.map((ex) => (
              <button key={ex.label} type="button" onClick={() => setPrompt(ex.prompt)} className="rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-sm text-surface-200 transition hover:border-brand-400/60 hover:bg-white/[0.06]">
                {ex.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function PlanningStage({ prompt, status, onCancel }: { prompt: string; status: string; onCancel: () => void }) {
  return (
    <div className="card p-8 text-center md:p-10" role="status" aria-live="polite">
      <Loader2 size={32} className="mx-auto animate-spin text-brand-300" aria-hidden />
      <h2 className="mt-5 text-2xl font-semibold tracking-tight">Planning your app…</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm italic text-surface-400">&ldquo;{prompt}&rdquo;</p>
      <p className="mt-6 text-sm text-surface-300">{status || "Reading your idea..."}</p>
      <p className="mt-6 text-xs text-surface-500">You&apos;ll be able to check and change the plan before anything is built.</p>
      <button type="button" className="mt-5 text-sm text-surface-400 hover:text-surface-100" onClick={onCancel}>Cancel</button>
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
  return (
    <div className="card p-8 md:p-10">
      <div className="text-center">
        <h2 className="text-2xl font-semibold tracking-tight">Building {plan?.project.name || "your app"}…</h2>
        <p className="mt-2 text-sm text-surface-400">This usually takes a few minutes. You can leave this page; the build keeps going and will be here when you come back.</p>
      </div>
      <div className="mt-8" role="progressbar" aria-label="Build progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
        <div className="h-2 overflow-hidden rounded-full bg-surface-800">
          <div className="h-full bg-gradient-to-r from-brand-400 to-cyan-400 transition-all duration-700 ease-out" style={{ width: `${percent}%` }} />
        </div>
      </div>
      {pages.length > 0 && (
        <ol className="mx-auto mt-8 max-w-md space-y-2.5 text-sm">
          <Step state="done" label="Plan approved" />
          {pages.map((p) => <Step key={p.slug} state={builtPages.includes(p.title) ? "done" : p === current ? "active" : "waiting"} label={`Page: ${p.title}`} />)}
          <Step state={flowsDone ? "done" : current ? "waiting" : "active"} label="Connecting forms, lists and buttons" />
        </ol>
      )}
      <p className="mt-6 text-center text-xs text-surface-500" aria-live="polite">{status}</p>
    </div>
  );
}

function Step({ state, label }: { state: "done" | "active" | "waiting"; label: string }) {
  return (
    <li className={`flex items-center gap-3 ${state === "waiting" ? "text-surface-500" : "text-surface-100"}`}>
      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${state === "done" ? "bg-emerald-500/20 text-emerald-300" : state === "active" ? "text-brand-300" : "border border-white/15"}`}>
        {state === "done" ? <Check size={12} aria-hidden /> : state === "active" ? <Loader2 size={14} className="animate-spin" aria-hidden /> : null}
      </span>
      <span>{label}</span>
      <span className="sr-only">{state === "done" ? "(done)" : state === "active" ? "(in progress)" : "(waiting)"}</span>
    </li>
  );
}
