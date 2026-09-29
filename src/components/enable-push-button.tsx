"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

/** Adds the push notifications feature to the app in one click. */
export function EnablePushButton({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function enable() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/projects/${projectId}/modules`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ moduleId: "push-notifications" }) });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(data.error || "Couldn't turn notifications on. Please try again.");
    router.refresh();
  }
  return (
    <div className="mt-4">
      <button type="button" className="btn-primary" onClick={enable} disabled={busy}>{busy ? "Turning on…" : "Turn on notifications"}</button>
      {error && <p role="alert" className="mt-2 text-sm text-red-300">{error}</p>}
    </div>
  );
}
