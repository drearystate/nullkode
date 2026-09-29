"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Mail, Send } from "lucide-react";

type Security = "auto" | "ssl" | "starttls";
type View = {
  settings: {
    provider: "smtp" | "resend" | "";
    smtp: { host: string; port: number; security: Security; user: string; passwordSet: boolean; passwordMask: string };
    resend: { apiKeySet: boolean; apiKeyMask: string };
    from: string;
    fromName: string;
  };
  env: { smtpHost: string | null; smtpPasswordSet: boolean; resendKeySet: boolean; from: string | null };
  status: { ready: boolean; provider: "smtp" | "resend" | null; source: "settings" | "env" | "none"; problem: string | null; from: string };
  stats: { sent24h: number; failed24h: number; skipped24h: number; lastError: string | null; lastErrorAt: string | null; lastAt: string | null; lastOkAt: string | null };
  adminEmail: string;
  ports: number[];
};

type Form = {
  provider: "smtp" | "resend";
  host: string;
  port: string;
  security: Security;
  user: string;
  password: string;
  apiKey: string;
  from: string;
  fromName: string;
};

const PRESET_PORTS = ["587", "465", "2525", "25"];

function formFrom(v: View): Form {
  const s = v.settings;
  return {
    provider: s.provider === "resend" ? "resend" : s.provider === "smtp" ? "smtp" : v.status.provider === "resend" ? "resend" : "smtp",
    host: s.smtp.host,
    port: String(s.smtp.port || 587),
    security: s.smtp.security || "auto",
    user: s.smtp.user,
    password: "",
    apiKey: "",
    from: s.from,
    fromName: s.fromName,
  };
}

