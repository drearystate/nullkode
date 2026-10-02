"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

export function NewProjectForm() {
  const t = useTranslations("studio.createForm");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? t("failed"));
      }
      const { project } = await res.json();
      router.push(`/projects/${project.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 flex gap-2">
      <input
        className="input flex-1"
        placeholder={t("placeholder")}
        data-help={t("nameHelp")}
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
      <button className="btn-primary" data-help={t("createHelp")} disabled={busy || !name.trim()}>
        {busy ? "..." : t("create")}
      </button>
      {error && <div className="text-sm text-red-400 mt-1">{error}</div>}
    </form>
  );
}
