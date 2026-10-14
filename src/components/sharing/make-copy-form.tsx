"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CopyPlus, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

/** "Make my copy" on a share link's page: an optional name, then the copy opens. */
export function MakeCopyForm({ token, name, kind }: { token: string; name: string; kind: "app" | "design" | "game" }) {
  const t = useTranslations("sharing");
  const router = useRouter();
  const [copyName, setCopyName] = useState(name);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function make() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/share/open/${encodeURIComponent(token)}/copy`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: copyName.trim() || name }) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || typeof body.url !== "string") { setError(body.error ?? t("dialog.networkError")); setBusy(false); return; }
      setDone(body.url);
      router.push(body.url);
    } catch {
      setError(t("dialog.networkError"));
      setBusy(false);
    }
  }

  return <form onSubmit={(e) => { e.preventDefault(); if (!busy && !done) void make(); }} data-testid="make-copy-form" data-kind={kind}>
    <label className="block text-sm"><span className="label">{t("page.nameLabel")}</span>
      <input className="input mt-1 w-full" dir="auto" maxLength={kind === "app" ? 80 : 120} value={copyName} onChange={(e) => setCopyName(e.target.value)} data-help={t("page.nameHelp")} data-testid="copy-name" />
    </label>
    <button type="submit" className="btn-primary mt-4 w-full justify-center" disabled={busy || Boolean(done)} data-help={t("page.makeHelp")} data-testid="make-copy">
      {busy ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <CopyPlus size={16} aria-hidden />}{busy ? t("page.making") : t("page.make")}
    </button>
    {error && <p role="alert" className="mt-3 text-sm text-red-300" data-testid="make-copy-error">{error}</p>}
    {done && <p role="status" className="mt-3 text-sm text-emerald-200">{t("page.done")} <a href={done} className="underline">{t("page.open")}</a></p>}
  </form>;
}
