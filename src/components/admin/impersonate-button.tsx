"use client";
import { useState } from "react";

export function ImpersonateButton({
  userId,
  email,
  label = "Impersonate",
  redirectTo = "/dashboard",
}: {
  userId: string;
  email: string;
  label?: string;
  redirectTo?: string;
}) {
  const [busy, setBusy] = useState(false);

  async function go() {
    if (!confirm(`Impersonate ${email}? Everything you do will happen as them.`)) return;
    setBusy(true);
    const res = await fetch("/api/admin/impersonate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (res.ok) {
      window.location.href = redirectTo;
    } else {
      setBusy(false);
      alert("Failed to impersonate");
    }
  }

  return (
    <button className="btn-ghost text-xs px-3 py-1" disabled={busy} onClick={go} data-help="See the studio exactly as this person does, to help them. Anything you change happens in their account. Use the bar at the top of the page to switch back.">
      {busy ? "..." : label}
    </button>
  );
}
