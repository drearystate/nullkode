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
  /** The page's texts in the app's language (runtime.json "account"). */
  words: Words;
};

type Words = Record<string, string>;

/** A text with its {placeholders} filled. */
function fill(text: string | undefined, vars: Record<string, string>): string {
  return (text ?? "").replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? vars[k] : m));
}

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
export function DeleteAccountForms({ projectId, base, appName, signedIn, ownerSession, link, token, words: w }: Props) {
  const [done, setDone] = useState<string | null>(null);
  if (done) {
    return (
      <div className="nk-da-card" role="status">
        <h2>{done}</h2>
        <p className="nk-da-muted">{fill(w.thanks, { app: appName })}</p>
        <a className="nk-da-button" href={`${base}/`}>
          {w.home}
        </a>
      </div>
    );
  }
  return (
    <>
      {link && "email" in link && token && <ConfirmLink projectId={projectId} token={token} email={link.email} onDone={setDone} w={w} />}
      {link && "invalid" in link && (
        <p className="nk-da-card nk-da-alert" role="alert">
          {w.linkExpired}
        </p>
      )}
      {!link || "invalid" in link ? (
        <>
          {ownerSession && (
            <p className="nk-da-card nk-da-muted">{w.ownerView}</p>
          )}
          {signedIn && <SignedIn projectId={projectId} email={signedIn.email} onDone={setDone} w={w} />}
          <RequestByEmail projectId={projectId} signedIn={Boolean(signedIn)} w={w} />
        </>
      ) : null}
    </>
  );
}

function ConfirmLink({ projectId, token, email, onDone, w }: { projectId: string; token: string; email: string; onDone: (m: string) => void; w: Words }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      const res = await post("/api/app-account/confirm", { token }, projectId);
      if (!res.ok) return setError(await errorText(res, w.genericError));
      onDone(w.deletedAll);
    } catch {
      setError(w.networkNothingDeleted);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="nk-da-card" aria-labelledby="nk-da-confirm">
      <h2 id="nk-da-confirm">{fill(w.confirmTitle, { email })}</h2>
      <p className="nk-da-muted">{w.confirmBody}</p>
      <button type="button" className="nk-da-button nk-da-danger" onClick={confirm} disabled={busy}>
        {busy ? w.deleting : w.deleteMine}
      </button>
      {error && (
        <p className="nk-da-alert" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}

function SignedIn({ projectId, email, onDone, w }: { projectId: string; email: string; onDone: (m: string) => void; w: Words }) {
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
      if (!res.ok) return setExportNote(await errorText(res, w.downloadFailed));
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
      setExportNote(w.downloadStarted);
    } catch {
      setExportNote(w.networkError);
    } finally {
      setBusy(null);
    }
  }

  async function remove(e: React.FormEvent) {
    e.preventDefault();
    if (confirm.trim().toUpperCase() !== "DELETE") return setError(w.typeDelete);
    setBusy("delete");
    setError(null);
    try {
      const res = await post("/api/app-account/delete", { password, confirm: confirm.trim() }, projectId);
      if (!res.ok) return setError(await errorText(res, w.deleteFailed));
      onDone(w.deleted);
    } catch {
      setError(w.networkNothingDeleted);
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <section className="nk-da-card" aria-labelledby="nk-da-download">
        <h2 id="nk-da-download">{w.downloadTitle}</h2>
        <p className="nk-da-muted">{email ? fill(w.signedInAs, { email }) : w.signedIn}</p>
        <button type="button" className="nk-da-button nk-da-secondary" onClick={download} disabled={busy !== null}>
          {busy === "export" ? w.preparing : w.downloadTitle}
        </button>
        {exportNote && (
          <p className="nk-da-muted" role="status">
            {exportNote}
          </p>
        )}
      </section>
      <form className="nk-da-card" onSubmit={remove} aria-labelledby="nk-da-delete">
        <h2 id="nk-da-delete">{w.deleteMine}</h2>
        <label htmlFor="nk-da-password">{w.password}</label>
        <input id="nk-da-password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        <label htmlFor="nk-da-type">{w.typeDeleteLabel}</label>
        <input id="nk-da-type" autoComplete="off" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        <button type="submit" className="nk-da-button nk-da-danger" disabled={busy !== null}>
          {busy === "delete" ? w.deleting : w.deleteMine}
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

function RequestByEmail({ projectId, signedIn, w }: { projectId: string; signedIn: boolean; w: Words }) {
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
      if (!res.ok) return setError(typeof data.error === "string" ? data.error : w.genericError);
      setMessage(data.message);
    } catch {
      setError(w.networkError);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="nk-da-card" onSubmit={send} aria-labelledby="nk-da-request">
      <h2 id="nk-da-request">{signedIn ? w.forgot : w.cantSignIn}</h2>
      <p className="nk-da-muted">{w.requestIntro}</p>
      {message ? (
        <p role="status">{message}</p>
      ) : (
        <>
          <label htmlFor="nk-da-email">{w.email}</label>
          <input id="nk-da-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <button type="submit" className="nk-da-button nk-da-secondary" disabled={busy}>
            {busy ? w.sending : w.ask}
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
