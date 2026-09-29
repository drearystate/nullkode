"use client";
import { useEffect, useState } from "react";
import { ExternalLink, KeyRound } from "lucide-react";

type State = { hasSignIn: boolean; admins: string[]; adminPages: Array<{ slug: string; title: string }>; published: boolean };

/**
 * The app's admin area: the owner opens its team-only pages with one click
 * (no account needed), and can give other people an admin login.
 */
export function AppAdminCard({ projectId }: { projectId: string }) {
  const [state, setState] = useState<State | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    fetch(`/api/projects/${projectId}/app-admin`).then((r) => r.json()).then(setState).catch(() => setState(null));
  }, [projectId]);

  if (!state || (!state.hasSignIn && state.adminPages.length === 0)) return null;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const res = await fetch(`/api/projects/${projectId}/app-admin`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password }) });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setMessage({ ok: false, text: data.error || "Couldn't save the admin login." });
    setState((s) => (s ? { ...s, admins: data.admins ?? [] } : s));
    setPassword("");
    setMessage({ ok: true, text: data.result === "updated" ? "Saved. That account is an admin now, with the new password." : "Saved. They can sign in to your app with this email and password." });
  }

  const open = (slug: string) => `/api/projects/${projectId}/open-as-owner?page=${encodeURIComponent(slug)}`;

  return (
    <section id="app-admin" className="card mt-6 scroll-mt-24 p-6" aria-labelledby="app-admin-heading">
      <h2 id="app-admin-heading" className="flex items-center gap-2 font-semibold"><KeyRound size={17} className="text-brand-300" aria-hidden />Your app&apos;s admin area</h2>
      {state.adminPages.length > 0 && (
        <>
          <p className="mt-1 text-sm text-surface-400">These pages are only for you and your team, so visitors can&apos;t see them. You can open them any time without signing in to your app.</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {state.adminPages.map((p) => (
              <li key={p.slug}>
                <a href={open(p.slug)} target="_blank" rel="noopener" className="btn-ghost text-sm"><ExternalLink size={14} aria-hidden />{p.title}</a>
              </li>
            ))}
          </ul>
          {!state.published && <p className="mt-2 text-xs text-surface-500">Your app isn&apos;t published yet, so these open in Preview.</p>}
        </>
      )}
      {state.hasSignIn && (
        <div className={state.adminPages.length ? "mt-6 border-t border-white/[0.06] pt-5" : "mt-1"}>
          <h3 className="text-sm font-semibold">Admin logins for your team</h3>
          <p className="mt-1 text-sm text-surface-400">Give someone an admin login and they can sign in on your app&apos;s sign-in page to manage it.</p>
          {state.admins.length > 0 && <p className="mt-3 text-sm">Admins: <span className="text-surface-200">{state.admins.join(", ")}</span></p>}
          <form onSubmit={save} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <label className="block text-sm"><span className="label">Email</span><input className="input w-full" type="email" autoComplete="off" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
            <label className="block text-sm"><span className="label">Password</span><input className="input w-full" type="password" autoComplete="new-password" minLength={10} required value={password} onChange={(e) => setPassword(e.target.value)} /></label>
            <button className="btn-primary" disabled={busy}>{busy ? "Saving…" : "Add admin"}</button>
          </form>
          <p className="mt-2 text-xs text-surface-500">At least 10 characters. Using an email that already has an account in your app makes that account an admin and changes its password.</p>
          {message && <p role={message.ok ? "status" : "alert"} className={`mt-2 text-sm ${message.ok ? "text-emerald-300" : "text-red-300"}`}>{message.text}</p>}
        </div>
      )}
    </section>
  );
}
