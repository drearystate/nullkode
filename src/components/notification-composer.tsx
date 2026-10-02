"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Send } from "lucide-react";
import { useTranslations } from "next-intl";

export function NotificationComposer({ projectId, published, subscribers }: { projectId: string; published: boolean; subscribers: number }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const router = useRouter();
  const t = useTranslations("project.notificationComposer");

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!confirm(t("confirm", { count: subscribers }))) return;
    setBusy(true);
    setMessage(null);
    const res = await fetch(`/api/projects/${projectId}/push`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title, body, url: url || undefined }) });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setMessage({ ok: false, text: data.error || t("sendFailed") });
    setMessage({ ok: true, text: t("delivered", { sent: data.sent ?? 0, removed: data.removed ?? 0 }) });
    setTitle(""); setBody(""); setUrl("");
    router.refresh();
  }

  return (
    <form onSubmit={send} className="card mt-6 grid gap-6 p-6 md:grid-cols-[1fr_260px]">
      <div className="space-y-4">
        <label className="block text-sm"><span className="label">{t("title")}</span><input className="input w-full" required maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("titlePlaceholder")} data-help={t("titleHelp")} /></label>
        <label className="block text-sm"><span className="label">{t("message")}</span><textarea className="input min-h-[96px] w-full" maxLength={400} value={body} onChange={(e) => setBody(e.target.value)} placeholder={t("messagePlaceholder")} data-help={t("messageHelp")} /></label>
        <label className="block text-sm"><span className="label">{t("url")}</span><input className="input w-full" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="/menu" dir="ltr" data-help={t("urlHelp")} /></label>
        {!published && <p className="text-sm text-amber-200">{t("publishFirst")}</p>}
        {message && <p role={message.ok ? "status" : "alert"} className={`text-sm ${message.ok ? "text-emerald-300" : "text-red-300"}`}>{message.text}</p>}
        <button className="btn-primary" disabled={busy || !published || subscribers === 0 || !title.trim()} data-help={t("sendHelp")}><Send size={15} />{busy ? t("sending") : subscribers === 0 ? t("noSubscribers") : t("sendTo", { count: subscribers })}</button>
      </div>
      <div aria-label={t("previewLabel")} data-help={t("previewHelp")}>
        <p className="studio-eyebrow mb-2">{t("previewEyebrow")}</p>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-lg">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-500/20 text-brand-200"><Bell size={16} /></span>
            <span className="min-w-0"><span className="block text-sm font-semibold">{title || t("previewTitle")}</span><span className="mt-0.5 block text-xs text-surface-300">{body || t("previewBody")}</span></span>
          </div>
        </div>
      </div>
    </form>
  );
}
