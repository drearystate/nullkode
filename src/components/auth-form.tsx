"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { solvePow } from "@/lib/pow";
import { DEFAULT_NEXT, ideaFromNext, safeNext } from "@/lib/safe-next";
import { authButton, authError, authInput, authLabel, authLink } from "./auth-styles";

type Variant = "dark" | "light";

type Ticket = { challenge: string; nonce: number; issuedAt: number };

/** Server-side floor on how young a ticket may be, plus a little slack. */
const MIN_TICKET_AGE_MS = 1_800;

export function AuthForm({
  mode,
  variant = "dark",
  next = DEFAULT_NEXT,
}: {
  mode: "login" | "signup";
  variant?: Variant;
  /** Where to go once signed in: a path on this site (checked again here). */
  next?: string;
}) {
  const destination = safeNext(next);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Honeypots: hidden from people, irresistible to form-filling bots.
  const [website, setWebsite] = useState("");
  const [company, setCompany] = useState("");

  // The signup form solves a small proof-of-work puzzle in the background while
  // the user types, so submitting an account costs real CPU without costing the
  // user any visible wait.
  const ticketRef = useRef<Promise<Ticket> | null>(null);

  const requestTicket = useCallback(async (): Promise<Ticket> => {
    const res = await fetch("/api/auth/challenge", { method: "POST" });
    // Local clock, not the server's — we only ever compare it to Date.now().
    const issuedAt = Date.now();
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? "Could not start signup. Please try again.");
    const nonce = await solvePow(data.challenge, data.bits);
    return { challenge: data.challenge, nonce, issuedAt };
  }, []);

  const startTicket = useCallback(() => {
    const p = requestTicket();
    // Nothing awaits this until submit; keep the rejection from surfacing as an
    // unhandled promise in the console.
    p.catch(() => {});
    ticketRef.current = p;
    return p;
  }, [requestTicket]);

  useEffect(() => {
    if (mode !== "signup") return;
    startTicket();
  }, [mode, startTicket]);

  // variant is kept for callers; the fields follow the studio's theme now.
  void variant;
  const labelCls = authLabel;
  const inputCls = authInput;
  const errorCls = authError;

  async function post(): Promise<Response> {
    let extra: Record<string, unknown> = {};
    if (mode === "signup") {
      const ticket = await (ticketRef.current ?? startTicket());
      const wait = MIN_TICKET_AGE_MS - (Date.now() - ticket.issuedAt);
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      const { issuedAt: _issuedAt, ...proof } = ticket;
      extra = { ...proof, website, company };
      // Came from the home page's "What should your app do?" box.
      if (ideaFromNext(destination)) extra.arrivedWithIdea = true;
    }
    return fetch(`/api/auth/${mode}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password, name: name || undefined, ...extra }),
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      let res = await post();
      if (!res.ok && mode === "signup") {
        const data = await res.clone().json().catch(() => ({}));
        // The ticket went stale (single use, or the page sat open too long).
        // Mint a fresh one and resubmit once so the user never sees this.
        if (data.retryable) {
          startTicket();
          res = await post();
        }
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (mode === "signup") startTicket();
        throw new Error(data.error ?? "Something went wrong");
      }
      window.location.href = destination;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      {mode === "signup" && (
        <>
          <div
            aria-hidden="true"
            className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden"
          >
            <label>
              Website
              <input
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </label>
            <label>
              Company
              <input
                type="text"
                name="company"
                tabIndex={-1}
                autoComplete="off"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
            </label>
          </div>
          <div>
            <label className={labelCls} htmlFor="auth-name">Name</label>
            <input
              id="auth-name"
              autoComplete="name"
              className={inputCls}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
            />
          </div>
        </>
      )}
      <div>
        <label className={labelCls} htmlFor="auth-email">Email</label>
        <input
          id="auth-email"
          autoComplete="email"
          className={inputCls}
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
      </div>
      <div>
        <div className="flex items-baseline justify-between">
          <label className={labelCls} htmlFor="auth-password">Password</label>
          {mode === "login" && <a href="/forgot-password" className={`text-xs ${authLink}`}>Forgot password?</a>}
        </div>
        <input
          id="auth-password"
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          className={inputCls}
          type="password"
          required
          minLength={mode === "signup" ? 8 : 1}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters"
        />
      </div>
      {error && <div className={errorCls}>{error}</div>}
      <button type="submit" disabled={busy} className={authButton}>
        {busy ? (mode === "signup" ? "Creating your account…" : "Signing in…") : mode === "signup" ? "Create account" : "Log in"}
      </button>
    </form>
  );
}
