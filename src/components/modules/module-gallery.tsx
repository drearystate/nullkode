"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ModuleSummary } from "@/lib/modules/registry";
import { cn } from "@/lib/utils";
import { BUSINESS_NAME_FIELD, friendlyName, friendlySummary } from "./friendly";

type Props = {
  projectId: string;
  /** The app's name, used to prefill fields like "Business name". */
  projectName: string;
  modules: ModuleSummary[];
};

const CATEGORY_LABELS: Record<string, string> = {
  all: "All",
  communication: "Communication",
  content: "Content",
  media: "Media",
  commerce: "Commerce",
  productivity: "Productivity",
  community: "Community",
  utility: "Handy tools",
};

export function ModuleGallery({ projectId, projectName, modules }: Props) {
  const [category, setCategory] = useState<string>("all");
  const [query, setQuery] = useState<string>("");
  const [installing, setInstalling] = useState<ModuleSummary | null>(null);

  const categories = useMemo(() => {
    const set = new Set<string>(modules.map((m) => m.category));
    return ["all", ...Array.from(set)];
  }, [modules]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return modules.filter((m) => {
      if (category !== "all" && m.category !== category) return false;
      if (!q) return true;
      const hay = [
        friendlyName(m),
        friendlySummary(m),
        m.name,
        m.tagline,
        m.description,
        m.id,
        ...(m.provides ?? []),
        ...(m.requires ?? []),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [modules, category, query]);

  return (
    <div className="mt-8">
      <div className="mb-4 relative">
        <input
          type="search"
          autoFocus
          placeholder="Search features, like bookings or shop…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-xl border border-surface-800 bg-surface-900/60 px-4 py-2.5 pr-10 text-sm placeholder:text-surface-500 focus:outline-none focus:border-brand-500"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-500 hover:text-surface-300"
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={cn(
              "text-xs px-3 py-1.5 rounded-full border transition",
              category === c
                ? "bg-brand-500 border-brand-500 text-white"
                : "bg-surface-900 border-surface-800 text-surface-300 hover:border-surface-600"
            )}
          >
            {CATEGORY_LABELS[c] ?? c}
          </button>
        ))}
      </div>

      {filtered.length !== modules.length && filtered.length > 0 && (
        <div className="mb-6 text-xs text-surface-500">
          {filtered.length} {filtered.length === 1 ? "feature matches" : "features match"}
        </div>
      )}

      {filtered.length === 0 && (
        <div className="rounded-xl border border-dashed border-surface-700 p-12 text-center text-surface-400">
          No features match <span className="font-mono">"{query}"</span>
          {category !== "all" && <> in <strong>{CATEGORY_LABELS[category] ?? category}</strong></>}.
          <div className="mt-3">
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setCategory("all");
              }}
              className="text-brand-300 hover:underline text-sm"
            >
              Clear filters
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((m) => (
          <div
            key={m.id}
            className="relative overflow-hidden rounded-2xl border border-surface-800 bg-surface-900/60 hover:border-brand-500 hover:bg-surface-900 transition group"
          >
            <div
              className={cn(
                "pointer-events-none absolute -top-20 -right-20 h-40 w-40 rounded-full blur-3xl opacity-30 group-hover:opacity-60 transition bg-gradient-to-br",
                m.color
              )}
            />
            <button
              type="button"
              onClick={() => setInstalling(m)}
              className="relative block w-full p-6 pb-3 text-left"
            >
              <div className="w-10 h-10 rounded-lg bg-surface-800 border border-surface-700 flex items-center justify-center text-lg font-bold text-brand-300">
                {friendlyName(m).charAt(0)}
              </div>
              <div className="mt-3 font-semibold text-lg">{friendlyName(m)}</div>
              <p className="mt-1 text-sm text-surface-300">{friendlySummary(m)}</p>
              <div className="mt-4 inline-flex items-center gap-1 text-brand-300 text-sm font-semibold">
                Add to my app →
              </div>
            </button>
            <details className="relative px-6 pb-5 text-xs text-surface-400">
              <summary className="cursor-pointer select-none text-surface-500 hover:text-surface-300">Details</summary>
              <p className="mt-2 leading-relaxed">{m.description}</p>
              <p className="mt-2 text-surface-500">
                Adds {m.pageCount} {m.pageCount === 1 ? "page" : "pages"}
                {m.tableCount > 0 && <>, {m.tableCount} {m.tableCount === 1 ? "list" : "lists"} of saved items</>}
                {m.flowCount > 0 && <> and {m.flowCount} {m.flowCount === 1 ? "flow" : "flows"}</>}.
                {m.requires.length > 0 && <> Needs sign-in and accounts, which every new app already has.</>}
              </p>
            </details>
          </div>
        ))}
      </div>

      {installing && (
        <InstallDialog
          projectId={projectId}
          projectName={projectName}
          module={installing}
          onClose={() => setInstalling(null)}
        />
      )}
    </div>
  );
}

