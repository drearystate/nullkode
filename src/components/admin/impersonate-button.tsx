"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";

export function ImpersonateButton({
  userId,
  email,
  label,
  redirectTo = "/dashboard",
}: {
  userId: string;
  email: string;
  label?: string;
  redirectTo?: string;
}) {
  const [busy, setBusy] = useState(false);
  const t = useTranslations("admin");

  async function go() {
    if (!confirm(t("impersonate.confirm", { email }))) return;
    setBusy(true);
    const res = await fetch("/api/admin/impersonate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (res.ok) {
      window.location.href = redirectTo;
    } else {
      setBusy(false);
      alert(t("impersonate.failed"));
    }
  }

  return (
    <button className="btn-ghost text-xs px-3 py-1" disabled={busy} onClick={go} data-help={t("impersonate.help")}>
      {busy ? "..." : (label ?? t("impersonate.label"))}
    </button>
  );
}
