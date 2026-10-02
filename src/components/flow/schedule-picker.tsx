"use client";
import Link from "next/link";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { CalendarClock, Loader2, RotateCcw } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import {
  AI_MIN_MINUTES,
  isValidTimeZone,
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

// Labels: flows.schedule.kinds.<kind>.
const KINDS: ScheduleKind[] = ["every", "hourly", "daily", "weekdays", "weekly"];
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

type T = ReturnType<typeof useTranslations<"flows.schedule">>;
type Formatter = ReturnType<typeof useFormatter>;

function minutesLabel(n: number, t: T): string {
  if (n === 1) return t("minute");
  if (n % 60 === 0) return n === 60 ? t("hour") : t("hours", { count: n / 60 });
  return t("minutes", { count: n });
}

/** "Tue 09:00", or "Tue 7 Oct, 09:00" when it's more than six days away, in `tz`. */
function runTime(when: Date, tz: string, format: Formatter): string {
  const far = Math.abs(when.getTime() - Date.now()) > 6 * 86_400_000;
  return format.dateTime(when, {
    timeZone: tz,
    weekday: "short",
    ...(far ? { day: "numeric", month: "short" } : {}),
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
}

function whenText(iso: string, tz: string | undefined, viewer: string, t: T, format: Formatter): string {
  const zone = tz && isValidTimeZone(tz) ? tz : viewer;
  const text = runTime(new Date(iso), zone, format);
  return tz && tz !== viewer ? t("inZone", { time: text, zone: tz.replace(/_/g, " ") }) : text;
}

/** A weekday's name (0 = Sunday) in the studio's language. */
function dayName(day: number, format: Formatter): string {
  // 4 January 2026 was a Sunday.
  return format.dateTime(new Date(Date.UTC(2026, 0, 4 + day, 12)), { weekday: "long", timeZone: "UTC" });
}

/** "Every day at 09:00 (Europe/London time)". */
function describe(spec: ScheduleSpec, t: T, format: Formatter): string {
  const zone = (tz: string) => (tz === "UTC" || tz === "Etc/UTC" ? t("describe.utc") : t("describe.zoneTime", { zone: tz.replace(/_/g, " ") }));
  switch (spec.kind) {
    case "every":
      if (spec.minutes === 1) return t("describe.everyMinute");
      if (spec.minutes % 60 === 0) return spec.minutes === 60 ? t("describe.everyHour") : t("describe.everyHours", { count: spec.minutes / 60 });
      return t("describe.everyMinutes", { count: spec.minutes });
    case "hourly":
      return spec.minute === 0 ? t("describe.hourlyFull", { zone: zone(spec.tz) }) : t("describe.hourlyPast", { minute: spec.minute, zone: zone(spec.tz) });
    case "daily":
      return t("describe.daily", { time: spec.at, zone: zone(spec.tz) });
    case "weekdays":
      return t("describe.weekdays", { time: spec.at, zone: zone(spec.tz) });
    case "weekly":
      return t("describe.weekly", { day: dayName(spec.day, format), time: spec.at, zone: zone(spec.tz) });
  }
}

/**
 * "When this runs" for one flow: when the app calls it, or on a plain-language
 * schedule (every few minutes, hourly, daily, weekdays, weekly) in a chosen
 * time zone. Shows the next run, and a Resume button after repeated failures.
 */
export function SchedulePicker({ projectId, flowId }: { projectId: string; flowId: string }) {
  const uid = useId();
  const t = useTranslations("flows.schedule");
  const tc = useTranslations("common");
  const format = useFormatter();
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
        if (!res.ok) throw new Error(data.error || t("loadError"));
        if (!cancelled) apply(data as State);
      })
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : t("loadError")));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, apply]);

  const zones = useMemo(() => allZones([viewerZone, form?.tz ?? ""]), [viewerZone, form?.tz]);

  if (!state || !form) {
    return (
      <section className="card p-4 text-sm text-surface-400" aria-busy={!error}>
        {error ? <p role="alert" className="text-red-300">{error}</p> : <p className="flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> {t("loading")}</p>}
      </section>
    );
  }

  const checked = validateSchedule(specFrom(form));
  const problemText = checked.ok ? "" : t(`problems.${checked.code}`, checked.values);
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
      if (!res.ok) throw new Error(data.error || t("saveError"));
      apply(data as State);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("connection"));
    } finally {
      setBusy(false);
    }
  }

  function save() {
    if (mode === "app") return send({ mode: "app" });
    if (!checked.ok) return setError(problemText);
    if (tooOften) return setError(t("aiTooOften", { minutes: AI_MIN_MINUTES }));
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
    const publishLink = (c: React.ReactNode) => <Link href={`/projects/${projectId}/publish`} className="underline">{c}</Link>;
    if (!state.planAllows) status = { tone: "warn", text: `${t("noPlan")} ${state.planHint ?? ""}`.trim() };
    else if (state.ownerBlocked) status = { tone: "warn", text: t("suspended") };
    else if (state.pausedReason === "failures") status = { tone: "error", text: t("pausedFailures", { count: state.maxFailures }) };
    else if (state.pausedReason || state.unreadable) status = { tone: "error", text: t("unreadable") };
    else if (!state.live.published) status = { tone: "wait", text: t.rich("notPublished", { link: publishLink }) };
    else if (!state.live.inLiveVersion) status = { tone: "wait", text: t.rich("notInLive", { link: publishLink }) };
    else if (state.pendingPublish) {
      status = {
        tone: "wait",
        text: (
          <>
            {t.rich("pending", { link: publishLink })}
            {state.live.schedule ? ` ${t("pendingUntil", { schedule: describe(state.live.schedule, t, format) })}` : ""}
          </>
        ),
      };
    } else if (state.nextRunAt) status = { tone: "ok", text: t("nextRun", { when: whenText(state.nextRunAt, scheduleTimeZone(shownSpec), viewerZone, t, format) }) };
    else status = { tone: "wait", text: t("starting") };
  } else if (state.live.scheduled) {
    status = { tone: "wait", text: t("turnedOff") };
  }
  const toneClass = { ok: "text-emerald-300", wait: "text-surface-300", warn: "text-amber-300", error: "text-red-300" };
  const last =
    state.mode === "schedule" && state.lastRunAt && state.lastStatus && state.lastStatus !== "running"
      ? t(state.lastStatus === "ok" ? "lastOk" : state.lastStatus === "timeout" ? "lastTimeout" : "lastFailed", {
          when: whenText(state.lastRunAt, scheduleTimeZone(shownSpec), viewerZone, t, format),
        })
      : null;
  const failing =
    state.mode === "schedule" && !state.pausedReason && state.consecutiveFailures > 0
      ? t("failing", { count: state.consecutiveFailures, max: state.maxFailures })
      : null;

  return (
    <section className="card p-4" aria-labelledby={`${uid}-h`}>
      <h2 id={`${uid}-h`} className="flex items-center gap-2 text-sm font-semibold" data-help={t("titleHelp")}>
        <CalendarClock size={16} className="text-brand-300" aria-hidden /> {t("title")}
      </h2>

      <fieldset className="mt-3 space-y-2 text-sm">
        <legend className="sr-only">{t("title")}</legend>
        <label className="flex cursor-pointer items-start gap-2" data-help={t("appModeHelp")}>
          <input type="radio" name={`${uid}-mode`} className="mt-1" checked={mode === "app"} onChange={() => { setMode("app"); setSaved(false); }} />
          <span>
            {t("appMode")}
            <span className="block text-xs text-surface-400">{t("appModeBody")}</span>
          </span>
        </label>
        <label className={`flex items-start gap-2 ${state.planAllows ? "cursor-pointer" : "cursor-not-allowed opacity-60"}`} data-help={t("scheduleModeHelp")}>
          <input type="radio" name={`${uid}-mode`} className="mt-1" checked={mode === "schedule"} disabled={!state.planAllows && state.mode !== "schedule"} onChange={() => { setMode("schedule"); setSaved(false); }} />
          <span>
            {t("scheduleMode")}
            <span className="block text-xs text-surface-400">
              {state.planAllows ? t("scheduleModeBody") : `${t("notInPlan")} ${state.planHint ?? ""}`.trim()}
            </span>
          </span>
        </label>
      </fieldset>

      {mode === "schedule" && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor={`${uid}-kind`}>{t("howOften")}</label>
            <select id={`${uid}-kind`} className="input" data-help={t("howOftenHelp")} value={form.kind} onChange={(e) => set({ kind: e.target.value as ScheduleKind })}>
              {KINDS.map((k) => <option key={k} value={k}>{t(`kinds.${k}`)}</option>)}
            </select>
          </div>
          {form.kind === "every" && (
            <div>
              <label className="label" htmlFor={`${uid}-minutes`}>{t("every")}</label>
              <select id={`${uid}-minutes`} className="input" data-help={t("everyHelp")} value={form.minutes} onChange={(e) => set({ minutes: Number(e.target.value) })}>
                {minuteChoices.map((n) => <option key={n} value={n} disabled={n < state.minMinutes}>{minutesLabel(n, t)}</option>)}
              </select>
            </div>
          )}
          {form.kind === "hourly" && (
            <div>
              <label className="label" htmlFor={`${uid}-minute`}>{t("pastHour")}</label>
              <select id={`${uid}-minute`} className="input" data-help={t("pastHourHelp")} value={form.minute} onChange={(e) => set({ minute: Number(e.target.value) })}>
                {[...new Set([...PAST_HOUR, form.minute])].sort((a, b) => a - b).map((m) => <option key={m} value={m}>{m === 0 ? t("onTheHour") : `:${String(m).padStart(2, "0")}`}</option>)}
              </select>
            </div>
          )}
          {form.kind === "weekly" && (
            <div>
              <label className="label" htmlFor={`${uid}-day`}>{t("day")}</label>
              <select id={`${uid}-day`} className="input" data-help={t("dayHelp")} value={form.day} onChange={(e) => set({ day: Number(e.target.value) })}>
                {[1, 2, 3, 4, 5, 6, 0].map((d) => <option key={d} value={d}>{dayName(d, format)}</option>)}
              </select>
            </div>
          )}
          {(form.kind === "daily" || form.kind === "weekdays" || form.kind === "weekly") && (
            <div>
              <label className="label" htmlFor={`${uid}-at`}>{t("time")}</label>
              <input id={`${uid}-at`} type="time" step={60} required className="input" data-help={t("timeHelp")} value={form.at} onChange={(e) => set({ at: e.target.value.slice(0, 5) })} />
            </div>
          )}
          {form.kind !== "every" && (
            <div className="sm:col-span-2">
              <label className="label" htmlFor={`${uid}-tz`}>{t("timeZone")}</label>
              <select id={`${uid}-tz`} className="input" data-help={t("timeZoneHelp")} value={form.tz} onChange={(e) => set({ tz: e.target.value })}>
                {zones.map((z) => <option key={z} value={z}>{z === viewerZone ? t("yours", { zone: z.replace(/_/g, " ") }) : z.replace(/_/g, " ")}</option>)}
              </select>
            </div>
          )}
          <p className="text-xs text-surface-400 sm:col-span-2">
            {checked.ok ? `${describe(checked.spec, t, format)}.` : problemText}
            {state.usesAi ? ` ${t("aiNote", { minutes: AI_MIN_MINUTES })}` : ""}
          </p>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button type="button" className="btn-primary" disabled={busy || !dirty || (mode === "schedule" && (!checked.ok || tooOften || !state.planAllows))} onClick={save} data-help={t("saveHelp")}>
          {busy && <Loader2 size={14} className="animate-spin" />}
          {mode === "schedule" ? t("saveSchedule") : tc("save")}
        </button>
        {state.mode === "schedule" && state.pausedReason === "failures" && (
          <button type="button" className="btn-ghost" disabled={busy} onClick={() => send({ resume: true })} data-help={t("resumeHelp")}>
            <RotateCcw size={14} /> {t("resume")}
          </button>
        )}
      </div>

      <div role="status" aria-live="polite" className="mt-3 space-y-1 text-sm">
        {saved && !error && <p className="text-emerald-300">{tc("saved")}</p>}
        {status && <p className={toneClass[status.tone]}>{status.text}</p>}
        {last && <p className="text-xs text-surface-400">{last}</p>}
        {failing && <p className="text-xs text-amber-300">{failing}</p>}
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-red-300">{error}</p>}
    </section>
  );
}
