"use client";
import Link from "next/link";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { CalendarClock, Loader2, RotateCcw } from "lucide-react";
import {
  AI_MIN_MINUTES,
  DAY_NAMES,
  describeSchedule,
  formatRunTime,
  scheduleTimeZone,
  serializeSchedule,
  validateSchedule,
  type ScheduleKind,
  type ScheduleSpec,
} from "@/lib/flow/schedule-spec";
import type { FlowScheduleState } from "@/lib/flow/scheduler";

type State = FlowScheduleState & { planHint: string | null };
type Mode = "app" | "schedule";
type Form = { kind: ScheduleKind; minutes: number; minute: number; at: string; day: number; tz: string };

const KINDS: Array<{ value: ScheduleKind; label: string }> = [
  { value: "every", label: "Every few minutes" },
  { value: "hourly", label: "Every hour" },
  { value: "daily", label: "Every day" },
  { value: "weekdays", label: "Monday to Friday" },
  { value: "weekly", label: "Once a week" },
];
const MINUTE_CHOICES = [1, 2, 5, 10, 15, 20, 30, 45, 120, 180, 240, 360, 480, 720];
const PAST_HOUR = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

function browserZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

function allZones(extra: string[]): string[] {
  let zones: string[] = [];
  try {
    zones = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.("timeZone") ?? [];
  } catch {
    zones = [];
  }
  if (!zones.length) zones = ["UTC", "Europe/London", "Europe/Berlin", "America/New_York", "America/Chicago", "America/Los_Angeles", "Asia/Kolkata", "Asia/Tokyo", "Australia/Sydney"];
  return [...new Set([...extra.filter(Boolean), "UTC", ...zones])];
}

function formFrom(spec: ScheduleSpec | null, minMinutes: number, zone: string): Form {
  const base: Form = { kind: "daily", minutes: Math.max(15, minMinutes), minute: 0, at: "09:00", day: 1, tz: zone };
  if (!spec) return base;
  switch (spec.kind) {
    case "every":
      return { ...base, kind: "every", minutes: spec.minutes };
    case "hourly":
      return { ...base, kind: "hourly", minute: spec.minute, tz: spec.tz };
    case "weekly":
      return { ...base, kind: "weekly", day: spec.day, at: spec.at, tz: spec.tz };
    default:
      return { ...base, kind: spec.kind, at: spec.at, tz: spec.tz };
  }
}

function specFrom(f: Form): unknown {
  switch (f.kind) {
    case "every":
      return { kind: "every", minutes: f.minutes };
    case "hourly":
      return { kind: "hourly", minute: f.minute, tz: f.tz };
    case "weekly":
      return { kind: "weekly", day: f.day, at: f.at, tz: f.tz };
    default:
      return { kind: f.kind, at: f.at, tz: f.tz };
  }
}

function minutesLabel(n: number): string {
  if (n === 1) return "minute";
  if (n % 60 === 0) return n === 60 ? "hour" : `${n / 60} hours`;
  return `${n} minutes`;
}

function whenText(iso: string, tz: string | undefined, viewer: string): string {
  const text = formatRunTime(new Date(iso), { tz });
  return tz && tz !== viewer ? `${text} (${tz.replace(/_/g, " ")} time)` : text;
}

/**
 * "When this runs" for one flow: when the app calls it, or on a plain-language
 * schedule (every few minutes, hourly, daily, weekdays, weekly) in a chosen
 * time zone. Shows the next run, and a Resume button after repeated failures.
 */
