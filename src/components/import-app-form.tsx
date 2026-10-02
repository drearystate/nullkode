"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileUp } from "lucide-react";
import { useTranslations } from "next-intl";

/** Upload a backup .zip (from Publish → "Download backup") and get the app back as a new app. */
export function ImportAppForm() {
  const router = useRouter();
  const t = useTranslations("studio.import");
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setBusy(true);
    setError(null);
    const body = new FormData();
    body.append("file", file);
    if (name.trim()) body.append("name", name.trim());
    const res = await fetch("/api/projects/import", { method: "POST", body }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    if (!res || !res.ok) {
      setBusy(false);
      return setError(data.error || t("failed"));
    }
    router.push(data.homePageId ? `/projects/${data.projectId}/pages/${data.homePageId}/edit?welcome=1` : `/projects/${data.projectId}`);
  }

  return (
    <div className="mx-auto max-w-xl px-5 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="mt-2 text-sm leading-relaxed text-surface-400">
        {t.rich("intro", { b: (c) => <strong className="font-medium text-surface-200">{c}</strong> })}
      </p>
      <form onSubmit={submit} className="card mt-6 space-y-5 p-6">
        <label className="block text-sm">
          <span className="label">{t("file")}</span>
          <input type="file" data-help={t("fileHelp")} accept=".zip,application/zip" required disabled={busy} onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-surface-300 file:me-4 file:rounded-lg file:border-0 file:bg-white/10 file:px-4 file:py-2 file:text-sm file:font-medium file:text-surface-100 hover:file:bg-white/15" />
        </label>
        <label className="block text-sm">
          <span className="label">{t("name")}</span>
          <input className="input w-full" data-help={t("nameHelp")} maxLength={80} value={name} disabled={busy} onChange={(e) => setName(e.target.value)} placeholder={t("namePlaceholder")} />
        </label>
        {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
        <button className="btn-primary w-full justify-center" data-help={t("submitHelp")} disabled={busy || !file}>
          <FileUp size={16} aria-hidden />{busy ? t("importing") : t("submit")}
        </button>
      </form>
    </div>
  );
}
