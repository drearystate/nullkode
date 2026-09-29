"use client";
import { useState } from "react";

type Props = {
  projectId: string;
  /** "/app/<slug>" on the studio's address, "" on the app's own domain. */
  base: string;
  appName: string;
  /** The visitor is signed in to this app (their email, if the account has one). */
  signedIn: { email: string } | null;
  ownerSession: boolean;
  /** Opened from the emailed link: which account it's for, or that the link is no good. */
  link: { email: string } | { invalid: true } | null;
  token: string | null;
};

async function post(path: string, body: unknown, projectId: string): Promise<Response> {
  return fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json", "x-nk-project-id": projectId },
    credentials: "same-origin",
    body: JSON.stringify(body),
  });
}

async function errorText(res: Response, fallback: string): Promise<string> {
  const data = await res.json().catch(() => ({}));
  return typeof data.error === "string" && data.error.length < 300 ? data.error : fallback;
}

/** The interactive parts of an app's public "Delete your account" page. */
export function DeleteAccountForms({ projectId, base, appName, signedIn, ownerSession, link, token }: Props) {
  const [done, setDone] = useState<string | null>(null);
  if (done) {
    return (
      <div className="nk-da-card" role="status">
        <h2>{done}</h2>
        <p className="nk-da-muted">Thank you for using {appName}.</p>
        <a className="nk-da-button" href={`${base}/`}>
          Go to the home page
        </a>
      </div>
    );
  }
  return (
    <>
      {link && "email" in link && token && <ConfirmLink projectId={projectId} token={token} email={link.email} onDone={setDone} />}
      {link && "invalid" in link && (
        <p className="nk-da-card nk-da-alert" role="alert">
          This link has expired or isn&apos;t complete. Ask for a new one below.
        </p>
      )}
      {!link || "invalid" in link ? (
        <>
          {ownerSession && (
            <p className="nk-da-card nk-da-muted">You&apos;re viewing this as the app&apos;s owner, which has no account here. Visitors see their own account below.</p>
          )}
          {signedIn && <SignedIn projectId={projectId} email={signedIn.email} onDone={setDone} />}
          <RequestByEmail projectId={projectId} signedIn={Boolean(signedIn)} />
        </>
      ) : null}
    </>
  );
}

function ConfirmLink({ projectId, token, email, onDone }: { projectId: string; token: string; email: string; onDone: (m: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      const res = await post("/api/app-account/confirm", { token }, projectId);
      if (!res.ok) return setError(await errorText(res, "Something went wrong. Please try again."));
      onDone("Your account and its data were deleted.");
    } catch {
      setError("Network error. Nothing was deleted. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="nk-da-card" aria-labelledby="nk-da-confirm">
      <h2 id="nk-da-confirm">Confirm: delete the account for {email}</h2>
      <p className="nk-da-muted">This deletes the account and the information tied to it. It can&apos;t be undone.</p>
      <button type="button" className="nk-da-button nk-da-danger" onClick={confirm} disabled={busy}>
        {busy ? "Deleting…" : "Delete my account"}
      </button>
      {error && (
        <p className="nk-da-alert" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}

function SignedIn({ projectId, email, onDone }: { projectId: string; email: string; onDone: (m: string) => void }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState<"export" | "delete" | null>(null);
  const [exportNote, setExportNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function download() {
    setBusy("export");
    setExportNote(null);
    try {
      const res = await post("/api/app-account/export", {}, projectId);
      if (!res.ok) return setExportNote(await errorText(res, "Your data couldn't be downloaded. Please try again."));
      const blob = await res.blob();
      const name = /filename="([^"]+)"/.exec(res.headers.get("content-disposition") ?? "")?.[1] ?? "my-data.zip";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      setExportNote("Your download has started.");
    } catch {
      setExportNote("Network error. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  async function remove(e: React.FormEvent) {
    e.preventDefault();
    if (confirm.trim().toUpperCase() !== "DELETE") return setError("Type DELETE to confirm.");
    setBusy("delete");
    setError(null);
    try {
      const res = await post("/api/app-account/delete", { password, confirm: confirm.trim() }, projectId);
      if (!res.ok) return setError(await errorText(res, "Your account couldn't be deleted. Please try again."));
      onDone("Your account was deleted.");
    } catch {
      setError("Network error. Nothing was deleted. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <section className="nk-da-card" aria-labelledby="nk-da-download">
        <h2 id="nk-da-download">Download my data</h2>
        <p className="nk-da-muted">You&apos;re signed in{email ? ` as ${email}` : ""}. Get a copy of your account and everything tied to it, as a .zip file.</p>
        <button type="button" className="nk-da-button nk-da-secondary" onClick={download} disabled={busy !== null}>
          {busy === "export" ? "Preparing…" : "Download my data"}
        </button>
        {exportNote && (
          <p className="nk-da-muted" role="status">
            {exportNote}
          </p>
        )}
      </section>
      <form className="nk-da-card" onSubmit={remove} aria-labelledby="nk-da-delete">
        <h2 id="nk-da-delete">Delete my account</h2>
        <label htmlFor="nk-da-password">Your password</label>
        <input id="nk-da-password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        <label htmlFor="nk-da-type">Type DELETE to confirm</label>
        <input id="nk-da-type" autoComplete="off" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        <button type="submit" className="nk-da-button nk-da-danger" disabled={busy !== null}>
          {busy === "delete" ? "Deleting…" : "Delete my account"}
        </button>
        {error && (
          <p className="nk-da-alert" role="alert">
            {error}
          </p>
        )}
      </form>
    </>
  );
}

function RequestByEmail({ projectId, signedIn }: { projectId: string; signedIn: boolean }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  async function send(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await post("/api/app-account/request", { email }, projectId);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return setError(typeof data.error === "string" ? data.error : "Something went wrong. Please try again.");
      setMessage(data.message);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="nk-da-card" onSubmit={send} aria-labelledby="nk-da-request">
      <h2 id="nk-da-request">{signedIn ? "Forgot your password?" : "Can't sign in?"}</h2>
      <p className="nk-da-muted">Enter the email address you signed up with and we&apos;ll take it from there.</p>
      {message ? (
        <p role="status">{message}</p>
      ) : (
        <>
          <label htmlFor="nk-da-email">Email address</label>
          <input id="nk-da-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <button type="submit" className="nk-da-button nk-da-secondary" disabled={busy}>
            {busy ? "Sending…" : "Ask to delete my account"}
          </button>
          {error && (
            <p className="nk-da-alert" role="alert">
              {error}
            </p>
          )}
        </>
      )}
    </form>
  );
}
