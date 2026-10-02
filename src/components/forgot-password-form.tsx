"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { authButton, authError, authInput, authLabel, authSuccess } from "./auth-styles";

export function ForgotPasswordForm() {
  const t = useTranslations("auth");
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
    if (!res.ok) return setError(data.error || t("forgot.failed"));
    setSent(true);
  }

  if (sent) {
    return <p role="status" className={`mt-6 ${authSuccess}`}>{t("forgot.sent")}</p>;
  }
  return (
    <form onSubmit={submit} className="mt-6 space-y-4">
      <div>
        <label className={authLabel} htmlFor="fp-email">{t("form.email")}</label>
        <input id="fp-email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("form.emailPlaceholder")}
          className={authInput} />
      </div>
      {error && <div role="alert" className={authError}>{error}</div>}
      <button type="submit" disabled={busy} className={authButton}>{busy ? t("forgot.sending") : t("forgot.send")}</button>
    </form>
  );
}
