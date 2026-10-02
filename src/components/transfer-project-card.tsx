"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

/**
 * Danger-zone card on the project overview: hand the whole app to another
 * account on this site. Two steps (type the email, then confirm) because
 * the action can't be undone from this side: after the transfer the current
 * owner loses access. The server only allows moves within the owner's own
 * workspace and within the other account's plan (see the transfer route).
 */
export function TransferProjectCard({
  projectId,
  projectName,
}: {
  projectId: string;
  projectName: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations("project.transferProject");
  const tc = useTranslations("common");

  async function transfer() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/transfer`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? t("failed"));
        setConfirming(false);
        return;
      }
      // The app is no longer ours: its overview page would 404.
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError(t("networkError"));
      setConfirming(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-6 border-red-900/40">
      <h2 className="font-semibold text-red-300" data-help={t("titleHelp")}>{t("title")}</h2>
      <p className="mt-2 text-sm text-surface-400">
        {t("intro")}
      </p>
      <p className="mt-2 text-sm text-surface-400">
        {t("requirements")}
      </p>

      {!confirming ? (
        <div className="mt-4 flex gap-2">
          <input
            type="email"
            className="input flex-1 text-sm"
            placeholder="new-owner@example.com"
            aria-label={t("emailLabel")}
            data-help={t("emailHelp")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={busy}
          />
          <button
            className="rounded-lg border border-red-800 text-red-300 hover:bg-red-950/40 px-4 py-2 text-sm font-medium transition disabled:opacity-50"
            disabled={busy || !email.includes("@")}
            data-help={t("transferHelp")}
            onClick={() => {
              setError(null);
              setConfirming(true);
            }}
          >
            {t("transfer")}
          </button>
        </div>
      ) : (
        <div className="mt-4 rounded-lg border border-red-800 bg-red-950/30 p-4">
          <p className="text-sm text-red-200">
            {t.rich("confirm", {
              name: projectName,
              email: email.trim(),
              b: (c) => <span className="font-semibold">{c}</span>,
              mono: (c) => <span className="font-mono" dir="ltr">{c}</span>,
            })}
          </p>
          <div className="mt-3 flex gap-2">
            <button
              className="rounded-lg bg-[#b91c1c] hover:bg-[#dc2626] text-fixed-white px-4 py-2 text-sm font-semibold transition disabled:opacity-50"
              onClick={transfer}
              disabled={busy}
              data-help={t("confirmHelp")}
            >
              {busy ? t("transferring") : t("confirmButton")}
            </button>
            <button
              className="rounded-lg border border-surface-700 text-surface-300 hover:bg-surface-800 px-4 py-2 text-sm transition"
              onClick={() => setConfirming(false)}
              disabled={busy}
            >
              {tc("cancel")}
            </button>
          </div>
        </div>
      )}

      {error && <p role="alert" className="mt-3 text-sm text-red-400">{error}</p>}
    </div>
  );
}
