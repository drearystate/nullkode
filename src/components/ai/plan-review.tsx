"use client";
import { useMemo, useState } from "react";
import { Check, Database, FileText, Lock, Palette, ShieldCheck, Trash2, Wand2 } from "lucide-react";
import { useTranslations } from "next-intl";
import type { AppPlan } from "@/lib/ai/plan";
import { THEME_PRESETS } from "@/lib/theme";
import { AppLanguageSelect } from "./app-language-select";

const words = (snake: string) => {
  const s = snake.replace(/_/g, " ").trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
};

/** The plan the AI proposed, shown in plain language so anyone can check it before building. */
export function PlanReview({
  plan,
  onChange,
  onBuild,
  onRevise,
  onStartOver,
  revising,
  reviseError,
  appLocale,
  onAppLocale,
}: {
  plan: AppPlan;
  onChange: (plan: AppPlan) => void;
  onBuild: () => void;
  onRevise: (change: string) => void;
  onStartOver: () => void;
  revising: boolean;
  reviseError: string | null;
  /** The language the app is built in (sent with the build). */
  appLocale?: string;
  onAppLocale?: (code: string) => void;
}) {
  const t = useTranslations("ai");
  const [change, setChange] = useState("");
  const [showLooks, setShowLooks] = useState(false);
  const themes = useMemo(() => THEME_PRESETS.filter((t, i, all) => t.name && all.findIndex((q) => q.name === t.name) === i), []);
  const theme = themes.find((t) => t.name.toLowerCase() === plan.theme.toLowerCase()) ?? themes[0];
  const nameOk = plan.project.name.trim().length > 0;

  const removePage = (slug: string) => {
    const pages = plan.pages.filter((p) => p.slug !== slug);
    if (!pages.some((p) => p.isHome) && pages[0]) pages[0] = { ...pages[0], isHome: true };
    onChange({ ...plan, pages });
  };

  return (
    <section className="card p-6 md:p-8" aria-labelledby="plan-heading" data-help={t("plan.help")}>
      <p className="studio-eyebrow text-brand-300">{t("plan.eyebrow")}</p>
      <h2 id="plan-heading" className="mt-2 text-2xl font-semibold tracking-tight">{t("plan.title")}</h2>
      <p className="mt-1 text-sm text-surface-400">{t("plan.intro")}</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
        <label className="block text-sm">
          <span className="label">{t("plan.appName")}</span>
          <input dir="auto" className="input w-full text-base" data-help={t("plan.appNameHelp")} maxLength={80} value={plan.project.name} onChange={(e) => onChange({ ...plan, project: { ...plan.project, name: e.target.value } })} />
        </label>
        <button type="button" className="btn-ghost justify-start" data-help={t("plan.lookHelp")} aria-expanded={showLooks} aria-controls="plan-looks" onClick={() => setShowLooks((v) => !v)}>
          <Palette size={16} aria-hidden />
          <Swatch theme={theme} />
          <span>{theme.name}</span>
        </button>
      </div>
      {appLocale && onAppLocale && (
        <div className="mt-3">
          <AppLanguageSelect value={appLocale} onChange={onAppLocale} id="plan-app-language" />
        </div>
      )}
      {showLooks && (
        <div id="plan-looks" className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4" role="group" aria-label={t("plan.chooseLook")}>
          {themes.map((th) => (
            <button key={th.name} type="button" aria-pressed={th.name === theme.name} data-help={t("plan.useLookHelp")} onClick={() => { onChange({ ...plan, theme: th.name }); setShowLooks(false); }}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-start text-xs transition ${th.name === theme.name ? "border-brand-400 bg-white/[0.06]" : "border-white/10 hover:border-white/25"}`}>
              <Swatch theme={th} />
              <span className="truncate">{th.name}</span>
            </button>
          ))}
        </div>
      )}

      <div className="mt-7 grid gap-6 md:grid-cols-2">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold"><FileText size={15} className="text-brand-300" aria-hidden />{t("plan.pages")}</h3>
          <ul className="mt-3 space-y-2">
            {plan.pages.map((p) => (
              <li key={p.slug} className="rounded-lg border border-white/[0.07] bg-white/[0.02] p-3">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                      {p.title}
                      {p.isHome && <span className="rounded-full bg-brand-500/15 px-2 py-0.5 text-[11px] font-normal text-brand-200">{t("plan.homePage")}</span>}
                      {p.requiresRole ? <span data-help={t("plan.roleOnlyHelp")} className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-normal text-amber-200"><ShieldCheck size={11} aria-hidden />{t("plan.roleOnly", { role: words(p.requiresRole) })}</span>
                        : p.requiresAuth ? <span data-help={t("plan.signedInHelp")} className="inline-flex items-center gap-1 rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] font-normal text-surface-300"><Lock size={11} aria-hidden />{t("plan.signedIn")}</span> : null}
                    </p>
                    {p.summary && <p className="mt-1 text-xs leading-relaxed text-surface-400" dir="auto">{p.summary}</p>}
                  </div>
                  {plan.pages.length > 1 && (
                    <button type="button" className="rounded-md p-1.5 text-surface-400 hover:bg-white/[0.06] hover:text-surface-100" aria-label={t("plan.removePage", { title: p.title })} title={t("plan.removePageTitle")} data-help={t("plan.removePageHelp")} onClick={() => removePage(p.slug)}>
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-surface-500">{t("plan.authIncluded")}</p>
        </div>

        <div className="space-y-6">
          {plan.tables.length > 0 && (
            <div>
              <h3 className="flex items-center gap-2 text-sm font-semibold" data-help={t("plan.savesHelp")}><Database size={15} className="text-brand-300" aria-hidden />{t("plan.saves")}</h3>
              <ul className="mt-3 space-y-2">
                {plan.tables.map((tb) => (
                  <li key={tb.name} className="text-sm">
                    <span className="font-medium">{words(tb.name)}</span>
                    <span className="text-surface-400">{tb.fields.length ? t("plan.fields", { fields: tb.fields.map((f) => words(f.name).toLowerCase()).join(", ") }) : ""}</span>
                    {tb.seed?.length ? <span className="ms-1 text-xs text-emerald-300">{t("plan.examples", { count: tb.seed.length })}</span> : null}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {plan.assumptions.length > 0 && (
            <div>
              <h3 className="flex items-center gap-2 text-sm font-semibold" data-help={t("plan.assumedHelp")}><Check size={15} className="text-brand-300" aria-hidden />{t("plan.assumed")}</h3>
              <ul className="mt-3 list-disc space-y-1.5 ps-5 text-sm text-surface-300">
                {plan.assumptions.map((a, i) => <li key={i} dir="auto">{a}</li>)}
              </ul>
            </div>
          )}
          {plan.flows.length > 0 && (
            <details className="text-sm">
              <summary className="cursor-pointer text-surface-400 hover:text-surface-200" data-help={t("plan.behindScenesHelp")}>{t("plan.behindScenes", { count: plan.flows.length })}</summary>
              <ul className="mt-2 space-y-1 ps-1 text-xs text-surface-400">
                {plan.flows.map((f) => <li key={f.slug}>{f.purpose ? t.rich("plan.flowPurpose", { name: f.name, purpose: f.purpose, b: (c) => <span className="text-surface-200">{c}</span> }) : <span className="text-surface-200">{f.name}</span>}</li>)}
              </ul>
            </details>
          )}
        </div>
      </div>

      <form className="mt-8 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4" onSubmit={(e) => { e.preventDefault(); if (change.trim().length >= 3 && !revising) onRevise(change.trim()); }}>
        <label htmlFor="plan-change" className="text-sm font-medium">{t("plan.different")}</label>
        <p className="mt-0.5 text-xs text-surface-400">{t("plan.differentHint")}</p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input id="plan-change" data-help={t("plan.changeHelp")} className="input flex-1" maxLength={1000} value={change} disabled={revising} onChange={(e) => setChange(e.target.value)} placeholder={t("plan.changePlaceholder")} />
          <button className="btn-ghost shrink-0" data-help={t("plan.updateHelp")} disabled={revising || change.trim().length < 3}>
            <Wand2 size={15} aria-hidden />{revising ? t("plan.updating") : t("plan.update")}
          </button>
        </div>
        {reviseError && <p role="alert" className="mt-2 text-sm text-red-300">{reviseError}</p>}
      </form>

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button type="button" className="text-sm text-surface-400 hover:text-surface-100" onClick={onStartOver} disabled={revising} data-help={t("plan.startOverHelp")}>{t("plan.startOver")}</button>
        <button type="button" className="btn-primary px-6" onClick={onBuild} disabled={revising || !nameOk} data-help={t("plan.buildHelp")}>{t("plan.build")}</button>
      </div>
    </section>
  );
}

function Swatch({ theme }: { theme: { bg: string; primary: string; accent: string } }) {
  return (
    <span aria-hidden className="inline-flex h-5 w-8 shrink-0 overflow-hidden rounded border border-white/15">
      <span className="flex-1" style={{ background: theme.bg }} />
      <span className="flex-1" style={{ background: theme.primary }} />
      <span className="flex-1" style={{ background: theme.accent }} />
    </span>
  );
}
