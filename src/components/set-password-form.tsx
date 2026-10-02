"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { authButton, authError, authInput, authLabel } from "./auth-styles";

export function SetPasswordForm({ token, askName }: { token: string; askName: boolean }) {
  const t = useTranslations("auth.setPassword");
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
    if (password !== confirm) return setError(t("mismatch"));
    setBusy(true);
    try {
      const res = await fetch("/api/auth/set-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, password, ...(askName && name.trim() ? { name: name.trim() } : {}) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || t("failed"));
      window.location.href = typeof data.next === "string" && data.next.startsWith("/") ? data.next : "/dashboard";
    } catch (err) {
      setError(err instanceof Error ? err.message : t("failedShort"));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-4">
      {askName && (
        <div>
          <label className={labelCls} htmlFor="sp-name">{t("yourName")}</label>
          <input id="sp-name" className={inputCls} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("namePlaceholder")} />
        </div>
      )}
      <div>
        <label className={labelCls} htmlFor="sp-password">{t("newPassword")}</label>
        <input id="sp-password" className={inputCls} type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t("passwordPlaceholder")} />
      </div>
      <div>
        <label className={labelCls} htmlFor="sp-confirm">{t("repeat")}</label>
        <input id="sp-confirm" className={inputCls} type="password" autoComplete="new-password" required minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </div>
      {error && <div role="alert" className={authError}>{error}</div>}
      <button type="submit" disabled={busy} className={authButton}>{busy ? t("saving") : t("save")}</button>
    </form>
  );
}
