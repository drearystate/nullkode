"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Camera } from "lucide-react";
import { useTranslations } from "next-intl";
import { setHelpTips, useHelpTipsOn } from "./help-tips";
import { ThemeChoice } from "./theme-toggle";
import { LanguagePicker } from "./language-picker";
import { UserAvatar } from "./user-avatar";

type Status = { kind: "ok" | "error"; text: string } | null;

function Note({ status }: { status: Status }) {
  if (!status) return null;
  return (
    <p role={status.kind === "error" ? "alert" : "status"} className={`mt-3 text-sm ${status.kind === "error" ? "text-red-400" : "text-emerald-400"}`}>
      {status.text}
    </p>
  );
}

/** Crops the picture to a centred square and shrinks it to 256×256, in the browser. */
async function squarePhoto(file: File, badPicture: string): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error(badPicture));
      i.src = url;
    });
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext("2d");
    if (!ctx || !side) throw new Error(badPicture);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, 256, 256);
    const webp = canvas.toDataURL("image/webp", 0.86);
    return webp.startsWith("data:image/webp") ? webp : canvas.toDataURL("image/jpeg", 0.86);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function ProfileCard({ name: initialName, email, avatarUrl: initialAvatar, readOnly }: { name: string; email: string; avatarUrl: string | null; readOnly: boolean }) {
  const router = useRouter();
  const t = useTranslations("account.profile");
  const [name, setName] = useState(initialName);
  const [saved, setSaved] = useState(initialName);
  const [avatar, setAvatar] = useState(initialAvatar);
  const [busy, setBusy] = useState<"name" | "photo" | null>(null);
  const [status, setStatus] = useState<Status>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy("name");
    setStatus(null);
    const res = await fetch("/api/me/profile", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ name }) }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    setBusy(null);
    if (res?.ok) {
      setSaved(data.name ?? name.trim());
      setStatus({ kind: "ok", text: t("saved") });
      router.refresh();
    } else {
      setStatus({ kind: "error", text: data?.error || t("saveFailed") });
    }
  }

  async function pick(file: File | undefined) {
    if (!file) return;
    setBusy("photo");
    setStatus(null);
    try {
      const dataUrl = await squarePhoto(file, t("badPicture"));
      const res = await fetch("/api/me/avatar", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ dataUrl }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || t("photoSaveFailed"));
      setAvatar(dataUrl);
      setStatus({ kind: "ok", text: t("photoSaved") });
      router.refresh();
    } catch (err) {
      setStatus({ kind: "error", text: err instanceof Error ? err.message : t("photoSaveFailedShort") });
    } finally {
      setBusy(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function removePhoto() {
    setBusy("photo");
    setStatus(null);
    const res = await fetch("/api/me/avatar", { method: "DELETE" }).catch(() => null);
    setBusy(null);
    if (res?.ok) {
      setAvatar(null);
      setStatus({ kind: "ok", text: t("photoRemoved") });
      router.refresh();
    } else {
      setStatus({ kind: "error", text: t("photoRemoveFailed") });
    }
  }

  return (
    <section aria-labelledby="profile-heading" className="card p-6">
      <h2 id="profile-heading" className="font-semibold">{t("title")}</h2>
      <div className="mt-5 flex flex-wrap items-center gap-5">
        <UserAvatar name={saved || null} email={email} avatarUrl={avatar} size={88} className="text-2xl" />
        {!readOnly && (
          <div className="flex flex-wrap gap-2">
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" id="avatar-file" onChange={(e) => void pick(e.target.files?.[0])} />
            <button type="button" className="btn-secondary" disabled={busy !== null} onClick={() => fileRef.current?.click()} data-help={t("photoHelp")}>
              <Camera size={15} />
              {busy === "photo" ? t("saving") : avatar ? t("changePhoto") : t("addPhoto")}
            </button>
            {avatar && (
              <button type="button" className="btn-ghost" disabled={busy !== null} onClick={() => void removePhoto()} data-help={t("removeHelp")}>
                {t("remove")}
              </button>
            )}
          </div>
        )}
      </div>
      <form onSubmit={save} className="mt-6 grid max-w-md gap-4">
        <div>
          <label htmlFor="account-name" className="label">{t("name")}</label>
          <input id="account-name" className="input" value={name} maxLength={100} onChange={(e) => setName(e.target.value)} disabled={readOnly} data-help={t("nameHelp")} />
        </div>
        <div>
          <label htmlFor="account-email" className="label">{t("email")}</label>
          <input id="account-email" className="input" dir="ltr" value={email} readOnly disabled />
          <p className="mt-1 text-xs text-surface-500">{t("emailNote")}</p>
        </div>
        {!readOnly && (
          <div>
            <button className="btn-primary" disabled={busy !== null || !name.trim() || name.trim() === saved}>{busy === "name" ? t("saving") : t("save")}</button>
          </div>
        )}
      </form>
      <Note status={status} />
    </section>
  );
}

export function AppearanceCard() {
  const t = useTranslations("account.appearance");
  return (
    <section aria-labelledby="appearance-heading" className="card p-6">
      <h2 id="appearance-heading" className="font-semibold">{t("title")}</h2>
      <p className="mt-1 text-sm text-surface-400">{t("intro")}</p>
      <div className="mt-4">
        <ThemeChoice />
      </div>
    </section>
  );
}

export function LanguageCard() {
  const t = useTranslations("account.language");
  return (
    <section aria-labelledby="language-heading" className="card p-6">
      <h2 id="language-heading" className="font-semibold">{t("title")}</h2>
      <p className="mt-1 text-sm text-surface-400">{t("intro")}</p>
      <div className="mt-4">
        <LanguagePicker signedIn />
      </div>
    </section>
  );
}

export function PasswordCard({ readOnly }: { readOnly: boolean }) {
  const t = useTranslations("account.password");
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setStatus(null);
    const res = await fetch("/api/me/password", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ current, next }) }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    setBusy(false);
    if (res?.ok) {
      setCurrent("");
      setNext("");
      setStatus({ kind: "ok", text: t("changed") });
    } else {
      setStatus({ kind: "error", text: data?.error || t("failed") });
    }
  }
  return (
    <section aria-labelledby="password-heading" className="card p-6">
      <h2 id="password-heading" className="font-semibold">{t("title")}</h2>
      {readOnly ? (
        <p className="mt-2 text-sm text-surface-400">{t("readOnly")}</p>
      ) : (
        <>
          <form onSubmit={save} className="mt-4 grid max-w-md gap-4">
            <div>
              <label htmlFor="current-password" className="label">{t("current")}</label>
              <input id="current-password" type="password" autoComplete="current-password" className="input" value={current} onChange={(e) => setCurrent(e.target.value)} />
            </div>
            <div>
              <label htmlFor="new-password" className="label">{t("new")}</label>
              <input id="new-password" type="password" autoComplete="new-password" minLength={8} className="input" value={next} onChange={(e) => setNext(e.target.value)} />
              <p className="mt-1 text-xs text-surface-500">{t("newNote")}</p>
            </div>
            <div>
              <button className="btn-primary" disabled={busy || !current || next.length < 8}>{busy ? t("changing") : t("change")}</button>
            </div>
          </form>
          <p className="mt-4 text-xs text-surface-500">
            {t.rich("forgotNote", { link: (c) => <Link href="/forgot-password" className="text-brand-300 hover:underline">{c}</Link> })}
          </p>
        </>
      )}
      <Note status={status} />
    </section>
  );
}

