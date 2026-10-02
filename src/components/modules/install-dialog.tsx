"use client";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import type { ModuleSummary } from "@/lib/modules/registry";
import type { InstalledModule } from "@/lib/modules/installed";
import { useCatalog } from "@/lib/use-catalog";
import { BUSINESS_NAME_FIELD } from "./friendly";

/** What the server sends back once a feature is added. */
export type InstallResult = {
  moduleId: string;
  /** The feature's plain name, e.g. "Sign-in and accounts". */
  name?: string;
  firstPageId: string | null;
  pageIds: Record<string, string>;
  flowIds: Record<string, string>;
  /** Every page of the app afterwards, home first, oldest first. */
  pages: Array<{ id: string; title: string; slug: string; isHome: boolean }>;
  installed: InstalledModule[];
};

/** The plain-words line about what a feature needs, or null. */
export function requirementNote(m: Pick<ModuleSummary, "requires">, t: (key: "needsAuth" | "needsEmail") => string): string | null {
  const needs = new Set(m.requires ?? []);
  const parts: string[] = [];
  if (needs.has("auth-session") || needs.has("auth-users")) parts.push(t("needsAuth"));
  if (needs.has("email")) parts.push(t("needsEmail"));
  return parts.length ? parts.join(" ") : null;
}

type Props = {
  projectId: string;
  /** The app's name, used to prefill fields like "Business name". */
  projectName: string;
  module: ModuleSummary;
  /** How many copies of this feature the app has already. */
  installedCount?: number;
  onClose: () => void;
  /** Runs once the feature is added; the caller decides where to go next. */
  onInstalled: (result: InstallResult) => void | Promise<void>;
  /** Opens another feature's dialog, for "This needs … first". */
  onOpenModule?: (moduleId: string) => void;
};

/**
 * "Add <feature>": asks the feature's few questions, adds it to the app and
 * hands the result back. Used by the Features tab and the editor's panel.
 */
export function InstallDialog({ projectId, projectName, module, installedCount = 0, onClose, onInstalled, onOpenModule }: Props) {
  const titleId = useId();
  const t = useTranslations("studio.modules");
  const cat = useCatalog();
  /** The setup questions in the studio's language (keys, values and defaults unchanged). */
  const fields = cat.moduleFields(module);
  const firstFieldRef = useRef<HTMLElement | null>(null);
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
  const [needs, setNeeds] = useState<Array<{ id: string; name: string }>>([]);
  const busyRef = useRef(false);

  useEffect(() => {
    const t = setTimeout(() => firstFieldRef.current?.focus(), 30);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busyRef.current) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  async function install() {
    if (busyRef.current) return;
    const missing = fields.find((f) => f.required && String(config[f.key] ?? "").trim() === "");
    if (missing) {
      setError(t("fillIn", { field: missing.label }));
      return;
    }
    busyRef.current = true;
    setBusy(true);
    setError(null);
    setNeeds([]);
    try {
      const res = await fetch(`/api/projects/${projectId}/modules`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ moduleId: module.id, config }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNeeds(Array.isArray(data.needs) ? data.needs : []);
        throw new Error(data.error ?? t("addFailed"));
      }
      await onInstalled(data as InstallResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("addFailed"));
      busyRef.current = false;
      setBusy(false);
    }
  }

  const name = cat.moduleName(module);
  const note = requirementNote(module, t);
  const dialog = (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={() => !busyRef.current && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-[calc(100dvh-32px)] w-full max-w-md flex-col rounded-2xl border border-surface-700 bg-surface-900 text-surface-50 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-surface-800 p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-surface-700 bg-surface-800 text-lg font-bold text-brand-300">
              {name.charAt(0)}
            </div>
            <div>
              <h2 id={titleId} className="text-lg font-bold">{t("dialogTitle", { name })}</h2>
              <p className="mt-0.5 text-xs text-surface-400">{cat.moduleSummary(module)}</p>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-6">
          {installedCount > 0 && (
            <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-100">
              {t.rich("alreadyAdded", { name, count: installedCount, b: (c) => <strong className="font-semibold">{c}</strong> })}
            </div>
          )}
          {note && <p className="text-xs text-surface-400">{note}</p>}
          {fields.length === 0 && (
            <p className="text-sm text-surface-400">
              {t("nothingToFill")}
            </p>
          )}
          {fields.map((f, i) => {
            const id = `${titleId}-${f.key}`;
            const ref = i === 0 ? (el: HTMLElement | null) => { firstFieldRef.current = el; } : undefined;
            return (
              <div key={f.key}>
                <label className="label" htmlFor={id}>
                  {f.label}
                  {f.required && <span className="ms-1 text-brand-400" aria-hidden>*</span>}
                </label>
                {f.type === "textarea" ? (
                  <textarea
                    id={id}
                    ref={ref}
                    required={f.required}
                    className="input min-h-[80px]"
                    placeholder={f.placeholder}
                    value={(config[f.key] as string) ?? ""}
                    onChange={(e) => setConfig({ ...config, [f.key]: e.target.value })}
                  />
                ) : f.type === "select" ? (
                  <select
                    id={id}
                    ref={ref}
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
                    id={id}
                    ref={ref}
                    required={f.required}
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
            );
          })}
          {error && (
            <div role="alert" className="space-y-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
              <p>{error}</p>
              {onOpenModule && needs.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {needs.map((n) => (
                    <button key={n.id} type="button" className="btn-ghost !min-h-0 !px-3 !py-1.5 text-xs" data-help={t("needsFirstHelp")} onClick={() => onOpenModule(n.id)}>
                      {t("addNamed", { name: cat.moduleName(n) })}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-surface-800 p-4">
          <button type="button" className="btn-ghost" onClick={onClose} disabled={busy}>
            {t("cancel")}
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={install}
            data-help={installedCount > 0 ? t("installAgainHelp") : t("installHelp")}
            disabled={busy}
            ref={fields.length === 0 ? (el) => { firstFieldRef.current = el; } : undefined}
          >
            {busy ? t("adding") : installedCount > 0 ? t("addAnother") : t("addToApp")}
          </button>
        </div>
      </div>
    </div>
  );
  return typeof document === "undefined" ? dialog : createPortal(dialog, document.body);
}
