const features = (name: string, moduleCount: number, autoTls: boolean) => [
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18" /><path d="M9 21V9" />
      </svg>
    ),
    title: "Visual page editor",
    body: "Blocks, layers, responsive devices, a full styles panel, and custom traits. Every element is editable — no cookie-cutter templates.",
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="5" cy="12" r="2" /><circle cx="19" cy="6" r="2" /><circle cx="19" cy="18" r="2" /><path d="M7 12h4l4-6h2" /><path d="M11 12l4 6h2" />
      </svg>
    ),
    title: "Real backend flows",
    body: "Compose HTTP endpoints, database queries, branches, transforms, and API calls — as a visual flow diagram. No code.",
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="12" cy="6" rx="8" ry="3" /><path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6" /><path d="M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
      </svg>
    ),
    title: "Postgres in one click",
    body: "Each project gets its own isolated schema with typed columns. Or plug in Google Sheets as a CRUD backend — zero config.",
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" />
      </svg>
    ),
    title: "One-click publish",
    body: "Publishing freezes a version of your pages, workflows and theme. Keep editing privately, publish when you're ready, and bring back any earlier version in one click.",
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3l-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
      </svg>
    ),
    title: "AI scaffolding",
    body: `Describe what you want to build. ${name} generates the pages, database schema, and backend flows — then you refine.`,
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
    title: `${moduleCount} ready-made features`,
    body: "Auth, blog, shop, bookings, forum, radio — each ships real database tables, backend flows, and pages. One click to install.",
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><path d="M2 12h20" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    ),
    title: "Custom domains",
    body: autoTls ? "Bring your own domain: add two DNS records and it's live, with a secure HTTPS certificate set up automatically." : "Bring your own domain: add two DNS records and check the connection from your dashboard.",
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18" /><path d="M3 15h18" /><path d="M9 3v18" /><path d="M15 3v18" />
      </svg>
    ),
    title: "Google Sheets adapter",
    body: "Treat any spreadsheet as a database. Read, write, and query rows — no migration, no DevOps, no setup.",
  },
];

export function FeatureBento({ name = "Nullkode", moduleCount = 135, autoTls = false }: { name?: string; moduleCount?: number; autoTls?: boolean }) {
  return (
    <section id="features" className="bg-white py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-xs uppercase tracking-[0.2em] text-blue-600 font-semibold">
            Everything you need
          </p>
          <h2 className="mt-3 text-4xl md:text-5xl font-bold tracking-tight text-surface-900">
            A whole platform, not a plugin.
          </h2>
          <p className="mt-4 text-lg text-surface-500">
            Pages, backend logic, real data, publishing, modules, AI — one
            product, no glue required.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {features(name, moduleCount, autoTls).map((f) => (
            <div
              key={f.title}
              className="group rounded-2xl border border-surface-200 bg-surface-50 p-6 transition hover:shadow-lg hover:shadow-black/[0.04] hover:border-blue-200"
            >
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-100 transition">
                {f.icon}
              </div>
              <h3 className="mt-5 text-base font-bold text-surface-900">
                {f.title}
              </h3>
              <p className="mt-2 text-sm text-surface-500 leading-relaxed">
                {f.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
