"use client";
import { useState } from "react";
import { ImageUp, X } from "lucide-react";

type Brand = {
  name: string; tagline: string; logoDataUrl: string | null; faviconDataUrl: string | null;
  colorPrimary: string; colorAccent: string; supportEmail: string; homepageUrl: string;
};

const MAX_BYTES = 150 * 1024;

function readImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!/^image\/(png|jpeg|webp|svg\+xml|x-icon|vnd\.microsoft\.icon)$/.test(file.type)) return reject(new Error("Use a PNG, JPG, WebP, SVG or ICO image."));
    if (file.size > MAX_BYTES) return reject(new Error("That image is over 150 KB. Export a smaller version and try again."));
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Couldn't read that file."));
    reader.readAsDataURL(file);
  });
}

/**
 * Brand editor with a live preview. Resellers use it for their white-label
 * brand; the operator uses the same form for the platform's own brand
 * (`endpoint="/api/admin/brand"`).
 */
export function BrandForm({ initial, endpoint = "/api/reseller/brand", savedText = "Saved. Your clients see the new branding right away." }: { initial: Brand; endpoint?: string; savedText?: string }) {
  const [brand, setBrand] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const set = <K extends keyof Brand>(key: K, value: Brand[K]) => setBrand((b) => ({ ...b, [key]: value }));

  async function pick(key: "logoDataUrl" | "faviconDataUrl", file: File | undefined) {
    if (!file) return;
    try {
      set(key, await readImage(file));
      setMessage(null);
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Couldn't use that image." });
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const res = await fetch(endpoint, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...brand, supportEmail: brand.supportEmail.trim() || null, homepageUrl: brand.homepageUrl.trim() || null, tagline: brand.tagline.trim() || null }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    setMessage(res.ok ? { ok: true, text: savedText } : { ok: false, text: data.error || "Couldn't save." });
  }

  return (
    <form onSubmit={save} className="grid gap-6 xl:grid-cols-[1fr_380px]">
      <div className="card space-y-5 p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm" data-help="The name people see at the top of every screen, in emails and on the sign-in page."><span className="label">Brand name</span><input className="input w-full" required minLength={2} maxLength={60} value={brand.name} onChange={(e) => set("name", e.target.value)} /></label>
          <label className="block text-sm" data-help="A short line about what you offer. It's added to the browser tab title, next to your brand name."><span className="label">Tagline (optional)</span><input className="input w-full" maxLength={160} value={brand.tagline} onChange={(e) => set("tagline", e.target.value)} placeholder="Apps for local businesses" /></label>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <ImagePicker label="Logo" help="Your logo, shown in place of the brand name at the top of the screens and on the sign-in page." hint="Wide logos look best. PNG or SVG, under 150 KB." value={brand.logoDataUrl} onPick={(f) => pick("logoDataUrl", f)} onClear={() => set("logoDataUrl", null)} />
          <ImagePicker label="Browser icon" help="The small picture shown in the browser tab and in bookmarks." hint="Square, at least 64×64 px." value={brand.faviconDataUrl} onPick={(f) => pick("faviconDataUrl", f)} onClear={() => set("faviconDataUrl", null)} />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <ColorField label="Main colour" help="The colour of buttons and highlights across the screens and on the sign-in page." hint="Buttons and highlights" value={brand.colorPrimary} onChange={(v) => set("colorPrimary", v)} />
          <ColorField label="Accent colour" help="A second colour used for smaller touches and highlights." hint="Secondary highlights" value={brand.colorAccent} onChange={(v) => set("colorAccent", v)} />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm" data-help="Shown on the sign-in and password pages so people can reach you, and used as the reply-to address on invitation and password emails."><span className="label">Support email</span><input className="input w-full" type="email" value={brand.supportEmail} onChange={(e) => set("supportEmail", e.target.value)} placeholder="help@youragency.com" /><span className="mt-1 block text-xs text-surface-400">Shown to clients who need help, and used as the reply-to on emails.</span></label>
          <label className="block text-sm" data-help="Your business website's address, saved with your brand details."><span className="label">Your website (optional)</span><input className="input w-full" type="url" value={brand.homepageUrl} onChange={(e) => set("homepageUrl", e.target.value)} placeholder="https://youragency.com" /></label>
        </div>
        {message && <p role={message.ok ? "status" : "alert"} className={`text-sm ${message.ok ? "text-emerald-300" : "text-red-300"}`}>{message.text}</p>}
        <button className="btn-primary" disabled={busy} data-help="Saves your brand. People see the change the next time a page loads.">{busy ? "Saving…" : "Save branding"}</button>
      </div>

      <aside aria-label="Preview" className="space-y-3">
        <p className="studio-eyebrow">PREVIEW</p>
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0e0e16]">
          <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
            {brand.logoDataUrl
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={brand.logoDataUrl} alt="" className="h-6 max-w-[140px] object-contain" />
              : <span className="text-sm font-semibold" style={{ color: brand.colorPrimary }}>{brand.name || "Your brand"}</span>}
            <span className="ml-auto h-6 w-6 rounded-full bg-white/10" />
          </div>
          <div className="p-5">
            <p className="text-lg font-semibold">Welcome back</p>
            <p className="mt-1 text-xs text-surface-400">{brand.tagline || "Build and publish your own apps."}</p>
            <div className="mt-4 space-y-2"><div className="h-8 rounded-lg bg-white/5" /><div className="h-8 rounded-lg bg-white/5" /></div>
            <div className="mt-4 rounded-lg py-2 text-center text-sm font-medium text-white" style={{ background: brand.colorPrimary }}>Log in</div>
            <p className="mt-3 text-center text-xs" style={{ color: brand.colorAccent }}>{brand.supportEmail || "help@youragency.com"}</p>
          </div>
        </div>
      </aside>
    </form>
  );
}

function ImagePicker({ label, hint, help, value, onPick, onClear }: { label: string; hint: string; help?: string; value: string | null; onPick: (f: File | undefined) => void; onClear: () => void }) {
  return (
    <div className="text-sm" data-help={help}>
      <span className="label">{label}</span>
      <div className="flex items-center gap-3">
        <div className="grid h-14 w-28 place-items-center overflow-hidden rounded-lg border border-white/10 bg-white/5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {value ? <img src={value} alt={`${label} preview`} className="max-h-12 max-w-[100px] object-contain" /> : <ImageUp size={18} className="text-surface-400" />}
        </div>
        <label className="btn-ghost cursor-pointer text-xs">
          {value ? "Replace" : "Upload"}
          <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml,image/x-icon" className="sr-only" onChange={(e) => onPick(e.target.files?.[0])} />
        </label>
        {value && <button type="button" className="text-surface-400 hover:text-surface-100" onClick={onClear} aria-label={`Remove ${label.toLowerCase()}`} data-help="Removes this image. The change takes effect when you save."><X size={16} /></button>}
      </div>
      <span className="mt-1 block text-xs text-surface-400">{hint}</span>
    </div>
  );
}

function ColorField({ label, hint, help, value, onChange }: { label: string; hint: string; help?: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block text-sm" data-help={help}>
      <span className="label">{label}</span>
      <span className="flex items-center gap-2">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-10 w-12 cursor-pointer rounded-lg border border-white/10 bg-transparent" aria-label={`${label} picker`} />
        <input className="input w-32 font-mono" value={value} onChange={(e) => onChange(e.target.value)} pattern="#[0-9a-fA-F]{6}" aria-label={`${label} hex value`} />
      </span>
      <span className="mt-1 block text-xs text-surface-400">{hint}</span>
    </label>
  );
}
