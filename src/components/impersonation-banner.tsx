"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";

type Props = {
  adminEmail: string;
  targetEmail: string;
  targetName?: string | null;
  /** "RESELLER" when a reseller is helping one of its clients. */
  actorRole?: string;
};

export function ImpersonationBanner({ adminEmail, targetEmail, targetName, actorRole }: Props) {
  const [busy, setBusy] = useState(false);
  const t = useTranslations("nav.impersonation");
  const reseller = actorRole === "RESELLER";

  async function stop() {
    setBusy(true);
    await fetch("/api/admin/stop-impersonating", { method: "POST" });
    window.location.href = reseller ? "/reseller/clients" : "/admin";
  }

  return (
    <div className="bg-amber-500 text-surface-950 text-sm [[data-theme=light]_&]:text-surface-0">
      <div className="mx-auto max-w-6xl px-6 py-2 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 truncate">
          {reseller ? (
            <span className="truncate">{t.rich("viewingClient", { name: targetName || targetEmail, b: (c) => <span className="font-semibold">{c}</span> })}</span>
          ) : (
            <>
              <span className="font-semibold">{t("impersonating")}</span>
              <span className="font-mono truncate" dir="ltr">{targetEmail}</span>
              <span className="opacity-70 hidden md:inline">{t("signedInAs", { email: adminEmail })}</span>
            </>
          )}
        </div>
        <button
          onClick={stop}
          disabled={busy}
          data-help={reseller ? t("backToClientsHelp") : t("stopHelp")}
          className="shrink-0 bg-surface-950 text-amber-400 font-semibold rounded px-3 py-1 hover:bg-surface-800 [[data-theme=light]_&]:bg-surface-0 [[data-theme=light]_&]:text-amber-600 [[data-theme=light]_&]:hover:bg-surface-100 disabled:opacity-50"
        >
          {busy ? "…" : reseller ? t("backToClients") : t("stop")}
        </button>
      </div>
    </div>
  );
}
