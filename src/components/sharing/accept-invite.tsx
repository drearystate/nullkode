"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

/** "Accept invitation" on an invitation email's page: accepts with the link's token, then opens what was shared. */
export function AcceptInviteButton({ token }: { token: string }) {
  const t = useTranslations("sharing");
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function accept() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/me/invites/token", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "accept", token }) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || typeof body.url !== "string") { setError(body.error ?? t("dialog.networkError")); setBusy(false); return; }
      router.push(body.url);
    } catch {
      setError(t("dialog.networkError"));
      setBusy(false);
    }
  }
  return <div className="mt-6">
    <button type="button" className="btn-primary" onClick={() => void accept()} disabled={busy} data-help={t("invite.acceptHelp")} data-testid="invite-accept-link">{busy ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Check size={16} aria-hidden />}{busy ? t("invite.accepting") : t("invite.accept")}</button>
    {error && <p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}
  </div>;
}
