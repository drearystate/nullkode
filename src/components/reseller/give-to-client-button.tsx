"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Gift } from "lucide-react";

export type ClientChoice = { id: string; label: string };

/**
 * "Give to client" on /reseller/apps, for apps the reseller owns: pick one of
 * your clients and move the app into their workspace. It then shows on their
 * dashboard, and you can still open it through "Open".
 */
export function GiveToClientButton({
  projectId,
  projectName,
  clients,
}: {
  projectId: string;
  projectName: string;
  clients: ClientChoice[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [clientId, setClientId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (clients.length === 0) return null;
  const chosen = clients.find((c) => c.id === clientId);

  async function give() {
    if (!chosen) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/reseller/apps/${projectId}/give`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ clientId: chosen.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Couldn't give the app away. Please try again.");
        return;
      }
      setOpen(false);
      router.refresh();
    } catch {
      setError("Network error — try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button type="button" className="btn-ghost text-xs" onClick={() => setOpen(true)} data-help="Moves this app into one of your clients' accounts. It shows on their dashboard and counts toward their plan; you can still open it for them.">
        <Gift size={14} aria-hidden /> Give to client
      </button>
    );
  }

  return (
    <div className="mt-2 flex flex-col items-end gap-2 text-left">
      <label className="flex w-full max-w-xs flex-col text-xs text-surface-400">
        <span className="mb-1">Give &quot;{projectName}&quot; to</span>
        <select className="input py-1 text-sm" value={clientId} onChange={(e) => setClientId(e.target.value)} disabled={busy} autoFocus>
          <option value="">Choose a client…</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>
      </label>
      {chosen && (
        <p className="max-w-xs text-xs text-surface-400">
          The app moves to {chosen.label}&apos;s workspace and shows on their dashboard. You can still open it for them.
        </p>
      )}
      <div className="flex gap-2">
        <button type="button" className="btn-primary text-xs" onClick={give} disabled={busy || !chosen}>
          {busy ? "Giving…" : "Give app"}
        </button>
        <button type="button" className="btn-ghost text-xs" onClick={() => { setOpen(false); setError(null); }} disabled={busy}>
          Cancel
        </button>
      </div>
      {error && <p role="alert" className="max-w-xs text-xs text-red-300">{error}</p>}
    </div>
  );
}
