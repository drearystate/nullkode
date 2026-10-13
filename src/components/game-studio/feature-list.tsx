"use client";
import { useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { CheckCircle2, ChevronDown, Circle, CircleDashed, CircleDot, History, ListChecks, Loader2, Plus, ScanSearch, X, XCircle } from "lucide-react";

export type FeatureStatus = "planned" | "built" | "passing" | "failing";
export type ListFeature = {
  id: string;
  name: string;
  priority: "core" | "extra";
  how?: string;
  status: FeatureStatus;
  last?: { ok: boolean; text: string; bad?: string };
  source?: "plan" | "change" | "note" | "person" | "import" | "step";
  added?: { at: string; text?: string };
};
export type FeatureLogEntry = { at: string; id: string; name: string; what: "added" | "changed" | "removed" | "refused-removal" | "reverted"; source: string; text?: string };
type Scanned = { id: string; name: string; how: string; priority: "core" | "extra"; test: unknown; files: string[]; keys: string[] };

/** A feature's test status: icon shape, colour and the word (never colour alone). */
export function FeatureChip({ status }: { status: FeatureStatus }) {
  const t = useTranslations("games");
  const look = {
    passing: { Icon: CheckCircle2, cls: "border-emerald-400/40 text-emerald-200" },
    failing: { Icon: XCircle, cls: "border-red-400/40 text-red-200" },
    built: { Icon: CircleDot, cls: "border-sky-400/40 text-sky-200" },
    planned: { Icon: CircleDashed, cls: "border-white/15 text-surface-400" },
  }[status] ?? { Icon: Circle, cls: "border-white/15 text-surface-400" };
  return (
    <span className={`inline-flex min-w-[4.75rem] shrink-0 items-center justify-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${look.cls}`} data-help={t(`plan.features.statusHelp.${status}`)}>
      <look.Icon size={11} aria-hidden />
      {t(`plan.features.status.${status}`)}
    </span>
  );
}

/**
 * The game's FEATURE LIST, always on screen above the chat: every feature the
 * game has (the plan's, and everything added later from messages, notes or
 * here), its test status, and where it came from. The person adds features
 * here and is the only one who removes them; the history shows every change.
 */
export function FeatureListPanel({ gameId, features, log, built, running, onChanged, onError }: { gameId: string; features: ListFeature[]; log: FeatureLogEntry[]; built: boolean; running: boolean; onChanged: () => void; onError: (text: string) => void }) {
  const t = useTranslations("games");
  const format = useFormatter();
  const [open, setOpen] = useState(true);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [how, setHow] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [showLog, setShowLog] = useState(false);
  const [scanned, setScanned] = useState<{ list: Scanned[]; keep: Set<string> } | null>(null);
  const passing = features.filter((f) => f.status === "passing").length;
  const date = (iso?: string) => (iso ? format.dateTime(new Date(iso), { month: "short", day: "numeric" }) : "");
  const quote = (s?: string) => ((s ?? "").length > 70 ? `${(s ?? "").slice(0, 68)}…` : (s ?? ""));
  const origin = (f: ListFeature): string => {
    const d = date(f.added?.at);
    if (!f.added) return "";
    switch (f.source) {
      case "change":
        return t("featureList.fromMessage", { text: quote(f.added.text), date: d });
      case "note":
        return t("featureList.fromNote", { text: quote(f.added.text), date: d });
      case "person":
        return t("featureList.fromPerson", { date: d });
      case "import":
        return t("featureList.fromImport", { date: d });
      case "step":
        return t("featureList.fromStep", { date: d });
      default:
        return t("featureList.fromPlan", { date: d });
    }
  };

  async function call(key: string, url: string, init: RequestInit): Promise<Record<string, unknown> | null> {
    setBusy(key);
    const res = await fetch(url, { ...init, headers: { "content-type": "application/json" } }).catch(() => null);
    const data = ((await res?.json().catch(() => ({}))) ?? {}) as Record<string, unknown>;
    setBusy(null);
    if (!res?.ok) {
      onError(typeof data.error === "string" ? data.error : t("featureList.failed"));
      return null;
    }
    return data;
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) return;
    if (await call("add", `/api/games/${gameId}/features`, { method: "POST", body: JSON.stringify({ name: name.trim(), how: how.trim() }) })) {
      setAdding(false);
      setName("");
      setHow("");
      onChanged();
    }
  }

  async function remove(f: ListFeature) {
    if (!window.confirm(t(f.status === "planned" ? "featureList.removeConfirmPlanned" : "featureList.removeConfirm", { name: f.name }))) return;
    if (await call(`rm:${f.id}`, `/api/games/${gameId}/features/${encodeURIComponent(f.id)}`, { method: "DELETE" })) onChanged();
  }

  async function scan() {
    const data = await call("scan", `/api/games/${gameId}/features/scan`, { method: "POST", body: "{}" });
    const list = (data?.features ?? []) as Scanned[];
    if (data) setScanned({ list, keep: new Set(list.map((f) => f.id)) });
  }

  async function confirmScan() {
    if (!scanned) return;
    const chosen = scanned.list.filter((f) => scanned.keep.has(f.id));
    if (await call("import", `/api/games/${gameId}/features/import`, { method: "POST", body: JSON.stringify({ features: chosen }) })) {
      setScanned(null);
      onChanged();
    }
  }

  return (
    <div className="border-b border-white/10 bg-white/[0.02] [[data-theme=light]_&]:bg-surface-900" data-testid="feature-list" data-help={t("featureList.help")}>
      <div className="flex items-center gap-2 px-4 py-2">
        <button type="button" aria-expanded={open} aria-controls="game-feature-list" onClick={() => setOpen(!open)} className="flex min-w-0 flex-1 items-center gap-2 text-start text-sm" data-testid="feature-list-toggle">
          <ListChecks size={15} className="shrink-0 text-brand-300" aria-hidden />
          <span className="font-medium">{t("featureList.title")}</span>
          <span className="truncate text-xs text-surface-400" data-testid="feature-list-count">
            {t("featureList.count", { count: features.length })}
            {features.some((f) => f.status !== "planned") ? ` · ${t("featureList.passingCount", { passing, total: features.length })}` : ""}
          </span>
          <ChevronDown size={14} className={`ms-auto shrink-0 text-surface-400 transition ${open ? "rotate-180" : ""}`} aria-hidden />
        </button>
        {built && (
          <button type="button" className="flex shrink-0 items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-xs text-surface-200 hover:bg-white/5 disabled:opacity-50" onClick={() => { setAdding(!adding); setOpen(true); }} disabled={running || busy !== null} data-help={t("featureList.addHelp")} data-testid="feature-add">
            <Plus size={12} aria-hidden />
            {t("featureList.add")}
          </button>
        )}
      </div>
      {open && (
        <div id="game-feature-list" className="max-h-[38vh] overflow-y-auto px-4 pb-3 lg:max-h-64">
          {adding && (
            <form onSubmit={add} className="mb-2 space-y-1.5 rounded-lg border border-brand-500/30 bg-brand-500/5 p-2.5" data-testid="feature-add-form">
              <label className="block text-xs text-surface-300" htmlFor="feature-name">{t("featureList.addName")}</label>
              <input id="feature-name" className="input py-1.5 text-xs" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} placeholder={t("featureList.addNamePlaceholder")} dir="auto" />
              <label className="block text-xs text-surface-300" htmlFor="feature-how">{t("featureList.addHow")}</label>
              <input id="feature-how" className="input py-1.5 text-xs" value={how} maxLength={400} onChange={(e) => setHow(e.target.value)} placeholder={t("featureList.addHowPlaceholder")} dir="auto" />
              <div className="flex flex-wrap gap-2 pt-1">
                <button type="submit" className="btn-primary flex items-center gap-1.5 px-2.5 py-1 text-xs" disabled={name.trim().length < 2 || busy !== null} data-testid="feature-add-submit">{busy === "add" && <Loader2 size={12} className="animate-spin" />}{t("featureList.addSubmit")}</button>
                <button type="button" className="btn-ghost px-2.5 py-1 text-xs" onClick={() => setAdding(false)}>{t("featureList.cancel")}</button>
              </div>
            </form>
          )}
          {features.length === 0 && !scanned && (
            <div className="text-xs text-surface-400">
              <p>{t("featureList.empty")}</p>
              {built && (
                <button type="button" className="mt-1.5 flex items-center gap-1 text-brand-300 hover:underline disabled:opacity-50" onClick={() => void scan()} disabled={running || busy !== null} data-help={t("featureList.scanHelp")} data-testid="feature-scan">
                  {busy === "scan" ? <Loader2 size={12} className="animate-spin" /> : <ScanSearch size={12} aria-hidden />}
                  {busy === "scan" ? t("featureList.scanning") : t("featureList.scan")}
                </button>
              )}
            </div>
          )}
          {scanned && (
            <div className="mb-2 rounded-lg border border-brand-500/30 bg-brand-500/5 p-2.5 text-xs" data-testid="feature-scan-result">
              <p className="text-surface-200">{t("featureList.scanFound", { count: scanned.list.length })}</p>
              <ul className="mt-1.5 space-y-1">
                {scanned.list.map((f) => (
                  <li key={f.id}>
                    <label className="flex items-start gap-2">
                      <input type="checkbox" className="mt-0.5" checked={scanned.keep.has(f.id)} onChange={(e) => { const keep = new Set(scanned.keep); if (e.target.checked) keep.add(f.id); else keep.delete(f.id); setScanned({ ...scanned, keep }); }} />
                      <span className="min-w-0"><span className="text-surface-100" dir="auto">{f.name}</span>{f.how && <span className="block text-surface-400" dir="auto">{f.how}</span>}</span>
                    </label>
                  </li>
                ))}
              </ul>
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" className="btn-primary px-2.5 py-1 text-xs" onClick={() => void confirmScan()} disabled={busy !== null || scanned.keep.size === 0} data-testid="feature-scan-confirm">{t("featureList.scanConfirm")}</button>
                <button type="button" className="btn-ghost px-2.5 py-1 text-xs" onClick={() => setScanned(null)}>{t("featureList.cancel")}</button>
              </div>
            </div>
          )}
          {features.length > 0 && (
            <ul className="space-y-1.5">
              {features.map((f) => (
                <li key={f.id} className="flex items-start gap-2 text-xs" data-testid="feature-item" data-status={f.status} data-feature={f.id}>
                  <FeatureChip status={f.status} />
                  <div className="min-w-0 flex-1">
                    <p className="text-surface-100" dir="auto">
                      {f.name}
                      {f.priority === "extra" && <span className="ms-1.5 rounded border border-white/10 px-1 py-px text-[10px] text-surface-400">{t("plan.features.extra")}</span>}
                    </p>
                    {f.added && <p className="text-[11px] text-surface-400" dir="auto" data-testid="feature-origin">{origin(f)}</p>}
                  </div>
                  <button type="button" className="shrink-0 rounded p-1 text-surface-400 hover:bg-white/5 hover:text-red-200 disabled:opacity-40" aria-label={`${t("featureList.remove")}: ${f.name}`} data-help={t("featureList.removeHelp")} onClick={() => void remove(f)} disabled={running || busy !== null} data-testid="feature-remove">
                    {busy === `rm:${f.id}` ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {log.length > 0 && (
            <div className="mt-2">
              <button type="button" className="flex items-center gap-1 text-[11px] text-surface-400 hover:text-surface-200" aria-expanded={showLog} onClick={() => setShowLog(!showLog)} data-help={t("featureList.historyHelp")} data-testid="feature-history-toggle">
                <History size={11} aria-hidden />
                {t("featureList.history")}
              </button>
              {showLog && (
                <ol className="mt-1 space-y-0.5 text-[11px] text-surface-400" data-testid="feature-history">
                  {log.slice(0, 40).map((e, i) => (
                    <li key={`${e.at}-${e.id}-${i}`} dir="auto">
                      <span className="tabular-nums">{date(e.at)}</span> · {t(`featureList.log.${e.what}`, { name: e.name })}
                      {e.text ? <span className="text-surface-500"> — “{quote(e.text)}”</span> : null}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
