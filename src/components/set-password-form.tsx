"use client";
import { useState } from "react";
import { authButton, authError, authInput, authLabel } from "./auth-styles";

export function SetPasswordForm({ token, askName }: { token: string; askName: boolean }) {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputCls = authInput;
  const labelCls = authLabel;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) return setError("The two passwords don't match.");
    setBusy(true);
    try {
      const res = await fetch("/api/auth/set-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, password, ...(askName && name.trim() ? { name: name.trim() } : {}) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't save your password. Please try again.");
      window.location.href = typeof data.next === "string" && data.next.startsWith("/") ? data.next : "/dashboard";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save your password.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-4">
      {askName && (
        <div>
          <label className={labelCls} htmlFor="sp-name">Your name</label>
          <input id="sp-name" className={inputCls} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
        </div>
      )}
      <div>
        <label className={labelCls} htmlFor="sp-password">New password</label>
        <input id="sp-password" className={inputCls} type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" />
      </div>
      <div>
        <label className={labelCls} htmlFor="sp-confirm">Repeat password</label>
        <input id="sp-confirm" className={inputCls} type="password" autoComplete="new-password" required minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </div>
      {error && <div role="alert" className={authError}>{error}</div>}
      <button type="submit" disabled={busy} className={authButton}>{busy ? "Saving…" : "Save password and continue"}</button>
    </form>
  );
}
