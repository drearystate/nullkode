"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Danger-zone card on the project overview: hand the whole project to
 * another registered user. Two-step (type email, then explicit confirm)
 * because the action is irreversible from this side — after transfer the
 * current owner loses access entirely.
 */
export function TransferProjectCard({
  projectId,
  projectName,
}: {
  projectId: string;
  projectName: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function transfer() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/transfer`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? `Error ${res.status}`);
        setConfirming(false);
        return;
      }
      // The project is no longer ours — the overview page would 404.
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Network error — try again.");
      setConfirming(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-6 border-red-900/40">
      <h2 className="font-semibold text-red-300">Transfer ownership</h2>
      <p className="mt-2 text-sm text-surface-400">
        Hand this entire project — pages, flows, data, domains, and the
        published site — to another account on this site. You will lose access to
        it. This cannot be undone from your side.
      </p>

      {!confirming ? (
        <div className="mt-4 flex gap-2">
          <input
            type="email"
            className="input flex-1 text-sm"
            placeholder="new-owner@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={busy}
          />
          <button
            className="rounded-lg border border-red-800 text-red-300 hover:bg-red-950/40 px-4 py-2 text-sm font-medium transition disabled:opacity-50"
            disabled={busy || !email.includes("@")}
            onClick={() => {
              setError(null);
              setConfirming(true);
            }}
          >
            Transfer
          </button>
        </div>
      ) : (
        <div className="mt-4 rounded-lg border border-red-800 bg-red-950/30 p-4">
          <p className="text-sm text-red-200">
            Transfer <span className="font-semibold">{projectName}</span> to{" "}
            <span className="font-mono">{email.trim()}</span>? You will lose
            access immediately.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              className="rounded-lg bg-red-700 hover:bg-red-600 text-white px-4 py-2 text-sm font-semibold transition disabled:opacity-50"
              onClick={transfer}
              disabled={busy}
            >
              {busy ? "Transferring…" : "Yes, transfer it"}
            </button>
            <button
              className="rounded-lg border border-surface-700 text-surface-300 hover:bg-surface-800 px-4 py-2 text-sm transition"
              onClick={() => setConfirming(false)}
              disabled={busy}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
    </div>
  );
}
