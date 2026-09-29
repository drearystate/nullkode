"use client";
import { useMemo, useState } from "react";
import { Check, Database, FileText, Lock, Palette, ShieldCheck, Trash2, Wand2 } from "lucide-react";
import type { AppPlan } from "@/lib/ai/plan";
import { THEME_PRESETS } from "@/lib/theme";

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
}: {
  plan: AppPlan;
  onChange: (plan: AppPlan) => void;
  onBuild: () => void;
  onRevise: (change: string) => void;
  onStartOver: () => void;
  revising: boolean;
  reviseError: string | null;
}) {
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
    <section className="card p-6 md:p-8" aria-labelledby="plan-heading">
      <p className="studio-eyebrow text-brand-300">YOUR PLAN</p>
      <h2 id="plan-heading" className="mt-2 text-2xl font-semibold tracking-tight">Here&apos;s what I&apos;ll build</h2>
      <p className="mt-1 text-sm text-surface-400">Check it over and change anything you like. Nothing is built until you say so.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
        <label className="block text-sm">
          <span className="label">App name</span>
          <input className="input w-full text-base" maxLength={80} value={plan.project.name} onChange={(e) => onChange({ ...plan, project: { ...plan.project, name: e.target.value } })} />
        </label>
        <button type="button" className="btn-ghost justify-start" aria-expanded={showLooks} aria-controls="plan-looks" onClick={() => setShowLooks((v) => !v)}>
          <Palette size={16} aria-hidden />
          <Swatch theme={theme} />
          <span>{theme.name}</span>
        </button>
      </div>
      {showLooks && (
        <div id="plan-looks" className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4" role="group" aria-label="Choose a look">
          {themes.map((t) => (
            <button key={t.name} type="button" aria-pressed={t.name === theme.name} onClick={() => { onChange({ ...plan, theme: t.name }); setShowLooks(false); }}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs transition ${t.name === theme.name ? "border-brand-400 bg-white/[0.06]" : "border-white/10 hover:border-white/25"}`}>
              <Swatch theme={t} />
              <span className="truncate">{t.name}</span>
            </button>
          ))}
        </div>
      )}

      <div className="mt-7 grid gap-6 md:grid-cols-2">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold"><FileText size={15} className="text-brand-300" aria-hidden />Pages</h3>
          <ul className="mt-3 space-y-2">
            {plan.pages.map((p) => (
              <li key={p.slug} className="rounded-lg border border-white/[0.07] bg-white/[0.02] p-3">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                      {p.title}
                      {p.isHome && <span className="rounded-full bg-brand-500/15 px-2 py-0.5 text-[11px] font-normal text-brand-200">Home page</span>}
                      {p.requiresRole ? <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-normal text-amber-200"><ShieldCheck size={11} aria-hidden />{words(p.requiresRole)}s only</span>
                        : p.requiresAuth ? <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] font-normal text-surface-300"><Lock size={11} aria-hidden />Signed-in visitors</span> : null}
                    </p>
                    {p.summary && <p className="mt-1 text-xs leading-relaxed text-surface-400">{p.summary}</p>}
                  </div>
                  {plan.pages.length > 1 && (
                    <button type="button" className="rounded-md p-1.5 text-surface-400 hover:bg-white/[0.06] hover:text-surface-100" aria-label={`Remove the ${p.title} page`} title="Remove page" onClick={() => removePage(p.slug)}>
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-surface-500">Sign-in, sign-up and account pages are included automatically.</p>
        </div>

        <div className="space-y-6">
          {plan.tables.length > 0 && (
            <div>
              <h3 className="flex items-center gap-2 text-sm font-semibold"><Database size={15} className="text-brand-300" aria-hidden />What it saves</h3>
              <ul className="mt-3 space-y-2">
                {plan.tables.map((t) => (
                  <li key={t.name} className="text-sm">
                    <span className="font-medium">{words(t.name)}</span>
                    <span className="text-surface-400">{t.fields.length ? `: ${t.fields.map((f) => words(f.name).toLowerCase()).join(", ")}` : ""}</span>
                    {t.seed?.length ? <span className="ml-1 text-xs text-emerald-300">({t.seed.length} examples to start with)</span> : null}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {plan.assumptions.length > 0 && (
            <div>
              <h3 className="flex items-center gap-2 text-sm font-semibold"><Check size={15} className="text-brand-300" aria-hidden />I assumed</h3>
              <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-surface-300">
                {plan.assumptions.map((a, i) => <li key={i}>{a}</li>)}
              </ul>
            </div>
          )}
          {plan.flows.length > 0 && (
            <details className="text-sm">
              <summary className="cursor-pointer text-surface-400 hover:text-surface-200">Behind the scenes: {plan.flows.length} {plan.flows.length === 1 ? "action" : "actions"}</summary>
              <ul className="mt-2 space-y-1 pl-1 text-xs text-surface-400">
                {plan.flows.map((f) => <li key={f.slug}><span className="text-surface-200">{f.name}</span>{f.purpose ? ` — ${f.purpose}` : ""}</li>)}
              </ul>
            </details>
          )}
        </div>
      </div>

      <form className="mt-8 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4" onSubmit={(e) => { e.preventDefault(); if (change.trim().length >= 3 && !revising) onRevise(change.trim()); }}>
        <label htmlFor="plan-change" className="text-sm font-medium">Want something different?</label>
        <p className="mt-0.5 text-xs text-surface-400">Say it in your own words and I&apos;ll update the plan.</p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input id="plan-change" className="input flex-1" maxLength={1000} value={change} disabled={revising} onChange={(e) => setChange(e.target.value)} placeholder="e.g. Add a prices page, and let customers cancel a booking" />
          <button className="btn-ghost shrink-0" disabled={revising || change.trim().length < 3}>
            <Wand2 size={15} aria-hidden />{revising ? "Updating…" : "Update plan"}
          </button>
        </div>
        {reviseError && <p role="alert" className="mt-2 text-sm text-red-300">{reviseError}</p>}
      </form>

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button type="button" className="text-sm text-surface-400 hover:text-surface-100" onClick={onStartOver} disabled={revising}>Start over</button>
        <button type="button" className="btn-primary px-6" onClick={onBuild} disabled={revising || !nameOk}>Build my app</button>
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
