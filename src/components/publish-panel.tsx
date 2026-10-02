"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Loader2, Rocket } from "lucide-react";
import { useTranslations } from "next-intl";

export function PublishPanel({ projectId, published, version, pending = true }: { projectId: string; published: boolean; version: number; pending?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();
  const t = useTranslations("project.publishPanel");
  async function update(method: "POST" | "DELETE") {
    if (method === "DELETE" && !confirm(t("confirmOffline"))) return;
    setBusy(true); setError(null); setSuccess(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/publish`, { method });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || t("updateFailed"));
      setSuccess(method === "POST" ? (published ? t("changesLive") : t("appLive")) : t("appOffline"));
      router.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : t("connectionError")); }
    finally { setBusy(false); }
  }
  return <div><div className="flex flex-wrap gap-2"><button className="btn-primary" disabled={busy || (published && !pending)} onClick={() => update("POST")} data-help={!published ? t("publishAppHelp") : pending ? t("publishChangesHelp") : t("upToDateHelp")}>{busy ? <Loader2 size={15} className="animate-spin" /> : <Rocket size={15} />}{!published ? t("publishApp") : pending ? t("publishChanges", { version: version + 1 }) : t("upToDate")}</button>{published && <button className="btn-ghost" disabled={busy} onClick={() => update("DELETE")} data-help={t("takeOfflineHelp")}>{t("takeOffline")}</button>}</div>{error && <p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}{success && <p role="status" className="mt-3 text-sm text-emerald-300">{success}</p>}</div>;
}

export function CopyAppLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);
  const t = useTranslations("project.publishPanel");
  async function copy() {
    try { await navigator.clipboard.writeText(new URL(url, window.location.origin).href); setCopied(true); setError(false); setTimeout(() => setCopied(false), 2500); }
    catch { setError(true); }
  }
  return <span className="inline-flex flex-col gap-1"><button className="studio-icon-button" aria-label={copied ? t("linkCopied") : t("copyAppLink")} title={copied ? t("copied") : t("copyLink")} data-help={t("copyLinkHelp")} onClick={copy}>{copied ? <Check size={15} /> : <Copy size={15} />}</button><span role="status" className={error ? "text-xs text-amber-300" : "sr-only"}>{error ? t("copyManually") : copied ? t("linkCopied") : ""}</span></span>;
}

/** Bring back an earlier published version (rollback). */
export function MakeLiveButton({ projectId, deploymentId, version }: { projectId: string; deploymentId: string; version: number }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const t = useTranslations("project.publishPanel");
  async function restore() {
    if (!confirm(t("confirmRestore", { version }))) return;
    setBusy(true);
    const res = await fetch(`/api/projects/${projectId}/deployments/${deploymentId}`, { method: "POST" });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || t("restoreFailed"));
      return;
    }
    router.refresh();
  }
  return <button type="button" className="btn-ghost text-xs" disabled={busy} onClick={restore} data-help={t("makeLiveHelp")}>{busy ? t("restoring") : t("makeLive")}</button>;
}
