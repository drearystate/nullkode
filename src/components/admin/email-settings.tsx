"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Mail, Send } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";

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


/** Admin > Settings > Email: SMTP or Resend, a test button and the last 24 hours' numbers. */
export function EmailSettings() {
  const [view, setView] = useState<View | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState<"" | "save" | "test" | "remove">("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [customPort, setCustomPort] = useState(false);
  const t = useTranslations("admin.email");
  const tc = useTranslations("common");
  const format = useFormatter();
  const ago = (iso: string | null) => {
    if (!iso) return "";
    const d = new Date(iso);
    const now = Date.now();
    if (now - d.getTime() < 60_000) return t("justNow");
    return now - d.getTime() < 24 * 3_600_000 ? format.relativeTime(d, now) : format.dateTime(d, { dateStyle: "medium" });
  };

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
        if (!r.ok || !d) throw new Error(d?.error || t("loadFailed"));
        apply(d as View);
      })
      .catch((e) => setLoadError(e instanceof Error ? e.message : t("loadFailed")));
  }, [apply, t]);

  const dirty = useMemo(() => {
    if (!view || !form) return false;
    // Untouched: the test uses what is in effect now (saved settings or the .env).
    const saved = formFrom(view);
    return JSON.stringify({ ...form, password: "", apiKey: "" }) !== JSON.stringify(saved) || Boolean(form.password || form.apiKey);
  }, [view, form]);

  if (loadError) return <section id="email" className="card mt-8 scroll-mt-40 p-6 text-sm text-red-300" role="alert">{loadError}</section>;
  if (!view || !form) return <section id="email" className="card mt-8 scroll-mt-40 p-6 text-sm text-surface-400">{t("loading")}</section>;

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
      if (!r.ok || !d) throw new Error(d?.error || t("saveFailed"));
      apply(d as View);
      setMessage({ ok: true, text: t("saved") });
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : t("saveFailed") });
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
      if (!d?.ok) throw new Error(d?.error || t("testFailed"));
      setMessage({ ok: true, text: onScreen ? t("testSentUnsaved", { to: d.to }) : t("testSent", { to: d.to }) });
      if (!onScreen) {
        const v = await fetch("/api/admin/email").then((x) => (x.ok ? x.json() : null)).catch(() => null);
        if (v) setView(v as View);
      }
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : t("testFailed") });
    } finally {
      setBusy("");
    }
  }

  async function remove() {
    if (!confirm(t("removeConfirm"))) return;
    setBusy("remove");
    setMessage(null);
    try {
      const r = await fetch("/api/admin/email", { method: "DELETE" });
      const d = await r.json().catch(() => null);
      if (!r.ok || !d) throw new Error(d?.error || t("removeFailed"));
      apply(d as View);
      setMessage({ ok: true, text: t("removed") });
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : t("removeFailed") });
    } finally {
      setBusy("");
    }
  }

  const { status, stats, settings, env } = view;


  return (
    <form id="email" onSubmit={save} className="card mt-8 scroll-mt-40 space-y-5 p-6" aria-labelledby="email-heading" noValidate>
      <div>
        <h2 id="email-heading" className="flex items-center gap-2 text-xl font-semibold"><Mail size={19} className="text-brand-300" aria-hidden />{t("title")}</h2>
        <p className="mt-1 text-sm text-surface-400">{t("body")}</p>
      </div>

      <div className={`rounded-lg border p-4 text-sm ${status.ready ? "border-emerald-500/25 bg-emerald-500/[0.06]" : "border-amber-400/25 bg-amber-400/[0.07]"}`} role="status">
        <p className="flex items-start gap-2 font-medium">
          {status.ready ? <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-400" aria-hidden /> : <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-300" aria-hidden />}
          <span>{status.ready ? (status.provider === "resend" ? t("onResend", { from: status.from }) : t("onSmtp", { from: status.from })) : t("off")}</span>
        </p>
        {status.problem && <p className="mt-1 ps-6 text-surface-300">{status.problem}</p>}
        {status.source === "env" && <p className="mt-1 ps-6 text-xs text-surface-400">{t("fromEnv")}</p>}
        <p className="mt-2 ps-6 text-xs text-surface-400" data-testid="email-stats">
          {t("stats", { sent: stats.sent24h, failed: stats.failed24h })}{stats.skipped24h ? ` · ${t("statsSkipped", { count: stats.skipped24h })}` : ""}
          {stats.lastOkAt ? ` · ${t("lastDelivered", { when: ago(stats.lastOkAt) })}` : ""}
        </p>
        {stats.lastError && (
          <p className="mt-1 ps-6 text-xs text-amber-200">{stats.lastErrorAt ? t("lastProblemWhen", { when: ago(stats.lastErrorAt), error: stats.lastError }) : t("lastProblem", { error: stats.lastError })}</p>
        )}
      </div>

      <fieldset>
        <legend className="text-sm font-medium" data-help={t("howHelp")}>{t("how")}</legend>
        <div className="mt-2 grid gap-3 md:grid-cols-2">
          {([
            ["smtp", t("smtpLabel"), t("smtpText")],
            ["resend", "Resend", t("resendText")],
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
          <label className="block text-sm">{t("server")}
            <input className="input mt-1" name="smtp-host" value={form.host} onChange={(e) => set("host", e.target.value)} placeholder="smtp.example.com" autoComplete="off" spellCheck={false} />
            <span className="mt-1 block text-xs text-surface-400">{t("serverHint")}</span>
          </label>
          <div className="block text-sm">
            <label htmlFor="smtp-port">{t("port")}</label>
            <div className="mt-1 flex gap-2">
              <select id="smtp-port" className="input" value={customPort ? "other" : form.port} onChange={(e) => {
                if (e.target.value === "other") { setCustomPort(true); return; }
                setCustomPort(false);
                set("port", e.target.value);
                if (e.target.value === "465" && form.security === "auto") set("security", "ssl");
                if (e.target.value !== "465" && form.security === "ssl") set("security", "auto");
              }}>
                <option value="587">{t("port587")}</option>
                <option value="465">{t("port465")}</option>
                <option value="2525">2525</option>
                <option value="25">25</option>
                <option value="other">{t("portOther")}</option>
              </select>
              {customPort && <input aria-label={t("portNumber")} className="input w-28" inputMode="numeric" value={form.port} onChange={(e) => set("port", e.target.value.replace(/[^0-9]/g, "").slice(0, 5))} placeholder="587" />}
            </div>
            <span className="mt-1 block text-xs text-surface-400">{t("portHint")}</span>
          </div>
          <label className="block text-sm" data-help={t("usernameHelp")}>{t("username")}
            <input className="input mt-1" name="smtp-user" value={form.user} onChange={(e) => set("user", e.target.value)} placeholder="you@example.com" autoComplete="off" spellCheck={false} />
          </label>
          <label className="block text-sm">{t("password")}
            <input className="input mt-1" name="smtp-password" type="password" value={form.password} onChange={(e) => set("password", e.target.value)} autoComplete="new-password"
              placeholder={settings.smtp.passwordSet ? t("passwordSaved") : t("passwordPlaceholder")} />
            <span className="mt-1 block text-xs text-surface-400">{t("passwordHint")}</span>
          </label>
          <details className="md:col-span-2 text-sm">
            <summary className="cursor-pointer text-surface-300">{t("moreOptions")}</summary>
            <label className="mt-3 block max-w-sm" data-help={t("encryptionHelp")}>{t("encryption")}
              <select className="input mt-1" value={form.security} onChange={(e) => set("security", e.target.value as Security)}>
                <option value="auto">{t("encAuto")}</option>
                <option value="ssl">{t("encSsl")}</option>
                <option value="starttls">{t("encStarttls")}</option>
              </select>
            </label>
          </details>
        </div>
      ) : (
        <label className="block text-sm" data-help={t("resendKeyHelp")}>{t("resendKey")}
          <input className="input mt-1" name="resend-key" type="password" value={form.apiKey} onChange={(e) => set("apiKey", e.target.value)} autoComplete="new-password"
            placeholder={settings.resend.apiKeySet ? t("resendKeySaved", { mask: settings.resend.apiKeyMask }) : env.resendKeySet ? t("resendKeyEnv") : "re_…"} />
        </label>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm">{t("from")}
          <input className="input mt-1" name="email-from" type="email" value={form.from} onChange={(e) => set("from", e.target.value)} placeholder={env.from ?? "hello@yourbusiness.com"} autoComplete="off" spellCheck={false} />
          <span className="mt-1 block text-xs text-surface-400">{form.provider === "resend" ? t("fromHintResend") : t("fromHint")}</span>
        </label>
        <label className="block text-sm">{t.rich("senderName", { muted: (c) => <span className="text-surface-400">{c}</span> })}
          <input className="input mt-1" name="email-from-name" value={form.fromName} onChange={(e) => set("fromName", e.target.value)} placeholder={t("senderNamePlaceholder")} maxLength={80} />
          <span className="mt-1 block text-xs text-surface-400">{t("senderNameHint")}</span>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="btn-primary" disabled={busy !== ""} data-help={t("saveHelp")}>{busy === "save" ? tc("saving") : t("save")}</button>
        <button type="button" className="btn-secondary" onClick={test} disabled={busy !== ""}>
          <Send size={15} aria-hidden />{busy === "test" ? t("sending") : t("test")}
        </button>
        {settings.provider && (
          <button type="button" className="text-sm text-surface-400 underline-offset-2 hover:text-surface-100 hover:underline" onClick={remove} disabled={busy !== ""} data-help={t("removeHelp")}>
            {busy === "remove" ? t("removing") : t("remove")}
          </button>
        )}
      </div>
      <p className="text-xs text-surface-400">{t("testNote", { email: view.adminEmail })}</p>
      <div aria-live="polite">
        {message && <p className={`text-sm ${message.ok ? "text-emerald-300" : "text-red-300"}`} role={message.ok ? "status" : "alert"}>{message.text}</p>}
      </div>
    </form>
  );
}
