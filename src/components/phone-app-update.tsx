"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, Smartphone } from "lucide-react";

export type PhoneAppState = "offline" | "unused" | "updating" | "ready";

/**
 * "Phone app updated": after publishing, the phone app's screens are made
 * from the new version (src/lib/native/compile.ts scheduleNativeCompile);
 * this shows that happening and that installed apps update on their next
 * open. Words come in as props (the server translates them), so pages that
 * show this line don't need the Mobile app tab's messages.
 */
export function PhoneAppUpdate({
  projectId,
  initial,
  deploymentId,
  labels,
  className = "",
}: {
  projectId: string;
  initial: PhoneAppState;
  deploymentId: string | null;
  /** updated: shown once an update finished while watching; upToDate: when it already was. */
  labels: { updating: string; updated: string; upToDate: string; readyNote: string };
  className?: string;
}) {
  const [state, setState] = useState<PhoneAppState>(initial);
  const [dep, setDep] = useState(deploymentId);
  const [sawUpdate, setSawUpdate] = useState(initial === "updating");
  const [tick, setTick] = useState(0);

  // A new version (after Publish, the page refreshes with a new deployment).
  useEffect(() => {
    setState(initial);
    setDep(deploymentId);
    if (initial === "updating") setSawUpdate(true);
  }, [initial, deploymentId]);

  useEffect(() => {
    if (state !== "updating") return;
    const timer = window.setTimeout(async () => {
      const res = await fetch(`/api/projects/${projectId}/native/status`, { cache: "no-store" }).catch(() => null);
      const body = res?.ok ? ((await res.json().catch(() => null)) as { state?: PhoneAppState; deploymentId?: string | null } | null) : null;
      if (body?.state) {
        setState(body.state);
        setDep(body.deploymentId ?? null);
      }
      setTick((n) => n + 1);
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [state, dep, projectId, tick]);

  if (state !== "updating" && state !== "ready") return null;
  return (
    <p role="status" className={`flex items-start gap-2 text-sm ${state === "ready" ? "text-emerald-300" : "text-surface-300"} ${className}`}>
      {state === "updating" ? <Loader2 size={15} className="mt-0.5 shrink-0 animate-spin" aria-hidden /> : <Smartphone size={15} className="mt-0.5 shrink-0" aria-hidden />}
      <span>
        {state === "updating" ? (
          labels.updating
        ) : (
          <>
            <span className="inline-flex items-center gap-1 font-medium">
              {sawUpdate ? labels.updated : labels.upToDate}
              <Check size={14} aria-hidden />
            </span>{" "}
            <span className="text-surface-400">{labels.readyNote}</span>
          </>
        )}
      </span>
    </p>
  );
}