function InstallDialog({
  projectId,
  projectName,
  module,
  onClose,
}: {
  projectId: string;
  projectName: string;
  module: ModuleSummary;
  onClose: () => void;
}) {
  const router = useRouter();
  const [config, setConfig] = useState<Record<string, string | number>>(() => {
    const out: Record<string, string | number> = {};
    for (const f of module.config ?? []) {
      if (BUSINESS_NAME_FIELD.test(f.key) && projectName) out[f.key] = projectName;
      else if (f.default != null) out[f.key] = f.default as string | number;
    }
    return out;
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function install() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/modules`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ moduleId: module.id, config }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
      // Redirect into the editor on the first new page
      if (data.firstPageId) {
        router.push(`/projects/${projectId}/pages/${data.firstPageId}/edit`);
      } else {
        router.push(`/projects/${projectId}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't add this feature. Please try again.");
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-surface-700 bg-surface-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-surface-800">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-surface-800 border border-surface-700 flex items-center justify-center text-lg font-bold text-brand-300 shrink-0">
              {friendlyName(module).charAt(0)}
            </div>
            <div>
              <h2 className="text-lg font-bold">Add {friendlyName(module)}</h2>
              <p className="text-xs text-surface-400 mt-0.5">{friendlySummary(module)}</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {(module.config ?? []).length === 0 && (
            <p className="text-sm text-surface-400">
              Nothing to fill in. We&apos;ll add its pages to your app, ready for you to change.
            </p>
          )}
          {(module.config ?? []).map((f) => (
            <div key={f.key}>
              <label className="label">
                {f.label}
                {f.required && <span className="text-brand-400 ml-1">*</span>}
              </label>
              {f.type === "textarea" ? (
                <textarea
                  className="input min-h-[80px]"
                  placeholder={f.placeholder}
                  value={(config[f.key] as string) ?? ""}
                  onChange={(e) => setConfig({ ...config, [f.key]: e.target.value })}
                />
              ) : f.type === "select" ? (
                <select
                  className="input"
                  value={(config[f.key] as string) ?? ""}
                  onChange={(e) => setConfig({ ...config, [f.key]: e.target.value })}
                >
                  {(f.options ?? []).map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  className="input"
                  type={f.type === "number" ? "number" : f.type === "url" ? "url" : "text"}
                  placeholder={f.placeholder}
                  value={(config[f.key] as string | number) ?? ""}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      [f.key]: f.type === "number" ? Number(e.target.value) : e.target.value,
                    })
                  }
                />
              )}
              {f.help && <div className="mt-1 text-[11px] text-surface-500">{f.help}</div>}
            </div>
          ))}
          {error && (
            <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              {error}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-surface-800 flex justify-end gap-2">
          <button className="btn-ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button className="btn-primary" onClick={install} disabled={busy}>
            {busy ? "Adding…" : "Add to my app"}
          </button>
        </div>
      </div>
    </div>
  );
}
