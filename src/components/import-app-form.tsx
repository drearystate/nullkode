"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileUp } from "lucide-react";

/** Upload a backup .zip (from Publish → "Download backup") and get the app back as a new app. */
export function ImportAppForm() {
  const router = useRouter();
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
      return setError(data.error || "Couldn't import that backup. Please try again.");
    }
    router.push(data.homePageId ? `/projects/${data.projectId}/pages/${data.homePageId}/edit?welcome=1` : `/projects/${data.projectId}`);
  }

  return (
    <div className="mx-auto max-w-xl px-5 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Import an app</h1>
      <p className="mt-2 text-sm leading-relaxed text-surface-400">
        Choose a backup .zip made with <strong className="font-medium text-surface-200">Publish → Download backup</strong>, on this server or another one. You get a copy of the app with its pages, workflows, data and images. App passwords aren&apos;t in backups, so people use &ldquo;Forgot password&rdquo; once.
      </p>
      <form onSubmit={submit} className="card mt-6 space-y-5 p-6">
        <label className="block text-sm">
          <span className="label">Backup file</span>
          <input type="file" data-help="Pick the backup .zip you downloaded from an app's Publish page. Backups made on another server work too." accept=".zip,application/zip" required disabled={busy} onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-surface-300 file:mr-4 file:rounded-lg file:border-0 file:bg-white/10 file:px-4 file:py-2 file:text-sm file:font-medium file:text-surface-100 hover:file:bg-white/15" />
        </label>
        <label className="block text-sm">
          <span className="label">New name (optional)</span>
          <input className="input w-full" data-help="Give the imported app a different name. Leave empty to keep the name it had in the backup." maxLength={80} value={name} disabled={busy} onChange={(e) => setName(e.target.value)} placeholder="Keeps the original name if empty" />
        </label>
        {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
        <button className="btn-primary w-full justify-center" data-help="Creates a new app from the backup. Your other apps aren't changed. The editor opens when it's ready." disabled={busy || !file}>
          <FileUp size={16} aria-hidden />{busy ? "Importing…" : "Import app"}
        </button>
      </form>
    </div>
  );
}
