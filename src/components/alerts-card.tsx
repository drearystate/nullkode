"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, BellRing, Check, Send } from "lucide-react";
import { useTranslations } from "next-intl";

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

type T = ReturnType<typeof useTranslations<"project.alertsCard">>;

async function sendTest(projectId: string, t: T): Promise<{ ok: boolean; text: string }> {
  try {
    const r = await fetch(`/api/projects/${projectId}/alerts/test`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
    const d = await r.json().catch(() => null);
    if (!d?.ok) return { ok: false, text: d?.error || t("testFailed") };
    const to: string[] = Array.isArray(d.to) ? d.to : [];
    const table = String(d.table ?? t("defaultTable")).toLowerCase();
    return { ok: true, text: to.length ? t("testSent", { table, to: to.join(", ") }) : t("testSentToYou", { table }) };
  } catch {
    return { ok: false, text: t("testOffline") };
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
  const t = useTranslations("project.alertsCard");
  const tc = useTranslations("common");

  const apply = useCallback((v: View) => {
    setView(v);
    setModes(Object.fromEntries(v.tables.map((t) => [t.name, t.mode])));
    setExtra(v.extraRecipients.join(", "));
  }, []);

  useEffect(() => {
    fetch(`/api/projects/${projectId}/alerts`, { cache: "no-store" })
      .then(async (r) => {
        const d = await r.json().catch(() => null);
        if (!r.ok || !d) throw new Error(d?.error || t("loadFailed"));
        apply(d as View);
      })
      .catch((e) => setLoadError(e instanceof Error ? e.message : t("loadFailed")));
  }, [projectId, apply, t]);

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
      setMessage({ ok: false, text: t("tooMany", { max: view.maxExtra }) });
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
      if (!r.ok || !d) throw new Error(d?.error || t("saveFailed"));
      apply(d as View);
      setMessage({ ok: true, text: tc("saved") });
    } catch (e) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : t("saveFailed") });
    } finally {
      setBusy("");
    }
  }

  async function test() {
    setBusy("test");
    setMessage(null);
    setMessage(await sendTest(projectId, t));
    setBusy("");
  }

  const on = view.tables.filter((t) => modes[t.name] === "instant").length;

  return (
    <section className="card mt-6 p-6" aria-labelledby="alerts-heading" id="alerts" data-testid="alerts-card">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="alerts-heading" className="flex items-center gap-2 font-semibold" data-help={t("titleHelp")}>
          <BellRing size={17} className="text-brand-300" aria-hidden />
          {t("title")}
        </h2>
        <span className="text-xs text-surface-400">{on ? t("onCount", { on, total: view.tables.length }) : t("allOff")}</span>
      </div>
      <p className="mt-1 text-sm text-surface-400">{t("intro")}</p>

      {!view.emailOn && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-400/25 bg-amber-400/[0.07] p-3 text-sm text-amber-100" role="status">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-300" aria-hidden />
          <span>
            {t("emailOff")}
            {view.canSetUpEmail && <> <Link href="/admin/settings#email" className="font-medium underline" data-help={t("setUpEmailHelp")}>{t("setUpEmail")}</Link></>}
          </span>
        </div>
      )}

      {view.tables.length === 0 ? (
        <p className="mt-4 text-sm text-surface-400">{t("noTables")}</p>
      ) : (
        <ul className="mt-4 divide-y divide-white/[0.06]">
          {view.tables.map((tbl) => {
            const checked = modes[tbl.name] === "instant";
            const id = `alert-${tbl.name}`;
            return (
              <li key={tbl.name} className="flex items-center justify-between gap-4 py-2.5">
                <span className="min-w-0">
                  <span id={id} className="block truncate text-sm">{tbl.label}</span>
                  {tbl.defaultMode === "instant" && <span className="block text-xs text-surface-400">{t("defaultOn")}</span>}
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={checked}
                  aria-labelledby={id}
                  data-help={t("switchHelp")}
                  onClick={() => {
                    setModes((m) => ({ ...m, [tbl.name]: checked ? "off" : "instant" }));
                    setMessage(null);
                  }}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition ${checked ? "border-brand-400 bg-brand-500" : "border-surface-600 bg-surface-800"}`}
                >
                  <span className={`inline-block h-4 w-4 rounded-full bg-fixed-white shadow transition ${checked ? "translate-x-6 rtl:-translate-x-6" : "translate-x-1 rtl:-translate-x-1"}`} />
                  <span className="sr-only">{checked ? t("on") : t("off")}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-4 text-sm">
        <p className="text-surface-300">{t.rich("goesTo", { email: view.ownerEmail, b: (c) => <span className="font-medium text-surface-100" dir="ltr">{c}</span> })}</p>
        <label className="mt-3 block">
          <span className="text-surface-300">{t.rich("alsoSendTo", { max: view.maxExtra, muted: (c) => <span className="text-surface-400">{c}</span> })}</span>
          <input className="input mt-1" type="text" inputMode="email" autoComplete="off" spellCheck={false} value={extra} onChange={(e) => { setExtra(e.target.value); setMessage(null); }} placeholder="partner@yourbusiness.com" data-help={t("extraHelp")} />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" className="btn-primary" onClick={save} disabled={busy !== "" || !dirty} data-help={t("saveHelp")}>{busy === "save" ? tc("saving") : t("save")}</button>
        <button type="button" className="btn-secondary" onClick={test} disabled={busy !== "" || !view.emailOn || dirty} title={dirty ? t("saveFirst") : undefined} data-help={t("testHelp")}>
          <Send size={14} aria-hidden />{busy === "test" ? t("sending") : t("test")}
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
  const t = useTranslations("project.alertsCard");

  async function run() {
    setBusy(true);
    setMessage(null);
    const r = await sendTest(projectId, t);
    setMessage(r);
    if (r.ok) setDone(true);
    setBusy(false);
  }

  return (
    <>
      <button type="button" onClick={run} disabled={busy} className="studio-next-step w-full text-start" aria-describedby={message ? "test-submission-result" : undefined} data-help={t("stepHelp")}>
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${done ? "bg-emerald-500/15 text-emerald-300" : "bg-white/[0.05] text-brand-300"}`}>{done ? <Check size={15} aria-hidden /> : <Send size={15} aria-hidden />}</span>
        <span className="flex-1">
          <strong className={`block text-sm font-medium ${done ? "text-surface-300" : ""}`}>{busy ? t("stepSending") : t("step")}<span className="sr-only">{" "}{done ? t("stepDone") : t("stepToDo")}</span></strong>
          <span className="mt-0.5 block text-xs text-surface-400">{emailOn ? t("stepHint") : t("stepNeedsEmail")}</span>
        </span>
        <ArrowRight size={14} className="text-surface-500 rtl:-scale-x-100" aria-hidden />
      </button>
      {message && <p id="test-submission-result" role={message.ok ? "status" : "alert"} className={`ms-[54px] mt-1 text-xs ${message.ok ? "text-emerald-300" : "text-red-300"}`}>{message.text}</p>}
    </>
  );
}
