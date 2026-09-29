"use client";
import { useState } from "react";
import Link from "next/link";
import { setHelpTips, useHelpTipsOn } from "./help-tips";

type Status = { kind: "ok" | "error"; text: string } | null;

function Note({ status }: { status: Status }) {
  if (!status) return null;
  return (
    <p role={status.kind === "error" ? "alert" : "status"} className={`mt-3 text-sm ${status.kind === "error" ? "text-red-400" : "text-emerald-400"}`}>
      {status.text}
    </p>
  );
}

export function ProfileCard({ name: initialName, email, readOnly }: { name: string; email: string; readOnly: boolean }) {
  const [name, setName] = useState(initialName);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setStatus(null);
    const res = await fetch("/api/me/profile", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ name }) }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    setBusy(false);
    setStatus(res?.ok ? { kind: "ok", text: "Saved." } : { kind: "error", text: data?.error || "Couldn't save. Please try again." });
  }
  return (
    <section aria-labelledby="profile-heading" className="card p-6">
      <h2 id="profile-heading" className="font-semibold">Your details</h2>
      <form onSubmit={save} className="mt-4 grid max-w-md gap-4">
        <div>
          <label htmlFor="account-name" className="label">Name</label>
          <input id="account-name" className="input" value={name} maxLength={100} onChange={(e) => setName(e.target.value)} disabled={readOnly} data-help="The name shown on your account and in emails we send you." />
        </div>
        <div>
          <label htmlFor="account-email" className="label">Email</label>
          <input id="account-email" className="input" value={email} readOnly disabled />
          <p className="mt-1 text-xs text-surface-500">You sign in with this address.</p>
        </div>
        {!readOnly && (
          <div>
            <button className="btn-primary" disabled={busy || !name.trim() || name.trim() === initialName}>{busy ? "Saving…" : "Save"}</button>
          </div>
        )}
      </form>
      <Note status={status} />
    </section>
  );
}

export function PasswordCard({ readOnly }: { readOnly: boolean }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setStatus(null);
    const res = await fetch("/api/me/password", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ current, next }) }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    setBusy(false);
    if (res?.ok) {
      setCurrent("");
      setNext("");
      setStatus({ kind: "ok", text: "Password changed. Your other devices have been signed out." });
    } else {
      setStatus({ kind: "error", text: data?.error || "Couldn't change it. Please try again." });
    }
  }
  return (
    <section aria-labelledby="password-heading" className="card p-6">
      <h2 id="password-heading" className="font-semibold">Password</h2>
      {readOnly ? (
        <p className="mt-2 text-sm text-surface-400">Only the person who owns this account can change its password.</p>
      ) : (
        <>
          <form onSubmit={save} className="mt-4 grid max-w-md gap-4">
            <div>
              <label htmlFor="current-password" className="label">Current password</label>
              <input id="current-password" type="password" autoComplete="current-password" className="input" value={current} onChange={(e) => setCurrent(e.target.value)} />
            </div>
            <div>
              <label htmlFor="new-password" className="label">New password</label>
              <input id="new-password" type="password" autoComplete="new-password" minLength={8} className="input" value={next} onChange={(e) => setNext(e.target.value)} />
              <p className="mt-1 text-xs text-surface-500">At least 8 characters. Changing it signs you out everywhere else.</p>
            </div>
            <div>
              <button className="btn-primary" disabled={busy || !current || next.length < 8}>{busy ? "Changing…" : "Change password"}</button>
            </div>
          </form>
          <p className="mt-4 text-xs text-surface-500">
            Don't know your current password (for example, you signed up with Google)? Sign out and use <Link href="/forgot-password" className="text-brand-300 hover:underline">Forgot password</Link> to set one.
          </p>
        </>
      )}
      <Note status={status} />
    </section>
  );
}

export function HelpPrefsCard({ initialOn }: { initialOn: boolean }) {
  const on = useHelpTipsOn(initialOn);
  const [status, setStatus] = useState<Status>(null);
  async function toggle() {
    setStatus(null);
    const saved = await setHelpTips(!on);
    if (!saved) setStatus({ kind: "error", text: "Couldn't save that. It will go back the next time you open a page." });
  }
  return (
    <section aria-labelledby="help-prefs-heading" className="card p-6">
      <h2 id="help-prefs-heading" className="font-semibold">Help</h2>
      <div className="mt-4 flex items-start justify-between gap-6">
        <div>
          <p id="help-tips-label" className="text-sm font-medium text-surface-100">Help tips</p>
          <p className="mt-1 max-w-xl text-sm text-surface-400">Short notes that appear when you hold your mouse over a button or setting, explaining what it does in plain words.</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-labelledby="help-tips-label"
          onClick={() => void toggle()}
          className={`relative mt-1 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${on ? "bg-brand-500" : "bg-white/15"}`}
        >
          <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${on ? "translate-x-5" : "translate-x-0.5"}`} />
        </button>
      </div>
      <p className="mt-4 text-sm text-surface-400">
        Step-by-step guides for everything are in <Link href="/help" className="text-brand-300 hover:underline">Help &amp; guides</Link>.
      </p>
      <Note status={status} />
    </section>
  );
}
