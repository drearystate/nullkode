"use client";
import { useState } from "react";

/**
 * Turns a flow on or pauses it. /api/run and the scheduler both read the
 * saved setting, so it applies to the live app at once, without a publish.
 */
export function FlowEnabledSwitch({
  projectId,
  flowId,
  enabled,
  scheduled = false,
  onChange,
}: {
  projectId: string;
  flowId: string;
  enabled: boolean;
  scheduled?: boolean;
  onChange?: (enabled: boolean) => void;
}) {
  const [on, setOn] = useState(enabled);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function toggle() {
    const next = !on;
    setBusy(true);
    setFailed(false);
    setOn(next);
    try {
      const res = await fetch(`/api/projects/${projectId}/flows/${flowId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ enabled: next }),
      });
      if (!res.ok) throw new Error(String(res.status));
      onChange?.(next);
    } catch {
      setOn(!next);
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  const help = scheduled
    ? "When paused, its scheduled runs stop and anything in your app that uses it gets an error instead. It applies straight away; no need to publish."
    : "When paused, nothing runs and anything in your app that uses it, like a form, gets an error instead. It applies to your live app straight away, with no need to publish.";

  return (
    <span className="inline-flex items-center gap-2" data-help={help}>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label="Run this automation"
        disabled={busy}
        onClick={toggle}
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition disabled:opacity-60 ${on ? "border-brand-400 bg-brand-500" : "border-surface-600 bg-surface-800"}`}
      >
        <span className={`inline-block h-3.5 w-3.5 rounded-full bg-fixed-white shadow transition ${on ? "translate-x-[18px]" : "translate-x-0.5"}`} />
      </button>
      <span className={`text-xs ${on ? "text-surface-200" : "text-amber-200"}`} aria-hidden>
        {on ? "On" : "Paused"}
      </span>
      {failed && <span className="text-xs text-red-300" role="alert">Couldn’t change it. Try again.</span>}
    </span>
  );
}
