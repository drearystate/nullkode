"use client";
import { useState } from "react";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/auth/forgot", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email }) });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(data.error || "Something went wrong. Please try again.");
    setSent(true);
  }

  if (sent) {
    return <p role="status" className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-800">If an account exists for that email, a reset link is on its way. It works once and expires in 2 hours.</p>;
  }
  return (
    <form onSubmit={submit} className="mt-6 space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-surface-700" htmlFor="fp-email">Email</label>
        <input id="fp-email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
          className="w-full rounded-lg border border-surface-300 bg-white px-3 py-2 text-surface-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
      </div>
      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      <button type="submit" disabled={busy} className="btn-primary w-full disabled:opacity-50">{busy ? "Sending…" : "Send reset link"}</button>
    </form>
  );
}
