"use client";
import Link from "next/link";

export function LandingHero({ authed, moduleCount = 135 }: { authed: boolean; moduleCount?: number }) {
  return (
    <section className="relative pt-28 pb-20 bg-surface-100 overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 -translate-x-1/2 top-[-120px] h-[500px] w-[900px] rounded-full bg-blue-100/60 blur-[100px]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-6">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-surface-200 bg-surface-50 px-4 py-1.5 text-xs text-surface-600 font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
            Describe it, check the plan, launch it
          </div>

          <h1 className="mt-6 text-5xl sm:text-6xl md:text-7xl font-bold leading-[1.05] tracking-tight text-surface-900">
            Build apps,{" "}
            <span className="bg-gradient-to-r from-[var(--nk-brand-primary,#2563eb)] to-cyan-500 bg-clip-text text-transparent">
              not just pages.
            </span>
          </h1>

          <p className="mt-6 max-w-2xl mx-auto text-lg md:text-xl text-surface-500 leading-relaxed">
            Drag-and-drop the UI. Wire up real backend logic visually. Use a real
            database or your Google Sheets. Publish to your own domain. No code.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href={authed ? "/dashboard" : "/signup"}
              className="inline-flex items-center gap-2 rounded-xl bg-surface-900 hover:bg-surface-800 text-white px-7 py-3.5 text-sm font-semibold transition shadow-lg shadow-surface-900/20"
            >
              {authed ? "Open dashboard" : "Start building — it\u2019s free"}
              <span aria-hidden className="text-surface-400">&rarr;</span>
            </Link>
            <a
              href="#features"
              className="inline-flex items-center gap-2 rounded-xl border border-surface-200 bg-white hover:bg-surface-50 text-surface-700 px-7 py-3.5 text-sm font-semibold transition"
            >
              See how it works
            </a>
          </div>
        </div>

        {/* Stats strip — social proof without a dark screenshot */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
          {[
            { value: String(moduleCount), label: "Ready-made features" },
            { value: "31k+", label: "Icons built in" },
            { value: "6", label: "Ways to start building" },
            { value: "Web + Android", label: "Apps from one project" },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-[var(--nk-brand-primary,#2563eb)] to-cyan-500 bg-clip-text text-transparent">
                {s.value}
              </div>
              <div className="mt-1 text-sm text-surface-500">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs text-surface-400 uppercase tracking-widest font-medium">
          <span>No credit card</span>
          <span className="hidden sm:inline text-surface-200">&middot;</span>
          <span>Free forever plan</span>
          <span className="hidden sm:inline text-surface-200">&middot;</span>
          <span>Own your data</span>
        </div>
      </div>
    </section>
  );
}
