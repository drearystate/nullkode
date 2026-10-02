"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Editor } from "grapesjs";
import { useTranslations } from "next-intl";
import { THEME_PRESETS, DEFAULT_THEME, type ProjectTheme } from "@/lib/theme";

type Props = {
  projectId: string;
  editor: Editor;
};

/** The theme colors you can set; names and hover notes are in editor.json under theme.colors.<key>. */
const COLOR_FIELDS: Array<keyof ProjectTheme> = [
  "primary",
  "primary2",
  "accent",
  "bg",
  "surface",
  "surface2",
  "border",
  "text",
  "textMuted",
];

function SwatchDots({ preset }: { preset: ProjectTheme }) {
  const colors = [preset.primary, preset.accent, preset.bg, preset.text].filter(Boolean);
  return (
    <div className="flex items-center gap-0.5">
      {colors.map((c, i) => (
        <div
          key={i}
          className="rounded-full border border-surface-700"
          style={{ width: "10px", height: "10px", background: c }}
        />
      ))}
    </div>
  );
}

export function ThemePanel({ projectId, editor }: Props) {
  const [theme, setLoadedTheme] = useState<ProjectTheme>(DEFAULT_THEME);
  // Saved only once the person changes something: opening the editor must
  // not write the default look into an app that has none (that showed up as
  // "unpublished changes").
  const changed = useRef(false);
  const setTheme: typeof setLoadedTheme = (next) => {
    changed.current = true;
    setLoadedTheme(next);
  };
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tr = useTranslations("editor.theme");
  const tc = useTranslations("common");

  // Load current theme from the project
  useEffect(() => {
    fetch(`/api/projects/${projectId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.project?.theme) {
          setLoadedTheme({ ...DEFAULT_THEME, ...d.project.theme });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [projectId]);

  // Apply theme to the editor canvas iframe in real time
  const applyToCanvas = useCallback(
    (t: ProjectTheme) => {
      const frame = editor.Canvas?.getFrameEl?.();
      const doc = frame?.contentDocument;
      if (!doc) return;
      const root = doc.documentElement;
      if (t.primary) root.style.setProperty("--nk-primary", t.primary);
      if (t.primary2) root.style.setProperty("--nk-primary-2", t.primary2);
      if (t.accent) root.style.setProperty("--nk-accent", t.accent);
      if (t.bg) root.style.setProperty("--nk-bg", t.bg);
      if (t.surface) root.style.setProperty("--nk-surface", t.surface);
      if (t.surface2) root.style.setProperty("--nk-surface-2", t.surface2);
      if (t.border) root.style.setProperty("--nk-border", t.border);
      if (t.text) root.style.setProperty("--nk-text", t.text);
      if (t.textMuted) root.style.setProperty("--nk-text-muted", t.textMuted);
      if (t.font) root.style.setProperty("--nk-font", t.font);
      if (t.fontDisplay) root.style.setProperty("--nk-font-display", t.fontDisplay);
      if (t.radius) root.style.setProperty("--nk-radius", t.radius);
      if (t.radiusSm) root.style.setProperty("--nk-radius-sm", t.radiusSm);
      // Update body background immediately
      doc.body.style.background = t.bg ?? "";
      doc.body.style.color = t.text ?? "";
    },
    [editor]
  );

  // Autosave + apply to canvas whenever theme changes
  useEffect(() => {
    if (loading) return;
    applyToCanvas(theme);
    if (!changed.current) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaving(true);
      try {
        await fetch(`/api/projects/${projectId}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ theme }),
        });
      } finally {
        setSaving(false);
      }
    }, 600);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [theme, projectId, loading, applyToCanvas]);

  const pickPreset = (name: string) => {
    const preset = THEME_PRESETS.find((p) => p.name === name);
    if (preset) setTheme({ ...preset });
  };

  const patch = (key: keyof ProjectTheme, value: string) => {
    setTheme((t) => ({ ...t, [key]: value }));
  };

  if (loading) {
    return (
      <div className="p-4 text-center text-surface-500 text-xs">{tr("loading")}</div>
    );
  }

  return (
    <div className="p-3 space-y-4">
      {/* Status */}
      <div className="text-[10px] text-surface-500 text-end">
        {saving ? tc("saving") : ""}
      </div>

      {/* Preset picker with color swatches */}
      <div>
        <div className="text-[10px] uppercase tracking-wider text-surface-500 font-semibold mb-1.5" data-help={tr("presetHelp")}>
          {tr("preset")}
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            data-help={tr("presetButtonHelp")}
            className="w-full flex items-center justify-between bg-surface-950 border border-surface-800 rounded px-2.5 py-1.5 text-xs text-surface-100 focus:outline-none focus:border-brand-500 hover:border-surface-700 transition"
          >
            <div className="flex items-center gap-2">
              <span>{theme.name || tr("pickTheme")}</span>
            </div>
            <div className="flex items-center gap-1">
              <SwatchDots preset={theme} />
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
          </button>
          {dropdownOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
              <div className="absolute z-50 top-full inset-x-0 mt-1 bg-surface-950 border border-surface-700 rounded-lg shadow-2xl max-h-[360px] overflow-y-auto">
                <div className="px-2.5 py-1.5 text-[10px] uppercase tracking-wider text-surface-500 font-semibold sticky top-0 bg-surface-950">{tr("light")}</div>
                {THEME_PRESETS.filter((p) => p.mode === "light").map((p) => (
                  <button
                    key={p.name}
                    onClick={() => { pickPreset(p.name); setDropdownOpen(false); }}
                    data-help={tr("useLook", { name: p.name })}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs hover:bg-surface-800 transition ${
                      p.name === theme.name ? "text-brand-300 bg-brand-500/10" : "text-surface-200"
                    }`}
                  >
                    <span>{p.name}</span>
                    <SwatchDots preset={p} />
                  </button>
                ))}
                <div className="px-2.5 py-1.5 text-[10px] uppercase tracking-wider text-surface-500 font-semibold sticky top-0 bg-surface-950 border-t border-surface-800">{tr("dark")}</div>
                {THEME_PRESETS.filter((p) => p.mode === "dark").map((p) => (
                  <button
                    key={p.name}
                    onClick={() => { pickPreset(p.name); setDropdownOpen(false); }}
                    data-help={tr("useLook", { name: p.name })}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs hover:bg-surface-800 transition ${
                      p.name === theme.name ? "text-brand-300 bg-brand-500/10" : "text-surface-200"
                    }`}
                  >
                    <span>{p.name}</span>
                    <SwatchDots preset={p} />
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Dark mode pair */}
      <div>
        <div className="text-[10px] uppercase tracking-wider text-surface-500 font-semibold mb-1.5">
          {tr("darkPair")}
        </div>
        <select
          value={theme.dark?.name ?? "__auto__"}
          onChange={(e) => {
            const val = e.target.value;
            if (val === "__auto__") {
              // Remove explicit dark pair — auto-pair will be used
              setTheme((t) => {
                const { dark: _, ...rest } = t;
                return rest;
              });
            } else {
              const preset = THEME_PRESETS.find((p) => p.name === val);
              if (preset) {
                const { ...darkTheme } = preset;
                setTheme((t) => ({ ...t, dark: darkTheme }));
              }
            }
          }}
          className="w-full bg-surface-950 border border-surface-800 rounded px-2.5 py-1.5 text-xs text-surface-100 focus:outline-none focus:border-brand-500"
          data-help={tr("darkPairHelp")}
        >
          <option value="__auto__">{tr("darkPairAuto")}</option>
          {THEME_PRESETS.filter((p) => p.mode === "dark").map((p) => (
            <option key={p.name} value={p.name}>{p.name}</option>
          ))}
        </select>
        <div className="text-[10px] text-surface-600 [[data-theme=light]_&]:text-surface-500 mt-1">
          {tr("darkPairNote")}
        </div>
      </div>

      {/* Color fields */}
      <div>
        <div className="text-[10px] uppercase tracking-wider text-surface-500 font-semibold mb-2">
          {tr("colorsTitle")}
        </div>
        <div className="space-y-1.5">
          {COLOR_FIELDS.map((key) => ({ key, label: tr(`colors.${key}.label`), help: tr(`colors.${key}.help`) })).map((f) => (
            <div key={f.key} className="flex items-center gap-2">
              <input
                type="color"
                value={(theme[f.key] as string) ?? "#000000"}
                onChange={(e) => patch(f.key, e.target.value)}
                aria-label={tr("colorLabel", { name: f.label })}
                data-help={f.help}
                className="w-6 h-6 rounded border border-surface-700 cursor-pointer bg-transparent p-0"
                style={{ minWidth: "24px" }}
              />
              <span className="text-[11px] text-surface-300 flex-1">{f.label}</span>
              <input
                type="text"
                value={(theme[f.key] as string) ?? ""}
                onChange={(e) => patch(f.key, e.target.value)}
                dir="ltr"
                aria-label={tr("colorCodeLabel", { name: f.label })}
                data-help={tr("colorCodeHelp")}
                className="w-[72px] bg-surface-950 border border-surface-800 rounded px-1.5 py-0.5 text-[10px] text-surface-400 font-mono focus:outline-none focus:border-brand-500"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Radius */}
      <div>
        <div className="text-[10px] uppercase tracking-wider text-surface-500 font-semibold mb-1.5">
          {tr("corners")}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-surface-300 w-12">{tr("radius")}</span>
          <input
            type="range"
            min="0"
            max="24"
            value={parseInt(theme.radius ?? "14")}
            onChange={(e) => {
              const v = e.target.value + "px";
              patch("radius", v);
              patch("radiusSm", Math.max(0, parseInt(e.target.value) - 4) + "px");
            }}
            dir="ltr"
            className="flex-1 accent-brand-500"
            aria-label={tr("roundness")}
            data-help={tr("roundnessHelp")}
          />
          <span className="text-[10px] text-surface-500 w-8 text-end font-mono">
            {theme.radius ?? "14px"}
          </span>
        </div>
      </div>

      {/* Mode toggle */}
      <div>
        <div className="text-[10px] uppercase tracking-wider text-surface-500 font-semibold mb-1.5">
          {tr("mode")}
        </div>
        <div className="flex gap-1">
          {(["light", "dark"] as const).map((m) => (
            <button
              key={m}
              onClick={() => {
                // Find a preset in the target mode that's closest to current
                const target = THEME_PRESETS.find((p) => p.mode === m);
                if (target) setTheme({ ...target });
              }}
              data-help={m === "light" ? tr("lightHelp") : tr("darkHelp")}
              className={`flex-1 text-[11px] py-1.5 rounded border transition ${
                theme.mode === m
                  ? "bg-brand-500/20 border-brand-500 text-brand-200"
                  : "border-surface-800 text-surface-500 hover:text-surface-200"
              }`}
            >
              {m === "light" ? tr("light") : tr("dark")}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
