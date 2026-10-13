"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

/**
 * Admin → Settings → App stores: the Google OAuth client behind "Sign in with
 * Google" for Google Play (src/lib/store-publish). Optional: without it,
 * people connect Google Play with a service-account key.
 */
export function StorePublishSettings() {
  const t = useTranslations("storePublish.admin");
  const tc = useTranslations("common");
  const [info, setInfo] = useState<{ clientId: string; secretSet: boolean; fromEnv: boolean; redirectUri: string } | null>(null);
  const [clientId, setClientId] = useState("");
  const [secret, setSecret] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/admin/store-publish").catch(() => null);
      const data = res?.ok ? await res.json().catch(() => null) : null;
      if (data) {
        setInfo(data);
        setClientId(data.clientId ?? "");
      }
    })();
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const res = await fetch("/api/admin/store-publish", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ clientId, ...(secret ? { clientSecret: secret } : {}) }),
    }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    setBusy(false);
    if (res?.ok) {
      setSecret("");
      setInfo((i) => (i ? { ...i, clientId, secretSet: i.secretSet || Boolean(secret) } : i));
      setMessage({ ok: true, text: tc("saved") });
    } else {
      setMessage({ ok: false, text: data.error || tc("tryAgain") });
    }
  }

  async function clear() {
    setBusy(true);
    const res = await fetch("/api/admin/store-publish", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ clientId: "", clientSecret: "" }) }).catch(() => null);
    setBusy(false);
    if (res?.ok) {
      setClientId("");
      setInfo((i) => (i ? { ...i, clientId: "", secretSet: false } : i));
      setMessage({ ok: true, text: tc("saved") });
    }
  }

  return (
    <section id="stores" className="card mt-8 scroll-mt-40 space-y-4 p-6" aria-labelledby="stores-heading">
      <div>
        <h2 id="stores-heading" className="text-xl font-semibold" data-help={t("help")}>{t("title")}</h2>
        <p className="mt-1 text-sm text-surface-400">{t("body")}</p>
      </div>
      <ol className="list-decimal space-y-1.5 ps-5 text-sm text-surface-300">
        <li>{t("step1")}</li>
        <li>{t("step2")}</li>
        <li>
          {t("step3")}
          {info && <span className="mt-1 block break-all font-mono text-xs text-surface-100" dir="ltr">{info.redirectUri}</span>}
        </li>
        <li>{t("step4")}</li>
      </ol>
      {info?.fromEnv && <p className="text-sm text-surface-400">{t("fromEnv")}</p>}
      <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="label">{t("clientId")}</span>
          <input className="input font-mono" dir="ltr" value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="1234-abc.apps.googleusercontent.com" autoComplete="off" />
        </label>
        <label className="block text-sm">
          <span className="label">{t("clientSecret")}</span>
          <input className="input font-mono" dir="ltr" type="password" value={secret} onChange={(e) => setSecret(e.target.value)} placeholder={info?.secretSet ? t("secretSaved") : ""} autoComplete="off" />
        </label>
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
          <button className="btn-primary" disabled={busy}>{busy ? tc("saving") : tc("save")}</button>
          {info?.clientId && (
            <button type="button" className="btn-ghost" disabled={busy} onClick={clear}>{t("turnOff")}</button>
          )}
          {message && <p role={message.ok ? "status" : "alert"} className={`text-sm ${message.ok ? "text-emerald-300" : "text-red-300"}`}>{message.text}</p>}
        </div>
      </form>
    </section>
  );
}
