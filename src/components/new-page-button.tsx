"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

export function NewPageButton({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const t = useTranslations("project.newPageButton");
  const tc = useTranslations("common");

  async function create() {
    if (!title.trim()) return;
    setBusy(true);
    const res = await fetch(`/api/projects/${projectId}/pages`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title }),
    });
    setBusy(false);
    if (res.ok) {
      const { page } = await res.json();
      router.push(`/projects/${projectId}/pages/${page.id}/edit`);
    }
  }

  if (!open) {
    return (
      <button className="btn-primary" data-help={t("newPageHelp")} onClick={() => setOpen(true)}>
        {t("newPage")}
      </button>
    );
  }
  return (
    <div className="flex gap-2">
      <input
        className="input w-64"
        autoFocus
        placeholder={t("titlePlaceholder")}
        data-help={t("titleHelp")}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") create();
          if (e.key === "Escape") setOpen(false);
        }}
      />
      <button className="btn-primary" disabled={busy} onClick={create} data-help={t("createHelp")}>
        {t("create")}
      </button>
      <button className="btn-ghost" onClick={() => setOpen(false)}>
        {tc("cancel")}
      </button>
    </div>
  );
}
