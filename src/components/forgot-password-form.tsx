"use client";
import { useState } from "react";
import { authButton, authError, authInput, authLabel, authSuccess } from "./auth-styles";

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
    return <p role="status" className={`mt-6 ${authSuccess}`}>If an account exists for that email, a reset link is on its way. It works once and expires in 2 hours.</p>;
  }
  return (
    <form onSubmit={submit} className="mt-6 space-y-4">
      <div>
        <label className={authLabel} htmlFor="fp-email">Email</label>
        <input id="fp-email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
          className={authInput} />
      </div>
      {error && <div role="alert" className={authError}>{error}</div>}
      <button type="submit" disabled={busy} className={authButton}>{busy ? "Sending…" : "Send reset link"}</button>
    </form>
  );
}
