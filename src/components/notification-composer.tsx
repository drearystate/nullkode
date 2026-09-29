"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Send } from "lucide-react";

export function NotificationComposer({ projectId, published, subscribers }: { projectId: string; published: boolean; subscribers: number }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const router = useRouter();

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!confirm(`Send this notification to ${subscribers} subscriber${subscribers === 1 ? "" : "s"} now?`)) return;
    setBusy(true);
    setMessage(null);
    const res = await fetch(`/api/projects/${projectId}/push`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title, body, url: url || undefined }) });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setMessage({ ok: false, text: data.error || "Couldn't send. Please try again." });
    setMessage({ ok: true, text: `Delivered to ${data.sent} device${data.sent === 1 ? "" : "s"}${data.removed ? ` (${data.removed} old subscription${data.removed === 1 ? "" : "s"} removed)` : ""}.` });
    setTitle(""); setBody(""); setUrl("");
    router.refresh();
  }

  return (
    <form onSubmit={send} className="card mt-6 grid gap-6 p-6 md:grid-cols-[1fr_260px]">
      <div className="space-y-4">
        <label className="block text-sm"><span className="label">Title</span><input className="input w-full" required maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Tonight: live music from 7pm" data-help="The bold first line people see. Keep it short and clear, like what’s happening and when." /></label>
        <label className="block text-sm"><span className="label">Message</span><textarea className="input min-h-[96px] w-full" maxLength={400} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Book a table before they're gone." data-help="The text under the title. Phones may cut off long messages, so put the important part first." /></label>
        <label className="block text-sm"><span className="label">Open this page when tapped (optional)</span><input className="input w-full" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="/menu" data-help="The page of your app to open when someone taps the notification, like /menu. Leave empty to open your app’s home page." /></label>
        {!published && <p className="text-sm text-amber-200">Publish your app first — tapping a notification opens your live app.</p>}
        {message && <p role={message.ok ? "status" : "alert"} className={`text-sm ${message.ok ? "text-emerald-300" : "text-red-300"}`}>{message.text}</p>}
        <button className="btn-primary" disabled={busy || !published || subscribers === 0 || !title.trim()} data-help="Sends this right away to everyone subscribed. You’ll be asked to confirm first; once sent, it can’t be taken back."><Send size={15} />{busy ? "Sending…" : subscribers === 0 ? "No subscribers yet" : `Send to ${subscribers}`}</button>
      </div>
      <div aria-label="Preview" data-help="A rough idea of how your notification will look. The real look depends on each person’s phone or computer.">
        <p className="studio-eyebrow mb-2">PREVIEW</p>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-lg">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-500/20 text-brand-200"><Bell size={16} /></span>
            <span className="min-w-0"><span className="block text-sm font-semibold">{title || "Your title"}</span><span className="mt-0.5 block text-xs text-surface-300">{body || "Your message shows here."}</span></span>
          </div>
        </div>
      </div>
    </form>
  );
}
