"use client";
import { useState } from "react";
import { Download } from "lucide-react";

export type DeleteAccountApp = { id: string; name: string; hasUploadKey: boolean };

/**
 * "Delete my account" on the Billing page (there's no separate account
 * page). Lists each app with its backup download (and upload key, for apps
 * on Google Play), then asks for the person's email to confirm.
 */
export function DeleteAccountCard({
  email,
  apps,
  paying,
  blocked,
}: {
  email: string;
  apps: DeleteAccountApp[];
  /** A subscription is running and will be cancelled. */
  paying: boolean;
  /** Why the account can't be deleted here (reseller workspace, only operator, admin acting as this person). */
  blocked: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [keysAck, setKeysAck] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const keyed = apps.filter((a) => a.hasUploadKey);
  const ready = typed.trim().toLowerCase() === email.toLowerCase() && (keyed.length === 0 || keysAck);

  async function remove(e: React.FormEvent) {
    e.preventDefault();
    if (!ready) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/me/account", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ confirmEmail: typed.trim(), keysBackedUp: keysAck }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || `Your account couldn't be deleted (${res.status}).`);
        setBusy(false);
        return;
      }
      window.location.href = "/";
    } catch {
      setError("Network error. Nothing was deleted.");
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="delete-account-heading" className="card mt-12 border-red-900/40 p-6">
      <h2 id="delete-account-heading" className="font-semibold text-red-300">
        Delete my account
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-surface-400">
        {apps.length === 0
          ? "Deletes your account."
          : `Deletes your account and ${apps.length === 1 ? "your app" : `all ${apps.length} of your apps`}, with everything ${apps.length === 1 ? "it" : "they"} saved, ${apps.length === 1 ? "its" : "their"} files and ${apps.length === 1 ? "its" : "their"} web addresses.`}
        {paying ? " Your subscription is cancelled right away." : ""} This can&apos;t be undone.
      </p>

      {apps.length > 0 && (
        <div className="mt-4">
          <p className="text-sm text-surface-300">Download a backup of each app first. You can bring a backup back later with Import.</p>
          <ul className="mt-2 divide-y divide-white/[0.06] rounded-lg border border-white/[0.08]">
            {apps.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                <span className="min-w-0 truncate">{a.name}</span>
                <span className="flex flex-wrap gap-3">
                  <a href={`/api/projects/${a.id}/export`} className="inline-flex items-center gap-1 text-brand-300 hover:underline" download>
                    <Download size={13} aria-hidden /> Backup
                  </a>
                  {a.hasUploadKey && (
                    <a href={`/api/projects/${a.id}/native/keystore/download`} className="inline-flex items-center gap-1 text-red-200 hover:underline" download>
                      <Download size={13} aria-hidden /> Google Play upload key
                    </a>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {blocked ? (
        <p role="status" className="mt-4 rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-100">
          {blocked}
        </p>
      ) : !open ? (
        <button
          type="button"
          className="mt-5 rounded-lg border border-red-800 px-4 py-2 text-sm font-medium text-red-300 transition hover:bg-red-950/40"
          onClick={() => setOpen(true)}
        >
          Delete my account…
        </button>
      ) : (
        <form onSubmit={remove} className="mt-5 max-w-xl space-y-3 rounded-lg border border-red-800 bg-red-950/30 p-4">
          {keyed.length > 0 && (
            <label className="flex items-start gap-2 text-sm text-red-100">
              <input type="checkbox" className="mt-1" checked={keysAck} onChange={(e) => setKeysAck(e.target.checked)} />
              <span>
                I&apos;ve downloaded the Google Play upload {keyed.length === 1 ? "key" : "keys"} above, or I don&apos;t need {keyed.length === 1 ? "it" : "them"}. Without the key an app can never be updated on Google Play again.
              </span>
            </label>
          )}
          <label className="block text-sm">
            <span className="label">Type your email address to confirm</span>
            <input
              className="input w-full"
              type="email"
              autoComplete="off"
              autoFocus
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={email}
              disabled={busy}
            />
          </label>
          {error && (
            <p role="alert" className="text-sm text-red-300">
              {error}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={!ready || busy}
              className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600 disabled:opacity-50"
            >
              {busy ? "Deleting…" : "Delete my account for good"}
            </button>
            <button
              type="button"
              className="rounded-lg border border-surface-700 px-4 py-2 text-sm text-surface-300 transition hover:bg-surface-800"
              onClick={() => {
                setOpen(false);
                setTyped("");
                setError(null);
              }}
              disabled={busy}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