function ago(iso: string | null) {
  if (!iso) return "";
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} ${h === 1 ? "hour" : "hours"} ago`;
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" });
}

/** Admin > Settings > Email: SMTP or Resend, a test button and the last 24 hours' numbers. */
export function EmailSettings() {
  const [view, setView] = useState<View | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState<"" | "save" | "test" | "remove">("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [customPort, setCustomPort] = useState(false);

  const apply = useCallback((v: View) => {
    setView(v);
    const f = formFrom(v);
    setForm(f);
    setCustomPort(!PRESET_PORTS.includes(f.port));
  }, []);

  useEffect(() => {
    fetch("/api/admin/email")
      .then(async (r) => {
        const d = await r.json().catch(() => null);
        if (!r.ok || !d) throw new Error(d?.error || "Couldn't load the email settings.");
        apply(d as View);
      })
      .catch((e) => setLoadError(e instanceof Error ? e.message : "Couldn't load the email settings."));
  }, [apply]);

  const dirty = useMemo(() => {
    if (!view || !form) return false;
    // Untouched: the test uses what is in effect now (saved settings or the .env).
    const saved = formFrom(view);
    return JSON.stringify({ ...form, password: "", apiKey: "" }) !== JSON.stringify(saved) || Boolean(form.password || form.apiKey);
  }, [view, form]);

  if (loadError) return <section id="email" className="card mt-8 scroll-mt-40 p-6 text-sm text-red-300" role="alert">{loadError}</section>;
  if (!view || !form) return <section id="email" className="card mt-8 scroll-mt-40 p-6 text-sm text-surface-400">Loading email settings…</section>;

  const set = <K extends keyof Form>(k: K, v: Form[K]) => {
    setForm((f) => (f ? { ...f, [k]: v } : f));
    setMessage(null);
  };

  function body(f: Form) {
    return {
      provider: f.provider,
      smtp: { host: f.host, port: f.port, security: f.security, user: f.user, password: f.password },
      resend: { apiKey: f.apiKey },
      from: f.from,
      fromName: f.fromName,
    };
  }

  async function save(e?: React.FormEvent) {
    e?.preventDefault();
    if (!form) return;
    setBusy("save");
    setMessage(null);
    try {
      const r = await fetch("/api/admin/email", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(body(form)) });
      const d = await r.json().catch(() => null);
      if (!r.ok || !d) throw new Error(d?.error || "Couldn't save the email settings.");
      apply(d as View);
      setMessage({ ok: true, text: "Saved. Invitations, password links and app alerts now use these settings." });
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Couldn't save the email settings." });
    } finally {
      setBusy("");
    }
  }

  async function test() {
    if (!form || !view) return;
    setBusy("test");
    setMessage(null);
    const onScreen = dirty;
    try {
      const r = await fetch("/api/admin/email/test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(onScreen ? { settings: body(form) } : {}),
      });
      const d = await r.json().catch(() => null);
      if (!d?.ok) throw new Error(d?.error || "The test email couldn't be sent.");
      setMessage({ ok: true, text: `Sent to ${d.to}. Check that inbox (and its spam folder).${onScreen ? " Save to start using these settings." : ""}` });
      if (!onScreen) {
        const v = await fetch("/api/admin/email").then((x) => (x.ok ? x.json() : null)).catch(() => null);
        if (v) setView(v as View);
      }
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "The test email couldn't be sent." });
    } finally {
      setBusy("");
    }
  }

  async function remove() {
    if (!confirm("Remove the saved email settings? Email then uses the server's settings file (.env) if it has any, or turns off.")) return;
    setBusy("remove");
    setMessage(null);
    try {
      const r = await fetch("/api/admin/email", { method: "DELETE" });
      const d = await r.json().catch(() => null);
      if (!r.ok || !d) throw new Error(d?.error || "Couldn't remove the email settings.");
      apply(d as View);
      setMessage({ ok: true, text: "Removed the saved email settings." });
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Couldn't remove the email settings." });
    } finally {
      setBusy("");
    }
  }

  const { status, stats, settings, env } = view;
  const via = status.provider === "resend" ? "Resend" : status.provider === "smtp" ? "your email server" : "";

  return (
    <form id="email" onSubmit={save} className="card mt-8 scroll-mt-40 space-y-5 p-6" aria-labelledby="email-heading" noValidate>
      <div>
        <h2 id="email-heading" className="flex items-center gap-2 text-xl font-semibold"><Mail size={19} className="text-brand-300" aria-hidden />Email</h2>
        <p className="mt-1 text-sm text-surface-400">Send invitations, password links, app alerts and your apps&apos; own emails from your address. Without email, links are shown on screen for you to pass on.</p>
      </div>

      <div className={`rounded-lg border p-4 text-sm ${status.ready ? "border-emerald-500/25 bg-emerald-500/[0.06]" : "border-amber-400/25 bg-amber-400/[0.07]"}`} role="status">
        <p className="flex items-start gap-2 font-medium">
          {status.ready ? <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-400" aria-hidden /> : <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-300" aria-hidden />}
          <span>{status.ready ? `Email is on: sending through ${via} from ${status.from}.` : "Email is off."}</span>
        </p>
        {status.problem && <p className="mt-1 pl-6 text-surface-300">{status.problem}</p>}
        {status.source === "env" && <p className="mt-1 pl-6 text-xs text-surface-400">These come from the server&apos;s settings file (.env). Saving here takes over from it.</p>}
        <p className="mt-2 pl-6 text-xs text-surface-400" data-testid="email-stats">
          Last 24 hours: {stats.sent24h} sent · {stats.failed24h} failed{stats.skipped24h ? ` · ${stats.skipped24h} not sent because email was off` : ""}
          {stats.lastOkAt ? ` · last delivered ${ago(stats.lastOkAt)}` : ""}
        </p>
        {stats.lastError && (
          <p className="mt-1 pl-6 text-xs text-amber-200">Last problem{stats.lastErrorAt ? ` (${ago(stats.lastErrorAt)})` : ""}: {stats.lastError}</p>
        )}
      </div>

      <fieldset>
        <legend className="text-sm font-medium" data-help="SMTP means your email provider's sending settings; almost every provider has them. Resend is a sending service that uses a secret key instead.">How should email be sent?</legend>
        <div className="mt-2 grid gap-3 md:grid-cols-2">
          {([
            ["smtp", "Any email provider (SMTP)", "Works with Google Workspace, Microsoft 365, Brevo, Mailgun, Postmark, Amazon SES, Resend and most web hosts."],
            ["resend", "Resend", "Send with a Resend API key. Your sender domain must be verified in Resend."],
          ] as const).map(([value, label, text]) => (
            <label key={value} className={`cursor-pointer rounded-lg border p-4 transition ${form.provider === value ? "border-brand-500 bg-brand-500/10 ring-1 ring-brand-500" : "border-surface-700 bg-surface-900 hover:border-surface-600"}`}>
              <span className="flex items-center gap-2 font-semibold">
                <input type="radio" name="email-provider" value={value} checked={form.provider === value} onChange={() => set("provider", value)} className="accent-brand-500" />
                {label}
              </span>
              <span className="mt-1.5 block text-xs text-surface-400">{text}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {form.provider === "smtp" ? (
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm">Email server
            <input className="input mt-1" name="smtp-host" value={form.host} onChange={(e) => set("host", e.target.value)} placeholder="smtp.example.com" autoComplete="off" spellCheck={false} />
            <span className="mt-1 block text-xs text-surface-400">Your provider lists it as the SMTP server or host.</span>
          </label>
          <div className="block text-sm">
            <label htmlFor="smtp-port">Port</label>
            <div className="mt-1 flex gap-2">
              <select id="smtp-port" className="input" value={customPort ? "other" : form.port} onChange={(e) => {
                if (e.target.value === "other") { setCustomPort(true); return; }
                setCustomPort(false);
                set("port", e.target.value);
                if (e.target.value === "465" && form.security === "auto") set("security", "ssl");
                if (e.target.value !== "465" && form.security === "ssl") set("security", "auto");
              }}>
                <option value="587">587 (recommended)</option>
                <option value="465">465 (SSL)</option>
                <option value="2525">2525</option>
                <option value="25">25</option>
                <option value="other">Another port…</option>
              </select>
              {customPort && <input aria-label="Port number" className="input w-28" inputMode="numeric" value={form.port} onChange={(e) => set("port", e.target.value.replace(/[^0-9]/g, "").slice(0, 5))} placeholder="587" />}
            </div>
            <span className="mt-1 block text-xs text-surface-400">Use 587 unless your provider says otherwise. Many hosting companies block port 25.</span>
          </div>
          <label className="block text-sm" data-help="The login for your email provider's sending settings, usually your full email address.">Username
            <input className="input mt-1" name="smtp-user" value={form.user} onChange={(e) => set("user", e.target.value)} placeholder="you@example.com" autoComplete="off" spellCheck={false} />
          </label>
          <label className="block text-sm">Password
            <input className="input mt-1" name="smtp-password" type="password" value={form.password} onChange={(e) => set("password", e.target.value)} autoComplete="new-password"
              placeholder={settings.smtp.passwordSet ? "Saved. Leave blank to keep it" : "The account or app password"} />
            <span className="mt-1 block text-xs text-surface-400">Some providers (Google, Microsoft) need an app password instead of your normal one.</span>
          </label>
          <details className="md:col-span-2 text-sm">
            <summary className="cursor-pointer text-surface-300">More options</summary>
            <label className="mt-3 block max-w-sm" data-help="How the connection to your email server is kept private. Leave it on Automatic unless your email provider says otherwise.">Encryption
              <select className="input mt-1" value={form.security} onChange={(e) => set("security", e.target.value as Security)}>
                <option value="auto">Automatic (recommended)</option>
                <option value="ssl">SSL from the start (port 465)</option>
                <option value="starttls">Always require STARTTLS</option>
              </select>
            </label>
          </details>
        </div>
      ) : (
        <label className="block text-sm" data-help="The secret key from your Resend account. It's kept hidden; leave the box empty to keep the key already saved.">Resend API key
          <input className="input mt-1" name="resend-key" type="password" value={form.apiKey} onChange={(e) => set("apiKey", e.target.value)} autoComplete="new-password"
            placeholder={settings.resend.apiKeySet ? `Saved (${settings.resend.apiKeyMask}). Leave blank to keep it` : env.resendKeySet ? "Using the key in the server's settings file. Leave blank to keep it" : "re_…"} />
        </label>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm">Send from
          <input className="input mt-1" name="email-from" type="email" value={form.from} onChange={(e) => set("from", e.target.value)} placeholder={env.from ?? "hello@yourbusiness.com"} autoComplete="off" spellCheck={false} />
          <span className="mt-1 block text-xs text-surface-400">An address your provider lets you send from{form.provider === "resend" ? ", on a domain you verified in Resend" : ""}.</span>
        </label>
        <label className="block text-sm">Sender name <span className="text-surface-400">(optional)</span>
          <input className="input mt-1" name="email-from-name" value={form.fromName} onChange={(e) => set("fromName", e.target.value)} placeholder="Your brand name" maxLength={80} />
          <span className="mt-1 block text-xs text-surface-400">Leave blank to use your brand or the app&apos;s name on each email.</span>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="btn-primary" disabled={busy !== ""} data-help="Saves these settings. From then on, invitations, password links and app alerts for everyone on the platform, resellers' clients included, are sent this way.">{busy === "save" ? "Saving…" : "Save email settings"}</button>
        <button type="button" className="btn-secondary" onClick={test} disabled={busy !== ""}>
          <Send size={15} aria-hidden />{busy === "test" ? "Sending…" : "Send a test email to me"}
        </button>
        {settings.provider && (
          <button type="button" className="text-sm text-surface-400 underline-offset-2 hover:text-surface-100 hover:underline" onClick={remove} disabled={busy !== ""} data-help="Deletes the email settings saved here. Email then uses the server's settings file (.env) if it has any, or turns off.">
            {busy === "remove" ? "Removing…" : "Remove these settings"}
          </button>
        )}
      </div>
      <p className="text-xs text-surface-400">The test goes to {view.adminEmail}. It uses what&apos;s on screen, so you can check before saving.</p>
      <div aria-live="polite">
        {message && <p className={`text-sm ${message.ok ? "text-emerald-300" : "text-red-300"}`} role={message.ok ? "status" : "alert"}>{message.text}</p>}
      </div>
    </form>
  );
}
