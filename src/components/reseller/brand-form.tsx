"use client";
import { useState } from "react";
import { ImageUp, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { LOCALES } from "@/i18n/locales";

type Brand = {
  name: string; tagline: string; logoDataUrl: string | null; faviconDataUrl: string | null;
  colorPrimary: string; colorAccent: string; supportEmail: string; homepageUrl: string;
  /** The reseller's default language for its clients ("" = the platform's). */
  defaultLocale?: string;
};

type T = (key: string, values?: Record<string, string | number>) => string;

const MAX_BYTES = 150 * 1024;

function readImage(file: File, t: T): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!/^image\/(png|jpeg|webp|svg\+xml|x-icon|vnd\.microsoft\.icon)$/.test(file.type)) return reject(new Error(t("imageType")));
    if (file.size > MAX_BYTES) return reject(new Error(t("imageSize")));
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error(t("imageRead")));
    reader.readAsDataURL(file);
  });
}

/**
 * Brand editor with a live preview. Resellers use it for their white-label
 * brand; the operator uses the same form for the platform's own brand
 * (`endpoint="/api/admin/brand"`).
 */
export function BrandForm({ initial, endpoint = "/api/reseller/brand", savedText, showLocale = false }: { initial: Brand; endpoint?: string; savedText?: string; showLocale?: boolean }) {
  const t = useTranslations("reseller.brandForm") as unknown as T;
  const tc = useTranslations("common");
  const [brand, setBrand] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const set = <K extends keyof Brand>(key: K, value: Brand[K]) => setBrand((b) => ({ ...b, [key]: value }));

  async function pick(key: "logoDataUrl" | "faviconDataUrl", file: File | undefined) {
    if (!file) return;
    try {
      set(key, await readImage(file, t));
      setMessage(null);
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : t("imageFailed") });
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const res = await fetch(endpoint, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...brand,
        supportEmail: brand.supportEmail.trim() || null,
        homepageUrl: brand.homepageUrl.trim() || null,
        tagline: brand.tagline.trim() || null,
        ...(showLocale ? { defaultLocale: brand.defaultLocale || null } : { defaultLocale: undefined }),
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    setMessage(res.ok ? { ok: true, text: savedText ?? t("saved") } : { ok: false, text: data.error || t("saveFailed") });
  }

  return (
    <form onSubmit={save} className="grid gap-6 xl:grid-cols-[1fr_380px]">
      <div className="card space-y-5 p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm" data-help={t("nameHelp")}><span className="label">{t("name")}</span><input className="input w-full" dir="auto" required minLength={2} maxLength={60} value={brand.name} onChange={(e) => set("name", e.target.value)} /></label>
          <label className="block text-sm" data-help={t("taglineHelp")}><span className="label">{t("tagline")}</span><input className="input w-full" dir="auto" maxLength={160} value={brand.tagline} onChange={(e) => set("tagline", e.target.value)} placeholder={t("taglinePlaceholder")} /></label>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <ImagePicker t={t} label={t("logo")} help={t("logoHelp")} hint={t("logoHint")} value={brand.logoDataUrl} onPick={(f) => pick("logoDataUrl", f)} onClear={() => set("logoDataUrl", null)} />
          <ImagePicker t={t} label={t("icon")} help={t("iconHelp")} hint={t("iconHint")} value={brand.faviconDataUrl} onPick={(f) => pick("faviconDataUrl", f)} onClear={() => set("faviconDataUrl", null)} />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <ColorField t={t} label={t("primary")} help={t("primaryHelp")} hint={t("primaryHint")} value={brand.colorPrimary} onChange={(v) => set("colorPrimary", v)} />
          <ColorField t={t} label={t("accent")} help={t("accentHelp")} hint={t("accentHint")} value={brand.colorAccent} onChange={(v) => set("colorAccent", v)} />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm" data-help={t("supportHelp")}><span className="label">{t("support")}</span><input className="input w-full" type="email" dir="ltr" value={brand.supportEmail} onChange={(e) => set("supportEmail", e.target.value)} placeholder="help@youragency.com" /><span className="mt-1 block text-xs text-surface-400">{t("supportHint")}</span></label>
          <label className="block text-sm" data-help={t("websiteHelp")}><span className="label">{t("website")}</span><input className="input w-full" type="url" dir="ltr" value={brand.homepageUrl} onChange={(e) => set("homepageUrl", e.target.value)} placeholder="https://youragency.com" /></label>
        </div>
        {showLocale && (
          <label className="block text-sm md:max-w-md" data-help={t("localeHelp")}>
            <span className="label">{t("locale")}</span>
            <select className="input w-full" value={brand.defaultLocale ?? ""} onChange={(e) => set("defaultLocale", e.target.value)}>
              <option value="">{t("localePlatform")}</option>
              {LOCALES.map((l) => (
                <option key={l.code} value={l.code} lang={l.code}>
                  {l.name}{l.name !== l.english ? ` · ${l.english}` : ""}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-xs text-surface-400">{t("localeHint")}</span>
          </label>
        )}
        {message && <p role={message.ok ? "status" : "alert"} className={`text-sm ${message.ok ? "text-emerald-300" : "text-red-300"}`}>{message.text}</p>}
        <button className="btn-primary" disabled={busy} data-help={t("saveHelp")}>{busy ? tc("saving") : t("save")}</button>
      </div>

      <aside aria-label={t("preview")} className="space-y-3">
        <p className="studio-eyebrow">{t("previewEyebrow")}</p>
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-surface-950">
          <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
            {brand.logoDataUrl
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={brand.logoDataUrl} alt="" className="h-6 max-w-[140px] object-contain" />
              : <span className="text-sm font-semibold" style={{ color: brand.colorPrimary }}>{brand.name || t("yourBrand")}</span>}
            <span className="ms-auto h-6 w-6 rounded-full bg-white/10" />
          </div>
          <div className="p-5">
            <p className="text-lg font-semibold">{t("welcomeBack")}</p>
            <p className="mt-1 text-xs text-surface-400">{brand.tagline || t("previewTagline")}</p>
            <div className="mt-4 space-y-2"><div className="h-8 rounded-lg bg-white/5" /><div className="h-8 rounded-lg bg-white/5" /></div>
            <div className="mt-4 rounded-lg py-2 text-center text-sm font-medium text-fixed-white" style={{ background: brand.colorPrimary }}>{t("logIn")}</div>
            <p className="mt-3 text-center text-xs" style={{ color: brand.colorAccent }}>{brand.supportEmail || "help@youragency.com"}</p>
          </div>
        </div>
      </aside>
    </form>
  );
}

function ImagePicker({ t, label, hint, help, value, onPick, onClear }: { t: T; label: string; hint: string; help?: string; value: string | null; onPick: (f: File | undefined) => void; onClear: () => void }) {
  return (
    <div className="text-sm" data-help={help}>
      <span className="label">{label}</span>
      <div className="flex items-center gap-3">
        <div className="grid h-14 w-28 place-items-center overflow-hidden rounded-lg border border-white/10 bg-white/5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {value ? <img src={value} alt={t("imagePreview", { label })} className="max-h-12 max-w-[100px] object-contain" /> : <ImageUp size={18} className="text-surface-400" />}
        </div>
        <label className="btn-ghost cursor-pointer text-xs">
          {value ? t("replace") : t("upload")}
          <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml,image/x-icon" className="sr-only" onChange={(e) => onPick(e.target.files?.[0])} />
        </label>
        {value && <button type="button" className="text-surface-400 hover:text-surface-100" onClick={onClear} aria-label={t("removeImage", { label: label.toLowerCase() })} data-help={t("removeImageHelp")}><X size={16} /></button>}
      </div>
      <span className="mt-1 block text-xs text-surface-400">{hint}</span>
    </div>
  );
}

function ColorField({ t, label, hint, help, value, onChange }: { t: T; label: string; hint: string; help?: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block text-sm" data-help={help}>
      <span className="label">{label}</span>
      <span className="flex items-center gap-2">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-10 w-12 cursor-pointer rounded-lg border border-white/10 bg-transparent" aria-label={t("colorPicker", { label })} />
        <input className="input w-32 font-mono" dir="ltr" value={value} onChange={(e) => onChange(e.target.value)} pattern="#[0-9a-fA-F]{6}" aria-label={t("colorHex", { label })} />
      </span>
      <span className="mt-1 block text-xs text-surface-400">{hint}</span>
    </label>
  );
}