export function HelpPrefsCard({ initialOn }: { initialOn: boolean }) {
  const on = useHelpTipsOn(initialOn);
  const t = useTranslations("account.helpPrefs");
  const [status, setStatus] = useState<Status>(null);
  async function toggle() {
    setStatus(null);
    const saved = await setHelpTips(!on);
    if (!saved) setStatus({ kind: "error", text: t("saveFailed") });
  }
  return (
    <section aria-labelledby="help-prefs-heading" className="card p-6">
      <h2 id="help-prefs-heading" className="font-semibold">{t("title")}</h2>
      <div className="mt-4 flex items-start justify-between gap-6">
        <div>
          <p id="help-tips-label" className="text-sm font-medium text-surface-100">{t("tips")}</p>
          <p className="mt-1 max-w-xl text-sm text-surface-400">{t("tipsIntro")}</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-labelledby="help-tips-label"
          onClick={() => void toggle()}
          className={`relative mt-1 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${on ? "bg-brand-500" : "bg-white/15"}`}
        >
          <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${on ? "translate-x-5 rtl:-translate-x-5" : "translate-x-0.5 rtl:-translate-x-0.5"}`} />
        </button>
      </div>
      <p className="mt-4 text-sm text-surface-400">
        {t.rich("guides", { link: (c) => <Link href="/help" className="text-brand-300 hover:underline">{c}</Link> })}
      </p>
      <Note status={status} />
    </section>
  );
}
