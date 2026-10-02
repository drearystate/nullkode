"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

export function NewFlowButton({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const t = useTranslations("flows.newFlow");
  const tc = useTranslations("common");

  async function create() {
    if (!name.trim()) return;
    setBusy(true);
    const res = await fetch(`/api/projects/${projectId}/flows`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setBusy(false);
    if (res.ok) {
      const { flow } = await res.json();
      router.push(`/projects/${projectId}/flows/${flow.id}`);
    }
  }

  if (!open) return <button className="btn-primary" onClick={() => setOpen(true)} data-help={t("buttonHelp")}>{t("button")}</button>;
  return (
    <div className="flex gap-2">
      <input
        className="input w-64"
        autoFocus
        placeholder={t("placeholder")}
        data-help={t("nameHelp")}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") create();
          if (e.key === "Escape") setOpen(false);
        }}
      />
      <button className="btn-primary" disabled={busy} onClick={create} data-help={t("createHelp")}>{t("create")}</button>
      <button className="btn-ghost" onClick={() => setOpen(false)}>{tc("cancel")}</button>
    </div>
  );
}
