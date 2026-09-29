"use client";
import { useState } from "react";

/** Opens an app in the editor — through the client's workspace when it's theirs. */
export function OpenAppButton({ projectId, ownerId }: { projectId: string; ownerId: string | null }) {
  const [busy, setBusy] = useState(false);
  async function open() {
    setBusy(true);
    if (ownerId) {
      const res = await fetch(`/api/reseller/clients/${ownerId}/impersonate`, { method: "POST" });
      if (!res.ok) {
        setBusy(false);
        alert("Couldn't open this client's workspace.");
        return;
      }
    }
    window.location.href = `/projects/${projectId}`;
  }
  return <button type="button" className="btn-ghost text-xs" onClick={open} disabled={busy} data-help={ownerId ? "Opens this app in the editor inside your client's workspace, so any change you make happens in their account." : "Opens this app in the editor."}>{busy ? "Opening…" : "Open"}</button>;
}
