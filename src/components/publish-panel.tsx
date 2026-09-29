"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Loader2, Rocket } from "lucide-react";

export function PublishPanel({ projectId, published, version, pending = true }: { projectId: string; published: boolean; version: number; pending?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();
  async function update(method: "POST" | "DELETE") {
    if (method === "DELETE" && !confirm("Take this app offline? Visitors won’t be able to open it until you publish again.")) return;
    setBusy(true); setError(null); setSuccess(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/publish`, { method });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not update publishing. Please try again.");
      setSuccess(method === "POST" ? (published ? "Your changes are live." : "Your app is live. Ready to share.") : "Your app is now offline.");
      router.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "Check your connection and try again."); }
    finally { setBusy(false); }
  }
  return <div><div className="flex flex-wrap gap-2"><button className="btn-primary" disabled={busy || (published && !pending)} onClick={() => update("POST")} data-help={!published ? "Put your app online so anyone with its link can use it." : pending ? "Make your latest changes live. Visitors see them right away, and you can go back to an earlier version below." : "Visitors already see your latest changes. Nothing new to publish."}>{busy ? <Loader2 size={15} className="animate-spin" /> : <Rocket size={15} />}{!published ? "Publish app" : pending ? `Publish changes (v${version + 1})` : "Up to date"}</button>{published && <button className="btn-ghost" disabled={busy} onClick={() => update("DELETE")} data-help="Hide your app from everyone. Visitors can't open it until you publish again. Nothing is deleted.">Take offline</button>}</div>{error && <p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}{success && <p role="status" className="mt-3 text-sm text-emerald-300">{success}</p>}</div>;
}

export function CopyAppLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);
  async function copy() {
    try { await navigator.clipboard.writeText(new URL(url, window.location.origin).href); setCopied(true); setError(false); setTimeout(() => setCopied(false), 2500); }
    catch { setError(true); }
  }
  return <span className="inline-flex flex-col gap-1"><button className="studio-icon-button" aria-label={copied ? "Link copied" : "Copy app link"} title={copied ? "Copied" : "Copy link"} data-help="Copy your app's link, ready to paste into a message, email or post." onClick={copy}>{copied ? <Check size={15} /> : <Copy size={15} />}</button><span role="status" className={error ? "text-xs text-amber-300" : "sr-only"}>{error ? "Select the link to copy it manually." : copied ? "Link copied" : ""}</span></span>;
}

/** Bring back an earlier published version (rollback). */
export function MakeLiveButton({ projectId, deploymentId, version }: { projectId: string; deploymentId: string; version: number }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  async function restore() {
    if (!confirm(`Make version ${version} live again? Visitors will see it immediately. Your draft isn't changed.`)) return;
    setBusy(true);
    const res = await fetch(`/api/projects/${projectId}/deployments/${deploymentId}`, { method: "POST" });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "Couldn't restore that version.");
      return;
    }
    router.refresh();
  }
  return <button type="button" className="btn-ghost text-xs" disabled={busy} onClick={restore} data-help="Put this earlier version back online. Visitors see it straight away; the edits you're working on stay as they are.">{busy ? "Restoring…" : "Make live"}</button>;
}
