"use client";
import { useEffect, useState } from "react";
import { ExternalLink, KeyRound } from "lucide-react";
import { useTranslations } from "next-intl";

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
  const t = useTranslations("project.appAdminCard");
  const tc = useTranslations("common");

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
    if (!res.ok) return setMessage({ ok: false, text: data.error || t("saveFailed") });
    setState((s) => (s ? { ...s, admins: data.admins ?? [] } : s));
    setPassword("");
    setMessage({ ok: true, text: data.result === "updated" ? t("savedUpdated") : t("savedCreated") });
  }

  const open = (slug: string) => `/api/projects/${projectId}/open-as-owner?page=${encodeURIComponent(slug)}`;

  return (
    <section id="app-admin" className="card mt-6 scroll-mt-24 p-6" aria-labelledby="app-admin-heading">
      <h2 id="app-admin-heading" className="flex items-center gap-2 font-semibold" data-help={t("titleHelp")}><KeyRound size={17} className="text-brand-300" aria-hidden />{t("title")}</h2>
      {state.adminPages.length > 0 && (
        <>
          <p className="mt-1 text-sm text-surface-400">{t("pagesIntro")}</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {state.adminPages.map((p) => (
              <li key={p.slug}>
                <a href={open(p.slug)} target="_blank" rel="noopener" className="btn-ghost text-sm" data-help={t("openHelp")}><ExternalLink size={14} aria-hidden />{p.title}</a>
              </li>
            ))}
          </ul>
          {!state.published && <p className="mt-2 text-xs text-surface-500">{t("notPublished")}</p>}
        </>
      )}
      {state.hasSignIn && (
        <div className={state.adminPages.length ? "mt-6 border-t border-white/[0.06] pt-5" : "mt-1"}>
          <h3 className="text-sm font-semibold">{t("loginsTitle")}</h3>
          <p className="mt-1 text-sm text-surface-400">{t("loginsIntro")}</p>
          {state.admins.length > 0 && <p className="mt-3 text-sm">{t.rich("admins", { admins: state.admins.join(", "), list: (c) => <span className="text-surface-200" dir="ltr">{c}</span> })}</p>}
          <form onSubmit={save} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <label className="block text-sm"><span className="label">{t("email")}</span><input className="input w-full" type="email" autoComplete="off" required value={email} onChange={(e) => setEmail(e.target.value)} data-help={t("emailHelp")} /></label>
            <label className="block text-sm"><span className="label">{t("password")}</span><input className="input w-full" type="password" autoComplete="new-password" minLength={10} required value={password} onChange={(e) => setPassword(e.target.value)} data-help={t("passwordHelp")} /></label>
            <button className="btn-primary" disabled={busy} data-help={t("addHelp")}>{busy ? tc("saving") : t("add")}</button>
          </form>
          <p className="mt-2 text-xs text-surface-500">{t("note")}</p>
          {message && <p role={message.ok ? "status" : "alert"} className={`mt-2 text-sm ${message.ok ? "text-emerald-300" : "text-red-300"}`}>{message.text}</p>}
        </div>
      )}
    </section>
  );
}
