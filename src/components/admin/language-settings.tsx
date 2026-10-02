"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { LOCALES } from "@/i18n/locales";

/**
 * Admin → Settings → Language: the language new visitors see before they pick
 * one (saved as Setting "i18n.defaultLocale"; empty = the browser's language).
 */
export function LanguageSettings({ initial }: { initial: string }) {
  const t = useTranslations("admin.language");
  const tc = useTranslations("common");
  const [value, setValue] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ "i18n.defaultLocale": value }),
    }).catch(() => null);
    setBusy(false);
    setMessage(res?.ok ? { ok: true, text: tc("saved") } : { ok: false, text: (await res?.text().catch(() => "")) || tc("tryAgain") });
  }

  return (
    <section id="language" className="card mt-8 scroll-mt-40 space-y-4 p-6" aria-labelledby="language-heading">
      <div>
        <h2 id="language-heading" className="text-xl font-semibold" data-help={t("help")}>{t("title")}</h2>
        <p className="mt-1 text-sm text-surface-400">{t("body")}</p>
      </div>
      <form onSubmit={save} className="flex flex-wrap items-end gap-3">
        <label className="block text-sm">
          <span className="label">{t("label")}</span>
          <select className="input w-auto min-w-[16rem]" value={value} onChange={(e) => setValue(e.target.value)}>
            <option value="">{t("browser")}</option>
            {LOCALES.map((l) => (
              <option key={l.code} value={l.code} lang={l.code}>
                {l.name}{l.name !== l.english ? ` · ${l.english}` : ""}
              </option>
            ))}
          </select>
        </label>
        <button className="btn-primary" disabled={busy}>{busy ? tc("saving") : tc("save")}</button>
        {message && <p role={message.ok ? "status" : "alert"} className={`text-sm ${message.ok ? "text-emerald-300" : "text-red-300"}`}>{message.text}</p>}
      </form>
    </section>
  );
}
