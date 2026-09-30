"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, BellRing, Check, Send } from "lucide-react";

type Table = { name: string; label: string; mode: "instant" | "off"; defaultMode: "instant" | "off" };
type View = {
  emailOn: boolean;
  canSetUpEmail: boolean;
  ownerEmail: string;
  tables: Table[];
  extraRecipients: string[];
  maxExtra: number;
  testSentAt: string | null;
};

const EMAIL_OFF = "Email isn't set up on this server, so alerts can't be sent. Ask your provider to connect email.";

async function sendTest(projectId: string): Promise<{ ok: boolean; text: string }> {
  try {
    const r = await fetch(`/api/projects/${projectId}/alerts/test`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
    const d = await r.json().catch(() => null);
    if (!d?.ok) return { ok: false, text: d?.error || "The test couldn't be sent." };
    const to: string[] = Array.isArray(d.to) ? d.to : [];
    return { ok: true, text: `Sent a test ${String(d.table ?? "submission").toLowerCase()} alert to ${to.join(", ") || "you"}. Look for an email marked (test).` };
  } catch {
    return { ok: false, text: "The test couldn't be sent. Check your connection and try again." };
  }
}

/** Email me when people send something: on or off per table, and up to 3 more addresses. */
export function AlertsCard({ projectId }: { projectId: string }) {
  const [view, setView] = useState<View | null>(null);
  const [modes, setModes] = useState<Record<string, "instant" | "off">>({});
  const [extra, setExtra] = useState("");
  const [busy, setBusy] = useState<"" | "save" | "test">("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [loadError, setLoadError] = useState("");

  const apply = useCallback((v: View) => {
    setView(v);
    setModes(Object.fromEntries(v.tables.map((t) => [t.name, t.mode])));
    setExtra(v.extraRecipients.join(", "));
  }, []);

  useEffect(() => {
    fetch(`/api/projects/${projectId}/alerts`, { cache: "no-store" })
      .then(async (r) => {
        const d = await r.json().catch(() => null);
        if (!r.ok || !d) throw new Error(d?.error || "Couldn't load the alert settings.");
        apply(d as View);
      })
      .catch((e) => setLoadError(e instanceof Error ? e.message : "Couldn't load the alert settings."));
  }, [projectId, apply]);

  const extraList = useMemo(() => extra.split(/[,;\s]+/).map((s) => s.trim()).filter(Boolean), [extra]);
  const dirty = useMemo(() => {
    if (!view) return false;
    return view.tables.some((t) => modes[t.name] !== t.mode) || extraList.join(",").toLowerCase() !== view.extraRecipients.join(",").toLowerCase();
  }, [view, modes, extraList]);

  if (loadError) return <section className="card mt-6 p-6 text-sm text-red-300" role="alert">{loadError}</section>;
  if (!view) return null;

  async function save() {
    if (!view) return;
    if (extraList.length > view.maxExtra) {
      setMessage({ ok: false, text: `You can add up to ${view.maxExtra} more addresses.` });
      return;
    }
    setBusy("save");
    setMessage(null);
    try {
      const r = await fetch(`/api/projects/${projectId}/alerts`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tables: modes, extraRecipients: extraList }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok || !d) throw new Error(d?.error || "Couldn't save the alert settings.");
      apply(d as View);
      setMessage({ ok: true, text: "Saved." });
    } catch (e) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : "Couldn't save the alert settings." });
    } finally {
      setBusy("");
    }
  }

  async function test() {
    setBusy("test");
    setMessage(null);
    setMessage(await sendTest(projectId));
    setBusy("");
  }

  const on = view.tables.filter((t) => modes[t.name] === "instant").length;

  return (
    <section className="card mt-6 p-6" aria-labelledby="alerts-heading" id="alerts" data-testid="alerts-card">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="alerts-heading" className="flex items-center gap-2 font-semibold" data-help="Emails you when visitors send something through your app, like a form, booking or order. You choose which tables send alerts.">
          <BellRing size={17} className="text-brand-300" aria-hidden />
          Alerts
        </h2>
        <span className="text-xs text-surface-400">{on ? `${on} of ${view.tables.length} on` : "All off"}</span>
      </div>
      <p className="mt-1 text-sm text-surface-400">Get an email as soon as someone sends a form, books or orders in your app.</p>

      {!view.emailOn && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-400/25 bg-amber-400/[0.07] p-3 text-sm text-amber-100" role="status">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-300" aria-hidden />
          <span>
            {EMAIL_OFF}
            {view.canSetUpEmail && <> <Link href="/admin/settings#email" className="font-medium underline" data-help="Open the server settings to connect an email service, so apps can send emails.">Set up email</Link></>}
          </span>
        </div>
      )}

      {view.tables.length === 0 ? (
        <p className="mt-4 text-sm text-surface-400">Your app doesn&apos;t collect anything from visitors yet. When you add a form or a feature such as Bookings, you can choose alerts for it here.</p>
      ) : (
        <ul className="mt-4 divide-y divide-white/[0.06]">
          {view.tables.map((t) => {
            const checked = modes[t.name] === "instant";
            const id = `alert-${t.name}`;
            return (
              <li key={t.name} className="flex items-center justify-between gap-4 py-2.5">
                <span className="min-w-0">
                  <span id={id} className="block truncate text-sm">{t.label}</span>
                  {t.defaultMode === "instant" && <span className="block text-xs text-surface-400">Looks like a form, so it&apos;s on unless you turn it off</span>}
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={checked}
                  aria-labelledby={id}
                  data-help="When on, you get an email each time a visitor adds something to this table. Press Save alerts to keep your change."
                  onClick={() => {
                    setModes((m) => ({ ...m, [t.name]: checked ? "off" : "instant" }));
                    setMessage(null);
                  }}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition ${checked ? "border-brand-400 bg-brand-500" : "border-surface-600 bg-surface-800"}`}
                >
                  <span className={`inline-block h-4 w-4 rounded-full bg-fixed-white shadow transition ${checked ? "translate-x-6" : "translate-x-1"}`} />
                  <span className="sr-only">{checked ? "On" : "Off"}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-4 text-sm">
        <p className="text-surface-300">Alerts go to <span className="font-medium text-surface-100">{view.ownerEmail}</span>.</p>
        <label className="mt-3 block">
          <span className="text-surface-300">Also send to <span className="text-surface-400">(up to {view.maxExtra}, separated by commas)</span></span>
          <input className="input mt-1" type="text" inputMode="email" autoComplete="off" spellCheck={false} value={extra} onChange={(e) => { setExtra(e.target.value); setMessage(null); }} placeholder="partner@yourbusiness.com" data-help="Other people who should get these alerts too, like a business partner. Separate addresses with commas." />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" className="btn-primary" onClick={save} disabled={busy !== "" || !dirty} data-help="Saves which tables send alerts and who gets them.">{busy === "save" ? "Saving…" : "Save alerts"}</button>
        <button type="button" className="btn-secondary" onClick={test} disabled={busy !== "" || !view.emailOn || dirty} title={dirty ? "Save first" : undefined} data-help="Sends a sample alert email to everyone listed, so you can check it arrives. Save your changes first.">
          <Send size={14} aria-hidden />{busy === "test" ? "Sending…" : "Send a test"}
        </button>
      </div>
      <div aria-live="polite">
        {message && <p className={`mt-3 text-sm ${message.ok ? "text-emerald-300" : "text-red-300"}`} role={message.ok ? "status" : "alert"}>{message.text}</p>}
      </div>
    </section>
  );
}

/** The launch checklist's "Send a test submission" step: a button styled like the other steps. */
export function TestSubmissionStep({ projectId, initiallyDone, emailOn }: { projectId: string; initiallyDone: boolean; emailOn: boolean }) {
  const [done, setDone] = useState(initiallyDone);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function run() {
    setBusy(true);
    setMessage(null);
    const r = await sendTest(projectId);
    setMessage(r);
    if (r.ok) setDone(true);
    setBusy(false);
  }

  return (
    <>
      <button type="button" onClick={run} disabled={busy} className="studio-next-step w-full text-left" aria-describedby={message ? "test-submission-result" : undefined} data-help="Sends you a sample alert email, like the one you get when someone uses your form, so you can check it reaches your inbox.">
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${done ? "bg-emerald-500/15 text-emerald-300" : "bg-white/[0.05] text-brand-300"}`}>{done ? <Check size={15} aria-hidden /> : <Send size={15} aria-hidden />}</span>
        <span className="flex-1">
          <strong className={`block text-sm font-medium ${done ? "text-surface-300" : ""}`}>{busy ? "Sending a test submission…" : "Send a test submission"}<span className="sr-only">{done ? " (done)" : " (to do)"}</span></strong>
          <span className="mt-0.5 block text-xs text-surface-400">{emailOn ? "Check that you get an email when someone uses your form." : "Needs email to be set up on this server."}</span>
        </span>
        <ArrowRight size={14} className="text-surface-500" aria-hidden />
      </button>
      {message && <p id="test-submission-result" role={message.ok ? "status" : "alert"} className={`ml-[54px] mt-1 text-xs ${message.ok ? "text-emerald-300" : "text-red-300"}`}>{message.text}</p>}
    </>
  );
}
