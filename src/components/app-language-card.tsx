"use client";
import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Languages } from "lucide-react";
import { LOCALES } from "@/i18n/locales";

type View = { locale: string; dir: "ltr" | "rtl"; explicit: boolean };

/**
 * "App language" on the app's overview: the language its visitors see
 * (lib/app-locale.ts). New pages, installed features and the app's built-in
 * messages use it; existing pages keep their words.
 */
export function AppLanguageCard({ projectId }: { projectId: string }) {
  const t = useTranslations("apps.appLanguage");
  const tc = useTranslations("common");
  const [view, setView] = useState<View | null>(null);
  const [value, setValue] = useState("en");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    fetch(`/api/projects/${projectId}/locale`, { cache: "no-store" })
      .then(async (r) => {
        const d = (await r.json().catch(() => null)) as View | null;
        if (!r.ok || !d) throw new Error();
        setView(d);
        setValue(d.locale);
      })
      .catch(() => setLoadError(true));
  }, [projectId]);

  if (loadError) return <section className="card mt-6 p-6 text-sm text-red-300" role="alert">{t("loadError")}</section>;
  if (!view) return null;

  const chosen = LOCALES.find((l) => l.code === value);
  const dirty = value !== view.locale || !view.explicit;

  async function save() {
    setBusy(true);
    setMessage(null);
    try {
      const r = await fetch(`/api/projects/${projectId}/locale`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ locale: value }),
      });
      const d = (await r.json().catch(() => null)) as (View & { error?: string }) | null;
      if (!r.ok || !d || d.error) throw new Error(d?.error || t("saveError"));
      setView(d);
      setMessage({ ok: true, text: t("saved", { language: LOCALES.find((l) => l.code === d.locale)?.name ?? d.locale }) });
    } catch (e) {
      setMessage({ ok: false, text: e instanceof Error && e.message ? e.message : t("saveError") });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card mt-6 p-6" aria-labelledby="app-language-heading" id="app-language" data-testid="app-language-card">
      <h2 id="app-language-heading" className="flex items-center gap-2 font-semibold" data-help={t("help")}>
        <Languages size={17} className="text-brand-300" aria-hidden />
        {t("title")}
      </h2>
      <p className="mt-1 text-sm text-surface-400">{t("intro")}</p>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="block text-sm">
          <span className="text-surface-300">{t("label")}</span>
          <select
            className="input mt-1 w-auto min-w-[14rem]"
            value={value}
            onChange={(e) => { setValue(e.target.value); setMessage(null); }}
            data-help={t("selectHelp")}
            data-testid="app-language-select"
          >
            {LOCALES.map((l) => (
              <option key={l.code} value={l.code} lang={l.code}>
                {l.name}{l.name !== l.english ? ` · ${l.english}` : ""}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="btn-primary" onClick={save} disabled={busy || !dirty} data-help={t("saveHelp")}>
          {busy ? tc("saving") : t("save")}
        </button>
      </div>
      {!view.explicit && <p className="mt-3 text-xs text-surface-400">{t("notChosen")}</p>}
      {chosen?.dir === "rtl" && <p className="mt-3 text-xs text-surface-400">{t("rtl")}</p>}
      <p className="mt-3 text-xs text-surface-400">{t("note")}</p>
      <div aria-live="polite">
        {message && <p className={`mt-3 text-sm ${message.ok ? "text-emerald-300" : "text-red-300"}`} role={message.ok ? "status" : "alert"}>{message.text}</p>}
      </div>
      <OtherLanguages projectId={projectId} main={view.locale} />
    </section>
  );
}

type Job = { total: number; done: number; failed: number; running: boolean };
type LanguagesView = {
  default: string;
  locales: string[];
  languages: Array<{ locale: string; ok: number; stale: number; missing: number; edited: number; job: Job | null }>;
  pages: Array<{ id: string }>;
};

const nameOf = (code: string) => LOCALES.find((l) => l.code === code)?.name ?? code;

/**
 * A multilingual app's other languages (lib/app-translations.ts): add one
 * (the AI translates every page in the background), see how many pages are
 * translated or need updating, update them, or remove the language.
 */
function OtherLanguages({ projectId, main }: { projectId: string; main: string }) {
  const t = useTranslations("apps.languages");
  const [view, setView] = useState<LanguagesView | null>(null);
  const [pick, setPick] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await fetch(`/api/projects/${projectId}/languages`, { cache: "no-store" });
    const d = (await r.json().catch(() => null)) as LanguagesView | null;
    if (r.ok && d) setView(d);
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load, main]);

  // While pages are being translated, check on them every few seconds.
  const running = view?.languages.some((l) => l.job?.running) ?? false;
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => void load(), 3000);
    return () => clearInterval(timer);
  }, [running, load]);

  if (!view) return null;

  async function call(method: "POST" | "DELETE", body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(`/api/projects/${projectId}/languages`, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const d = (await r.json().catch(() => null)) as (LanguagesView & { error?: string }) | null;
      if (!r.ok || !d || d.error) throw new Error(d?.error || t("error"));
      setView(d);
      setPick("");
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : t("error"));
    } finally {
      setBusy(false);
    }
  }

  const others = view.languages;
  const total = view.pages.length;
  const available = LOCALES.filter((l) => !view.locales.includes(l.code));

  return (
    <div className="mt-6 border-t border-white/[0.06] pt-5" data-testid="app-languages">
      <h3 className="text-sm font-semibold" data-help={t("help")}>{t("title")}</h3>
      <p className="mt-1 text-xs text-surface-400">{t("intro")}</p>
      {others.length === 0 ? (
        <p className="mt-3 text-xs text-surface-500">{t("none", { language: nameOf(view.default) })}</p>
      ) : (
        <ul className="mt-3 divide-y divide-white/[0.06]">
          {others.map((l) => (
            <li key={l.locale} className="flex flex-wrap items-center justify-between gap-3 py-2.5" data-testid={`app-language-${l.locale}`}>
              <span className="min-w-0">
                <span className="block text-sm font-medium" lang={l.locale}>{nameOf(l.locale)}</span>
                <span className="block text-xs text-surface-400">
                  {l.job?.running
                    ? t("progress", { done: l.job.done + l.job.failed, total: l.job.total })
                    : [
                        t("translated", { ok: l.ok + l.edited, total }),
                        l.stale + l.missing > 0 ? t("needUpdate", { count: l.stale + l.missing }) : null,
                        l.edited > 0 ? t("edited", { count: l.edited }) : null,
                      ].filter(Boolean).join(" · ")}
                </span>
              </span>
              <span className="flex flex-wrap items-center gap-2">
                {l.stale + l.missing > 0 && !l.job?.running && (
                  <button type="button" className="btn-ghost px-3 py-1.5 text-xs" disabled={busy} data-help={t("updateHelp")} onClick={() => void call("POST", { locale: l.locale, action: "translate" })}>{t("update")}</button>
                )}
                <button type="button" className="px-2 py-1.5 text-xs text-surface-400 hover:text-red-300" disabled={busy} data-help={t("removeHelp")} onClick={() => { if (confirm(t("confirmRemove", { language: nameOf(l.locale) }))) void call("DELETE", { locale: l.locale }); }}>{t("remove")}</button>
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select className="input w-auto min-w-[12rem] text-sm" value={pick} onChange={(e) => setPick(e.target.value)} aria-label={t("pick")} data-testid="app-language-add-select">
          <option value="">{t("pick")}</option>
          {available.map((l) => (
            <option key={l.code} value={l.code} lang={l.code}>{l.name}{l.name !== l.english ? ` · ${l.english}` : ""}</option>
          ))}
        </select>
        <button type="button" className="btn-ghost text-sm" disabled={busy || !pick} data-help={t("addHelp")} onClick={() => void call("POST", { locale: pick })}>{busy ? t("adding") : t("add")}</button>
      </div>
      {others.length > 0 && <p className="mt-2 text-xs text-surface-500">{t("publishNote")}</p>}
      {error && <p role="alert" className="mt-2 text-sm text-red-300">{error}</p>}
    </div>
  );
}
