"use client";
import { useState } from "react";

type Props = {
  adminEmail: string;
  targetEmail: string;
  targetName?: string | null;
  /** "RESELLER" when a reseller is helping one of its clients. */
  actorRole?: string;
};

export function ImpersonationBanner({ adminEmail, targetEmail, targetName, actorRole }: Props) {
  const [busy, setBusy] = useState(false);
  const reseller = actorRole === "RESELLER";

  async function stop() {
    setBusy(true);
    await fetch("/api/admin/stop-impersonating", { method: "POST" });
    window.location.href = reseller ? "/reseller/clients" : "/admin";
  }

  return (
    <div className="bg-amber-500 text-surface-950 text-sm [[data-theme=light]_&]:text-surface-0">
      <div className="mx-auto max-w-6xl px-6 py-2 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 truncate">
          {reseller ? (
            <span className="truncate">You&apos;re viewing <span className="font-semibold">{targetName || targetEmail}</span>&apos;s workspace. Changes you make happen in their account.</span>
          ) : (
            <>
              <span className="font-semibold">Impersonating</span>
              <span className="font-mono truncate">{targetEmail}</span>
              <span className="opacity-70 hidden md:inline">· signed in as {adminEmail}</span>
            </>
          )}
        </div>
        <button
          onClick={stop}
          disabled={busy}
          data-help={reseller ? "Leaves this client's workspace and takes you back to your client list. Changes you made stay in their account." : "Stops acting as this person and takes you back to Admin. Changes you made stay in their account."}
          className="shrink-0 bg-surface-950 text-amber-400 font-semibold rounded px-3 py-1 hover:bg-surface-800 [[data-theme=light]_&]:bg-surface-0 [[data-theme=light]_&]:text-amber-600 [[data-theme=light]_&]:hover:bg-surface-100 disabled:opacity-50"
        >
          {busy ? "…" : reseller ? "Back to your clients" : "Stop impersonating"}
        </button>
      </div>
    </div>
  );
}
