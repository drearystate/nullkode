"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

const PLANS = ["FREE", "STARTER", "PRO", "TEAM"] as const;

/** Plan picker and "password link" for one person in Admin → Users. */
export function UserPlanSelect({ userId, plan }: { userId: string; plan: string }) {
  const [value, setValue] = useState(plan);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const t = useTranslations("admin");
  async function change(next: string) {
    setValue(next);
    setState("saving");
    const res = await fetch(`/api/admin/users/${userId}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ plan: next }) });
    setState(res.ok ? "saved" : "error");
  }
  return (
    <span className="inline-flex items-center gap-2">
      <select aria-label={t("users.plan")} data-help={t("users.planHelp")} className="input h-8 min-h-0 w-auto py-0 text-xs" value={value} onChange={(e) => change(e.target.value)}>
        {PLANS.map((p) => <option key={p} value={p}>{t(`plans.${p}`)}</option>)}
      </select>
      {state === "saved" && <span className="text-xs text-emerald-300">{t("users.saved")}</span>}
      {state === "error" && <span className="text-xs text-red-300">{t("users.couldntSave")}</span>}
    </span>
  );
}

export function PasswordLinkButton({ userId, email }: { userId: string; email: string }) {
  const [result, setResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const t = useTranslations("admin");
  async function make() {
    setBusy(true);
    const res = await fetch(`/api/admin/users/${userId}/link`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ purpose: "reset" }) });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setResult(data.error || t("users.linkFailed"));
    if (data.emailed) return setResult(t("users.linkEmailed", { email }));
    await navigator.clipboard.writeText(data.link).catch(() => {});
    setResult(t("users.linkCopied"));
  }
  return (
    <span className="inline-flex items-center gap-2">
      <button type="button" className="btn-ghost h-8 min-h-0 px-3 text-xs" onClick={make} disabled={busy} data-help={t("users.passwordLinkHelp")}>{busy ? t("users.making") : t("users.passwordLink")}</button>
      {result && <span role="status" className="max-w-[16rem] text-start text-xs text-surface-300">{result}</span>}
    </span>
  );
}

type DeletePreview = {
  email: string;
  apps: Array<{ id: string; name: string; hasUploadKey: boolean }>;
  paying: boolean;
  reseller: string | null;
  self: boolean;
};

/**
 * "Delete" in Admin → Users: shows what goes (apps, upload keys, a running
 * subscription), asks for the person's email, then deletes the account.
 */
export function DeleteUserButton({ userId, email }: { userId: string; email: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [info, setInfo] = useState<DeletePreview | null>(null);
  const [typed, setTyped] = useState("");
  const [keysAck, setKeysAck] = useState(false);
  const [billingAsk, setBillingAsk] = useState(false);
  const [billingHandled, setBillingHandled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const t = useTranslations("admin");
  const tc = useTranslations("common");

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setInfo(null);
    setError(null);
    fetch(`/api/admin/users/${userId}`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!alive) return;
        if (!res.ok) setError(data.error || t("users.loadFailed"));
        else setInfo(data as DeletePreview);
      })
      .catch(() => alive && setError(t("users.networkError")));
    return () => {
      alive = false;
    };
  }, [open, userId, t]);

  useEffect(() => {
    if (open && info) inputRef.current?.focus();
  }, [open, info]);

  function close() {
    if (busy) return;
    setOpen(false);
    setTyped("");
    setKeysAck(false);
    setBillingAsk(false);
    setBillingHandled(false);
  }

  const keyed = info?.apps.filter((a) => a.hasUploadKey) ?? [];
  const canDelete =
    Boolean(info) && !info!.reseller && !info!.self && typed.trim().toLowerCase() === email.toLowerCase() && (keyed.length === 0 || keysAck) && (!billingAsk || billingHandled);

  async function remove(e: React.FormEvent) {
    e.preventDefault();
    if (!canDelete) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ confirmEmail: typed.trim(), billingHandled }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.code === "billing") setBillingAsk(true);
        setError(data.error || t("users.deleteFailed", { status: res.status }));
        return;
      }
      setDone(true);
      setOpen(false);
      router.refresh();
    } catch {
      setError(t("users.networkError"));
    } finally {
      setBusy(false);
    }
  }

  if (done) return <span className="text-xs text-surface-400">{t("users.deleted")}</span>;

  return (
    <>
      <button type="button" className="btn-ghost h-8 min-h-0 px-3 text-xs text-red-300 hover:text-red-200" onClick={() => setOpen(true)} data-help={t("users.deleteHelp")}>
        {t("users.delete")}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 text-start sm:items-center" onClick={close}>
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby={`delete-user-${userId}`}
            className="card w-full max-w-lg p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Escape") close();
            }}
            onSubmit={remove}
          >
            <h3 id={`delete-user-${userId}`} className="text-lg font-semibold text-red-200">
              {t("users.deleteTitle", { email })}
            </h3>
            {!info && !error && <p className="mt-3 text-sm text-surface-400">{t("users.checking")}</p>}
            {info && (
              <div className="mt-3 space-y-3 text-sm text-surface-300">
                <p>
                  {info.apps.length === 0 ? t("users.deleteNone") : info.apps.length === 1 ? t("users.deleteOne") : t("users.deleteMany", { count: info.apps.length })}
                  {info.paying ? ` ${t("users.deletePaying")}` : ""} {t("users.cantUndo")}
                </p>
                {info.apps.length > 0 && (
                  <ul className="max-h-32 list-disc overflow-y-auto ps-5 text-xs text-surface-400">
                    {info.apps.map((a) => (
                      <li key={a.id}>
                        {a.hasUploadKey ? t("users.appWithKey", { name: a.name }) : a.name}
                      </li>
                    ))}
                  </ul>
                )}
                {info.reseller && (
                  <p role="alert" className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-amber-100">
                    {t("users.isReseller", { name: info.reseller })}
                  </p>
                )}
                {info.self && <p role="alert" className="text-amber-200">{t("users.isSelf")}</p>}
                {keyed.length > 0 && (
                  <label className="flex items-start gap-2 rounded-lg border border-red-800/60 bg-red-950/30 p-3 text-red-100">
                    <input type="checkbox" className="mt-1" checked={keysAck} onChange={(e) => setKeysAck(e.target.checked)} />
                    <span>
                      {keyed.length === 1 ? t("users.keysAckOne") : t("users.keysAckMany", { count: keyed.length })}
                    </span>
                  </label>
                )}
                {billingAsk && (
                  <label className="flex items-start gap-2 rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-amber-100">
                    <input type="checkbox" className="mt-1" checked={billingHandled} onChange={(e) => setBillingHandled(e.target.checked)} />
                    <span>{t("users.billingHandled")}</span>
                  </label>
                )}
                {!info.reseller && !info.self && (
                  <label className="block">
                    <span className="label">{t("users.typeEmail")}</span>
                    <input ref={inputRef} className="input w-full" type="email" autoComplete="off" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={email} />
                  </label>
                )}
              </div>
            )}
            {error && (
              <p role="alert" className="mt-3 text-sm text-red-300">
                {error}
              </p>
            )}
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" className="btn-ghost" onClick={close} disabled={busy}>
                {tc("cancel")}
              </button>
              <button
                type="submit"
                className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-fixed-white transition hover:bg-red-600 [[data-theme=light]_&]:bg-red-300 [[data-theme=light]_&]:hover:bg-red-400 disabled:opacity-50"
                disabled={!canDelete || busy}
              >
                {busy ? t("users.deleting") : t("users.deleteAccount")}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
