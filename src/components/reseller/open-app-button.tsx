"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";

/** Opens an app in the editor — through the client's workspace when it's theirs. */
export function OpenAppButton({ projectId, ownerId }: { projectId: string; ownerId: string | null }) {
  const [busy, setBusy] = useState(false);
  const t = useTranslations("reseller.openApp");
  async function open() {
    setBusy(true);
    if (ownerId) {
      const res = await fetch(`/api/reseller/clients/${ownerId}/impersonate`, { method: "POST" });
      if (!res.ok) {
        setBusy(false);
        alert(t("failed"));
        return;
      }
    }
    window.location.href = `/projects/${projectId}`;
  }
  return <button type="button" className="btn-ghost text-xs" onClick={open} disabled={busy} data-help={ownerId ? t("helpClient") : t("help")}>{busy ? t("opening") : t("open")}</button>;
}