export function SchedulePicker({ projectId, flowId }: { projectId: string; flowId: string }) {
  const uid = useId();
  const [state, setState] = useState<State | null>(null);
  const [mode, setMode] = useState<Mode>("app");
  const [form, setForm] = useState<Form | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const viewerZone = useMemo(browserZone, []);
  const url = `/api/projects/${projectId}/flows/${flowId}/schedule`;

  const apply = useCallback(
    (s: State) => {
      setState(s);
      setMode(s.mode);
      setForm(formFrom(s.schedule, s.minMinutes, viewerZone));
    },
    [viewerZone],
  );

  useEffect(() => {
    let cancelled = false;
    fetch(url, { cache: "no-store" })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Couldn't load the schedule.");
        if (!cancelled) apply(data as State);
      })
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : "Couldn't load the schedule."));
    return () => {
      cancelled = true;
    };
  }, [url, apply]);

  const zones = useMemo(() => allZones([viewerZone, form?.tz ?? ""]), [viewerZone, form?.tz]);

  if (!state || !form) {
    return (
      <section className="card p-4 text-sm text-surface-400" aria-busy={!error}>
        {error ? <p role="alert" className="text-red-300">{error}</p> : <p className="flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Loading schedule…</p>}
      </section>
    );
  }

  const checked = validateSchedule(specFrom(form));
  const tooOften = form.kind === "every" && form.minutes < state.minMinutes;
  const dirty =
    mode !== state.mode ||
    (mode === "schedule" && (!state.schedule || !checked.ok || serializeSchedule(checked.spec) !== serializeSchedule(state.schedule)));
  const minuteChoices = [...new Set([...MINUTE_CHOICES, form.minutes])].sort((a, b) => a - b);

  async function send(body: unknown) {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch(url, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't save. Please try again.");
      apply(data as State);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  function save() {
    if (mode === "app") return send({ mode: "app" });
    if (!checked.ok) return setError(checked.error);
    if (tooOften) return setError(`This flow uses AI, so it can run at most every ${AI_MIN_MINUTES} minutes.`);
    return send({ mode: "schedule", schedule: checked.spec });
  }

  const set = (patch: Partial<Form>) => {
    setForm({ ...form, ...patch });
    setSaved(false);
  };

  // What the status line says about the saved schedule.
  const shownSpec = state.live.scheduled && state.pendingPublish ? state.live.schedule : state.schedule;
  let status: { tone: "ok" | "wait" | "warn" | "error"; text: React.ReactNode } | null = null;
  if (state.mode === "schedule") {
    if (!state.planAllows) status = { tone: "warn", text: `Your plan doesn't include scheduled flows, so this won't run. ${state.planHint ?? ""}`.trim() };
    else if (state.ownerBlocked) status = { tone: "warn", text: "This account is suspended, so scheduled runs are on hold." };
    else if (state.pausedReason === "failures") status = { tone: "error", text: `Paused after ${state.maxFailures} failed runs in a row. Check the flow's steps, then resume it.` };
    else if (state.pausedReason || state.unreadable) status = { tone: "error", text: "This schedule couldn't be read. Choose new times and save." };
    else if (!state.live.published) status = { tone: "wait", text: <>Saved. <Link href={`/projects/${projectId}/publish`} className="underline">Publish your app</Link> to start this schedule.</> };
    else if (!state.live.inLiveVersion) status = { tone: "wait", text: <>This flow isn&apos;t in the published app yet. <Link href={`/projects/${projectId}/publish`} className="underline">Publish your changes</Link> to start the schedule.</> };
    else if (state.pendingPublish) {
      status = {
        tone: "wait",
        text: (
          <>
            <Link href={`/projects/${projectId}/publish`} className="underline">Publish your changes</Link> to use this schedule.
            {state.live.schedule ? ` Until then it keeps the published schedule: ${describeSchedule(state.live.schedule)}.` : ""}
          </>
        ),
      };
    } else if (state.nextRunAt) status = { tone: "ok", text: `Next run ${whenText(state.nextRunAt, scheduleTimeZone(shownSpec), viewerZone)}` };
    else status = { tone: "wait", text: "Starting within a minute." };
  } else if (state.live.scheduled) {
    status = { tone: "wait", text: "Schedule turned off. It no longer runs on a schedule." };
  }
  const toneClass = { ok: "text-emerald-300", wait: "text-surface-300", warn: "text-amber-300", error: "text-red-300" };
  const last =
    state.mode === "schedule" && state.lastRunAt && state.lastStatus && state.lastStatus !== "running"
      ? `Last run ${whenText(state.lastRunAt, scheduleTimeZone(shownSpec), viewerZone)}: ${state.lastStatus === "ok" ? "worked" : state.lastStatus === "timeout" ? "took too long" : "didn't work"}.`
      : null;
  const failing =
    state.mode === "schedule" && !state.pausedReason && state.consecutiveFailures > 0
      ? `${state.consecutiveFailures} failed run${state.consecutiveFailures === 1 ? "" : "s"} in a row; it pauses after ${state.maxFailures}.`
      : null;

  return (
    <section className="card p-4" aria-labelledby={`${uid}-h`}>
      <h2 id={`${uid}-h`} className="flex items-center gap-2 text-sm font-semibold" data-help="Choose whether this automation runs when your app uses it, or by itself at set times, like every morning.">
        <CalendarClock size={16} className="text-brand-300" aria-hidden /> When this runs
      </h2>

      <fieldset className="mt-3 space-y-2 text-sm">
        <legend className="sr-only">When this runs</legend>
        <label className="flex cursor-pointer items-start gap-2" data-help="It runs only when something in your app starts it, like a visitor sending a form.">
          <input type="radio" name={`${uid}-mode`} className="mt-1" checked={mode === "app"} onChange={() => { setMode("app"); setSaved(false); }} />
          <span>
            When your app uses it
            <span className="block text-xs text-surface-400">A page, a form or another site starts it.</span>
          </span>
        </label>
        <label className={`flex items-start gap-2 ${state.planAllows ? "cursor-pointer" : "cursor-not-allowed opacity-60"}`} data-help="It runs by itself at the times you choose. The schedule starts once your app is published with it.">
          <input type="radio" name={`${uid}-mode`} className="mt-1" checked={mode === "schedule"} disabled={!state.planAllows && state.mode !== "schedule"} onChange={() => { setMode("schedule"); setSaved(false); }} />
          <span>
            On a schedule
            <span className="block text-xs text-surface-400">
              {state.planAllows ? "It runs by itself at the times you choose." : `Not included in your plan. ${state.planHint ?? ""}`.trim()}
            </span>
          </span>
        </label>
      </fieldset>

      {mode === "schedule" && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor={`${uid}-kind`}>How often</label>
            <select id={`${uid}-kind`} className="input" data-help="How often it runs. Pick a pattern, then the exact time next to it." value={form.kind} onChange={(e) => set({ kind: e.target.value as ScheduleKind })}>
              {KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
            </select>
          </div>
          {form.kind === "every" && (
            <div>
              <label className="label" htmlFor={`${uid}-minutes`}>Every</label>
              <select id={`${uid}-minutes`} className="input" data-help="The gap between runs. Some choices may be greyed out, for example when this automation uses the AI." value={form.minutes} onChange={(e) => set({ minutes: Number(e.target.value) })}>
                {minuteChoices.map((n) => <option key={n} value={n} disabled={n < state.minMinutes}>{minutesLabel(n)}</option>)}
              </select>
            </div>
          )}
          {form.kind === "hourly" && (
            <div>
              <label className="label" htmlFor={`${uid}-minute`}>Minutes past the hour</label>
              <select id={`${uid}-minute`} className="input" data-help="Which minute of each hour it runs at, like :15 for quarter past." value={form.minute} onChange={(e) => set({ minute: Number(e.target.value) })}>
                {[...new Set([...PAST_HOUR, form.minute])].sort((a, b) => a - b).map((m) => <option key={m} value={m}>{m === 0 ? "On the hour (:00)" : `:${String(m).padStart(2, "0")}`}</option>)}
              </select>
            </div>
          )}
          {form.kind === "weekly" && (
            <div>
              <label className="label" htmlFor={`${uid}-day`}>Day</label>
              <select id={`${uid}-day`} className="input" data-help="Which day of the week it runs." value={form.day} onChange={(e) => set({ day: Number(e.target.value) })}>
                {[1, 2, 3, 4, 5, 6, 0].map((d) => <option key={d} value={d}>{DAY_NAMES[d]}</option>)}
              </select>
            </div>
          )}
          {(form.kind === "daily" || form.kind === "weekdays" || form.kind === "weekly") && (
            <div>
              <label className="label" htmlFor={`${uid}-at`}>Time</label>
              <input id={`${uid}-at`} type="time" step={60} required className="input" data-help="The time of day it runs, by the clock of the time zone below." value={form.at} onChange={(e) => set({ at: e.target.value.slice(0, 5) })} />
            </div>
          )}
          {form.kind !== "every" && (
            <div className="sm:col-span-2">
              <label className="label" htmlFor={`${uid}-tz`}>Time zone</label>
              <select id={`${uid}-tz`} className="input" data-help="Whose clock the times follow. Pick where you or your customers are, so 9:00 means 9:00 there." value={form.tz} onChange={(e) => set({ tz: e.target.value })}>
                {zones.map((z) => <option key={z} value={z}>{z.replace(/_/g, " ")}{z === viewerZone ? " (yours)" : ""}</option>)}
              </select>
            </div>
          )}
          <p className="text-xs text-surface-400 sm:col-span-2">
            {checked.ok ? `${describeSchedule(checked.spec)}.` : checked.error}
            {state.usesAi ? ` Flows that use AI run at most every ${AI_MIN_MINUTES} minutes.` : ""}
          </p>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button type="button" className="btn-primary" disabled={busy || !dirty || (mode === "schedule" && (!checked.ok || tooOften || !state.planAllows))} onClick={save} data-help="Saves when this runs. A new or changed schedule takes effect once you publish your app.">
          {busy && <Loader2 size={14} className="animate-spin" />}
          {mode === "schedule" ? "Save schedule" : "Save"}
        </button>
        {state.mode === "schedule" && state.pausedReason === "failures" && (
          <button type="button" className="btn-ghost" disabled={busy} onClick={() => send({ resume: true })} data-help="Turns the schedule back on after it paused because runs kept failing. Fix the problem in its steps first.">
            <RotateCcw size={14} /> Resume
          </button>
        )}
      </div>

      <div role="status" aria-live="polite" className="mt-3 space-y-1 text-sm">
        {saved && !error && <p className="text-emerald-300">Saved.</p>}
        {status && <p className={toneClass[status.tone]}>{status.text}</p>}
        {last && <p className="text-xs text-surface-400">{last}</p>}
        {failing && <p className="text-xs text-amber-300">{failing}</p>}
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-red-300">{error}</p>}
    </section>
  );
}
