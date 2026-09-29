"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const PLANS = ["FREE", "STARTER", "PRO", "TEAM"] as const;
const title = (p: string) => p[0] + p.slice(1).toLowerCase();

/** Plan picker and "password link" for one person in Admin → Users. */
export function UserPlanSelect({ userId, plan }: { userId: string; plan: string }) {
  const [value, setValue] = useState(plan);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  async function change(next: string) {
    setValue(next);
    setState("saving");
    const res = await fetch(`/api/admin/users/${userId}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ plan: next }) });
    setState(res.ok ? "saved" : "error");
  }
  return (
    <span className="inline-flex items-center gap-2">
      <select aria-label="Plan" data-help="Changes their plan straight away. It doesn't charge them or change any Stripe subscription, and a later payment update from Stripe can switch it back." className="input h-8 min-h-0 w-auto py-0 text-xs" value={value} onChange={(e) => change(e.target.value)}>
        {PLANS.map((p) => <option key={p} value={p}>{title(p)}</option>)}
      </select>
      {state === "saved" && <span className="text-xs text-emerald-300">Saved</span>}
      {state === "error" && <span className="text-xs text-red-300">Couldn&apos;t save</span>}
    </span>
  );
}

export function PasswordLinkButton({ userId, email }: { userId: string; email: string }) {
  const [result, setResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function make() {
    setBusy(true);
    const res = await fetch(`/api/admin/users/${userId}/link`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ purpose: "reset" }) });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setResult(data.error || "Couldn't make a link.");
    if (data.emailed) return setResult(`Emailed to ${email}.`);
    await navigator.clipboard.writeText(data.link).catch(() => {});
    setResult("Link copied. Send it to them; it works once for 2 hours.");
  }
  return (
    <span className="inline-flex items-center gap-2">
      <button type="button" className="btn-ghost h-8 min-h-0 px-3 text-xs" onClick={make} disabled={busy} data-help="Makes a one-time link for them to choose a new password, valid for 2 hours. It's emailed to them if email is on; otherwise it's copied for you to send.">{busy ? "Making…" : "Password link"}</button>
      {result && <span role="status" className="max-w-[16rem] text-left text-xs text-surface-300">{result}</span>}
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

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setInfo(null);
    setError(null);
    fetch(`/api/admin/users/${userId}`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!alive) return;
        if (!res.ok) setError(data.error || "Couldn't load this account.");
        else setInfo(data as DeletePreview);
      })
      .catch(() => alive && setError("Network error. Try again."));
    return () => {
      alive = false;
    };
  }, [open, userId]);

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
        setError(data.error || `Couldn't delete (${res.status}).`);
        return;
      }
      setDone(true);
      setOpen(false);
      router.refresh();
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (done) return <span className="text-xs text-surface-400">Deleted</span>;

  return (
    <>
      <button type="button" className="btn-ghost h-8 min-h-0 px-3 text-xs text-red-300 hover:text-red-200" onClick={() => setOpen(true)} data-help="Permanently deletes their account and all their apps, data and files, cancelling any subscription first. You'll see what goes before you confirm. Can't be undone.">
        Delete
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 text-left sm:items-center" onClick={close}>
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
              Delete {email}?
            </h3>
            {!info && !error && <p className="mt-3 text-sm text-surface-400">Checking what this account has…</p>}
            {info && (
              <div className="mt-3 space-y-3 text-sm text-surface-300">
                <p>
                  {info.apps.length === 0
                    ? "This deletes their account. They have no apps."
                    : info.apps.length === 1
                      ? "This deletes their account and their app, with everything the app saved and its files."
                      : `This deletes their account and all ${info.apps.length} of their apps, with everything the apps saved and their files.`}
                  {info.paying ? " Their subscription is cancelled first." : ""} This can&apos;t be undone.
                </p>
                {info.apps.length > 0 && (
                  <ul className="max-h-32 list-disc overflow-y-auto pl-5 text-xs text-surface-400">
                    {info.apps.map((a) => (
                      <li key={a.id}>
                        {a.name}
                        {a.hasUploadKey ? " (has a Google Play upload key)" : ""}
                      </li>
                    ))}
                  </ul>
                )}
                {info.reseller && (
                  <p role="alert" className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-amber-100">
                    They run the reseller workspace &ldquo;{info.reseller}&rdquo;. Remove it under Admin, Resellers first, then delete the account.
                  </p>
                )}
                {info.self && <p role="alert" className="text-amber-200">This is your own account. Use Delete my account in Settings.</p>}
                {keyed.length > 0 && (
                  <label className="flex items-start gap-2 rounded-lg border border-red-800/60 bg-red-950/30 p-3 text-red-100">
                    <input type="checkbox" className="mt-1" checked={keysAck} onChange={(e) => setKeysAck(e.target.checked)} />
                    <span>
                      {keyed.length === 1 ? "One app has" : `${keyed.length} apps have`} a Google Play upload key. Only the app&apos;s owner can download it. I understand it will be lost, and the owner could never update that app on Google Play again.
                    </span>
                  </label>
                )}
                {billingAsk && (
                  <label className="flex items-start gap-2 rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-amber-100">
                    <input type="checkbox" className="mt-1" checked={billingHandled} onChange={(e) => setBillingHandled(e.target.checked)} />
                    <span>I&apos;ve cancelled their subscription in the payment dashboard myself.</span>
                  </label>
                )}
                {!info.reseller && !info.self && (
                  <label className="block">
                    <span className="label">Type their email to confirm</span>
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
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600 disabled:opacity-50"
                disabled={!canDelete || busy}
              >
                {busy ? "Deleting…" : "Delete account"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
