"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { themeToCss, type ProjectTheme, type ResolvedTheme } from "@/lib/theme";

type Preset = ResolvedTheme;

type Props = {
  projectId: string;
  presets: Preset[];
  initial: Preset;
  /** The app's home page, previewed in the theme being edited. */
  homePage?: { html: string; css: string } | null;
};

const colorFields: Array<{ key: keyof ProjectTheme; label: string }> = [
  { key: "primary", label: "Primary" },
  { key: "primary2", label: "Primary hover" },
  { key: "accent", label: "Accent" },
  { key: "bg", label: "Background" },
  { key: "surface", label: "Surface" },
  { key: "surface2", label: "Surface 2" },
  { key: "border", label: "Border" },
  { key: "text", label: "Text" },
  { key: "textMuted", label: "Text muted" },
];

// Curated font stacks the user can pick from. Each entry knows its
// display label, the CSS font-family to write into the theme, and the
// Google Fonts family string to inject so the font actually loads.
type FontOption = {
  label: string;
  stack: string;
  google?: string;
};

const FONT_OPTIONS: FontOption[] = [
  { label: "System sans", stack: `ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", sans-serif` },
  { label: "Inter", stack: `"Inter", ui-sans-serif, system-ui, sans-serif`, google: "Inter:wght@400;500;600;700;800" },
  { label: "Poppins", stack: `"Poppins", ui-sans-serif, system-ui, sans-serif`, google: "Poppins:wght@400;500;600;700" },
  { label: "DM Sans", stack: `"DM Sans", ui-sans-serif, system-ui, sans-serif`, google: "DM Sans:wght@400;500;700" },
  { label: "Manrope", stack: `"Manrope", ui-sans-serif, system-ui, sans-serif`, google: "Manrope:wght@400;500;700;800" },
  { label: "Space Grotesk", stack: `"Space Grotesk", ui-sans-serif, system-ui, sans-serif`, google: "Space Grotesk:wght@400;500;700" },
  { label: "Outfit", stack: `"Outfit", ui-sans-serif, system-ui, sans-serif`, google: "Outfit:wght@400;500;700;800" },
  { label: "Plus Jakarta Sans", stack: `"Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif`, google: "Plus Jakarta Sans:wght@400;500;700" },
  { label: "Work Sans", stack: `"Work Sans", ui-sans-serif, system-ui, sans-serif`, google: "Work Sans:wght@400;500;600" },
  { label: "Archivo", stack: `"Archivo", ui-sans-serif, system-ui, sans-serif`, google: "Archivo:wght@400;500;700" },
  { label: "Archivo Black", stack: `"Archivo Black", ui-sans-serif, system-ui, sans-serif`, google: "Archivo Black" },
  { label: "Bebas Neue", stack: `"Bebas Neue", Impact, "Arial Narrow", sans-serif`, google: "Bebas Neue" },
  { label: "Righteous", stack: `"Righteous", "Arial Black", sans-serif`, google: "Righteous" },
  { label: "Playfair Display", stack: `"Playfair Display", Georgia, "Times New Roman", serif`, google: "Playfair Display:wght@500;700;900" },
  { label: "Fraunces", stack: `"Fraunces", Georgia, "Times New Roman", serif`, google: "Fraunces:wght@400;500;700;900" },
  { label: "Lora", stack: `"Lora", Georgia, "Times New Roman", serif`, google: "Lora:wght@400;500;600;700" },
  { label: "Cormorant Garamond", stack: `"Cormorant Garamond", Georgia, "Times New Roman", serif`, google: "Cormorant Garamond:wght@500;600;700" },
  { label: "DM Serif Display", stack: `"DM Serif Display", Georgia, "Times New Roman", serif`, google: "DM Serif Display" },
  { label: "Abril Fatface", stack: `"Abril Fatface", Georgia, serif`, google: "Abril Fatface" },
  { label: "Georgia", stack: `Georgia, "Times New Roman", serif` },
  { label: "JetBrains Mono", stack: `"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`, google: "JetBrains Mono:wght@400;500;700" },
  { label: "IBM Plex Mono", stack: `"IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`, google: "IBM Plex Mono:wght@400;500;700" },
];

// Find the closest matching font option for an arbitrary font stack
// so the dropdowns reflect the active theme even when it came from a
// preset rather than from the user picking from this list.
function matchFont(stack: string | undefined): FontOption | undefined {
  if (!stack) return undefined;
  const head = stack.split(",")[0]?.trim().replace(/^["']|["']$/g, "");
  if (!head) return undefined;
  return FONT_OPTIONS.find((f) =>
    f.stack.toLowerCase().includes(head.toLowerCase())
  );
}

export function ThemeEditor({ projectId, presets, initial, homePage = null }: Props) {
  const [theme, setTheme] = useState<Preset>(initial);
  const [showSample, setShowSample] = useState(!homePage?.html);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pull every font used by every preset *and* every option in the font
  // picker into one Google Fonts <link> so cards and dropdowns render
  // with their actual display font.
  useEffect(() => {
    const families = new Set<string>();
    for (const p of presets) for (const f of p.googleFonts ?? []) families.add(f);
    for (const f of FONT_OPTIONS) if (f.google) families.add(f.google);
    if (families.size === 0) return;
    const qs = [...families]
      .map((f) => `family=${encodeURIComponent(f).replace(/%20/g, "+")}`)
      .join("&");
    const href = `https://fonts.googleapis.com/css2?${qs}&display=swap`;
    const id = "nk-theme-gallery-fonts";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
  }, [presets]);

  const css = useMemo(() => themeToCss(theme), [theme]);

  // Autosave (debounced) whenever the theme changes — not on first load.
  const firstRender = useRef(true);
  const [saveError, setSaveError] = useState(false);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaving(true);
      setSaved(false);
      setSaveError(false);
      try {
        const res = await fetch(`/api/projects/${projectId}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ theme }),
        });
        if (res.ok) setSaved(true);
        else setSaveError(true);
      } catch {
        setSaveError(true);
      } finally {
        setSaving(false);
      }
    }, 500);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [theme, projectId]);

  const pickPreset = (p: Preset) => setTheme({ ...p });
  // Changing the main colour also updates its hover shade, so buttons
  // don't keep the old colour when you point at them.
  const patch = (k: keyof ProjectTheme, v: string) =>
    setTheme((t) => ({ ...t, [k]: v, ...(k === "primary" && /^#[0-9a-f]{6}$/i.test(v) ? { primary2: shade(v, -0.12) } : {}) }));

  // Picking a font updates the stack AND keeps googleFonts in sync so
  // the new family actually loads in the live preview iframe.
  const pickFont = (slot: "font" | "fontDisplay", optionLabel: string) => {
    const opt = FONT_OPTIONS.find((f) => f.label === optionLabel);
    if (!opt) return;
    setTheme((t) => {
      const otherSlot = slot === "font" ? "fontDisplay" : "font";
      const otherMatch = matchFont(t[otherSlot]);
      const families = new Set<string>();
      if (opt.google) families.add(opt.google);
      if (otherMatch?.google) families.add(otherMatch.google);
      return {
        ...t,
        [slot]: opt.stack,
        googleFonts: [...families],
      };
    });
  };

  const lightPresets = presets.filter((p) => p.mode === "light");
  const darkPresets = presets.filter((p) => p.mode === "dark");
  const bodyFontLabel = matchFont(theme.font)?.label ?? "";
  const displayFontLabel = matchFont(theme.fontDisplay)?.label ?? "";

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* LEFT — preset gallery + customize panel */}
      <div className="col-span-12 xl:col-span-7 space-y-8">
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="text-[11px] uppercase tracking-[0.15em] text-surface-500 font-semibold">
              Light themes · {lightPresets.length}
            </div>
            <div className="text-xs text-surface-500">
              {saving ? "Saving…" : saveError ? "Couldn't save. Check your connection." : saved ? "Saved" : ""}
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
            {lightPresets.map((p) => (
              <PresetCard
                key={p.name}
                preset={p}
                active={p.name === theme.name}
                onClick={() => pickPreset(p)}
              />
            ))}
          </div>
        </section>

        <section>
          <div className="text-[11px] uppercase tracking-[0.15em] text-surface-500 font-semibold mb-3">
            Dark themes · {darkPresets.length}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
            {darkPresets.map((p) => (
              <PresetCard
                key={p.name}
                preset={p}
                active={p.name === theme.name}
                onClick={() => pickPreset(p)}
              />
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-surface-800 bg-surface-900 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="text-[11px] uppercase tracking-[0.15em] text-surface-500 font-semibold">
              Customize
            </div>
            <button
              type="button"
              onClick={() => setTheme(initial)}
              className="text-[11px] text-surface-500 hover:text-surface-300"
            >
              Reset
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
            {/* Identity */}
            <div className="space-y-3 md:col-span-2">
              <div className="text-[10px] uppercase tracking-[0.15em] text-surface-500">
                Identity
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <label className="block sm:col-span-2">
                  <span className="text-xs text-surface-400">Name</span>
                  <input
                    className="mt-1 w-full rounded bg-surface-950 border border-surface-800 px-2 py-1.5 text-sm text-white"
                    value={theme.name}
                    onChange={(e) => patch("name", e.target.value)}
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-surface-400">Mode</span>
                  <select
                    className="mt-1 w-full rounded bg-surface-950 border border-surface-800 px-2 py-1.5 text-sm text-white"
                    value={theme.mode}
                    onChange={(e) =>
                      patch("mode", e.target.value as "light" | "dark")
                    }
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                  </select>
                </label>
              </div>
            </div>

            {/* Fonts */}
            <div className="space-y-3 md:col-span-2">
              <div className="text-[10px] uppercase tracking-[0.15em] text-surface-500">
                Typography
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs text-surface-400">Body font</span>
                  <select
                    className="mt-1 w-full rounded bg-surface-950 border border-surface-800 px-2 py-1.5 text-sm text-white"
                    value={bodyFontLabel}
                    onChange={(e) => pickFont("font", e.target.value)}
                  >
                    {!bodyFontLabel && <option value="">Custom…</option>}
                    {FONT_OPTIONS.map((f) => (
                      <option key={f.label} value={f.label}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                  <div
                    className="mt-1 text-sm text-surface-300 truncate"
                    style={{ fontFamily: theme.font }}
                  >
                    The quick brown fox jumps over the lazy dog
                  </div>
                </label>
                <label className="block">
                  <span className="text-xs text-surface-400">Display font</span>
                  <select
                    className="mt-1 w-full rounded bg-surface-950 border border-surface-800 px-2 py-1.5 text-sm text-white"
                    value={displayFontLabel}
                    onChange={(e) => pickFont("fontDisplay", e.target.value)}
                  >
                    {!displayFontLabel && <option value="">Custom…</option>}
                    {FONT_OPTIONS.map((f) => (
                      <option key={f.label} value={f.label}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                  <div
                    className="mt-1 text-lg font-bold text-surface-100 truncate"
                    style={{ fontFamily: theme.fontDisplay }}
                  >
                    Display Heading
                  </div>
                </label>
              </div>
            </div>

            {/* Colors */}
            <div className="space-y-3 md:col-span-2">
              <div className="text-[10px] uppercase tracking-[0.15em] text-surface-500">
                Colors
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {colorFields.map((f) => (
                  <label key={f.key} className="block">
                    <span className="text-xs text-surface-400">{f.label}</span>
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        type="color"
                        value={(theme[f.key] as string) ?? "#000000"}
                        onChange={(e) => patch(f.key, e.target.value)}
                        className="h-8 w-10 rounded border border-surface-800 bg-surface-950 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={(theme[f.key] as string) ?? ""}
                        onChange={(e) => patch(f.key, e.target.value)}
                        className="flex-1 min-w-0 rounded bg-surface-950 border border-surface-800 px-2 py-1 text-xs text-white font-mono"
                      />
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Radii */}
            <div className="space-y-3 md:col-span-2">
              <div className="text-[10px] uppercase tracking-[0.15em] text-surface-500">
                Corners
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs text-surface-400">Radius</span>
                  <input
                    className="mt-1 w-full rounded bg-surface-950 border border-surface-800 px-2 py-1.5 text-sm text-white font-mono"
                    value={theme.radius}
                    onChange={(e) => patch("radius", e.target.value)}
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-surface-400">Radius sm</span>
                  <input
                    className="mt-1 w-full rounded bg-surface-950 border border-surface-800 px-2 py-1.5 text-sm text-white font-mono"
                    value={theme.radiusSm}
                    onChange={(e) => patch("radiusSm", e.target.value)}
                  />
                </label>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* RIGHT — sticky live preview */}
      <div className="col-span-12 xl:col-span-5">
        <div className="sticky top-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="text-[11px] uppercase tracking-[0.15em] text-surface-500 font-semibold">Live preview</div>
              {homePage?.html && (
                <div className="flex gap-1 text-[11px]" role="group" aria-label="What to preview">
                  <button type="button" aria-pressed={!showSample} onClick={() => setShowSample(false)} className={`rounded px-2 py-0.5 ${!showSample ? "bg-white/10 text-surface-100" : "text-surface-400"}`}>Your home page</button>
                  <button type="button" aria-pressed={showSample} onClick={() => setShowSample(true)} className={`rounded px-2 py-0.5 ${showSample ? "bg-white/10 text-surface-100" : "text-surface-400"}`}>Sample</button>
                </div>
              )}
            </div>
            <div
              className="text-[11px] text-surface-400 truncate max-w-[60%] text-right"
              title={theme.name}
            >
              {theme.name}
            </div>
          </div>
          <div className="rounded-xl border border-surface-800 overflow-hidden">
            <ThemePreview css={css} theme={theme} page={showSample ? null : homePage} />
          </div>
        </div>
      </div>
    </div>
  );
}

function PresetCard({
  preset,
  active,
  onClick,
}: {
  preset: Preset;
  active: boolean;
  onClick: () => void;
}) {
  // Renders a mini mock landing page scoped to this card using inline
  // CSS variables so every card is visually distinct. No iframes — the
  // theme tokens cascade through inline styles and 30 cards stay cheap.
  return (
    <button
      onClick={onClick}
      className={`group relative text-left rounded-xl border overflow-hidden transition focus:outline-none ${
        active
          ? "border-brand-500 ring-2 ring-brand-500/40"
          : "border-surface-800 hover:border-surface-600"
      }`}
      style={{ background: preset.bg }}
    >
      {/* mini page */}
      <div
        className="aspect-[4/3] w-full relative overflow-hidden"
        style={{
          background: preset.bg,
          color: preset.text,
          fontFamily: preset.font,
        }}
      >
        {/* decorative gradient blobs give each card a little life */}
        <div
          className="absolute -top-10 -right-10 w-32 h-32 rounded-full opacity-30 blur-2xl"
          style={{ background: preset.primary }}
        />
        <div
          className="absolute -bottom-12 -left-8 w-28 h-28 rounded-full opacity-25 blur-2xl"
          style={{ background: preset.accent }}
        />

        {/* nav bar */}
        <div className="relative flex items-center justify-between px-3 pt-2.5">
          <div
            className="text-[9px] font-bold tracking-tight"
            style={{ fontFamily: preset.fontDisplay, color: preset.text }}
          >
            ● brand
          </div>
          <div className="flex gap-1">
            <span
              className="inline-block h-1 w-4 rounded-full"
              style={{ background: preset.textMuted, opacity: 0.5 }}
            />
            <span
              className="inline-block h-1 w-4 rounded-full"
              style={{ background: preset.textMuted, opacity: 0.5 }}
            />
            <span
              className="inline-block h-1 w-4 rounded-full"
              style={{ background: preset.primary }}
            />
          </div>
        </div>

        {/* hero heading */}
        <div className="relative px-3 pt-3">
          <div
            className="text-[13px] leading-tight font-bold"
            style={{
              fontFamily: preset.fontDisplay,
              color: preset.text,
              letterSpacing: "-0.01em",
            }}
          >
            Build it
            <br />
            visually.
          </div>
          <div
            className="text-[7px] mt-1.5 leading-snug"
            style={{ color: preset.textMuted }}
          >
            A preview of your theme
            <br />
            applied to a real layout.
          </div>
          {/* button row */}
          <div className="flex gap-1 mt-2">
            <span
              className="inline-block px-2 py-0.5 text-[7px] font-semibold"
              style={{
                background: preset.primary,
                color: "#fff",
                borderRadius: preset.radiusSm,
              }}
            >
              Get started
            </span>
            <span
              className="inline-block px-2 py-0.5 text-[7px] font-semibold"
              style={{
                background: "transparent",
                color: preset.primary,
                border: `1px solid ${preset.border}`,
                borderRadius: preset.radiusSm,
              }}
            >
              Learn more
            </span>
          </div>
        </div>

        {/* sample card floating on the right */}
        <div
          className="absolute right-2 bottom-2 w-[48%] p-1.5"
          style={{
            background: preset.surface,
            border: `1px solid ${preset.border}`,
            borderRadius: preset.radius,
          }}
        >
          <div
            className="h-1 w-8 rounded mb-1"
            style={{ background: preset.accent }}
          />
          <div className="space-y-0.5">
            <div
              className="h-0.5 w-full rounded"
              style={{ background: preset.border }}
            />
            <div
              className="h-0.5 w-3/4 rounded"
              style={{ background: preset.border }}
            />
            <div
              className="h-0.5 w-5/6 rounded"
              style={{ background: preset.border }}
            />
          </div>
          <div
            className="mt-1 h-2 w-full rounded"
            style={{ background: preset.primary, opacity: 0.9 }}
          />
        </div>
      </div>

      {/* footer meta — matches theme chrome */}
      <div
        className="flex items-center justify-between px-3 py-2 border-t"
        style={{
          background: preset.surface2,
          borderColor: preset.border,
        }}
      >
        <div
          className="text-[11px] font-semibold truncate pr-2"
          style={{ color: preset.text, fontFamily: preset.fontDisplay }}
        >
          {preset.name}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ background: preset.primary }}
          />
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ background: preset.accent }}
          />
          <span
            className="text-[9px] uppercase tracking-wider ml-1"
            style={{ color: preset.textMuted }}
          >
            {preset.mode}
          </span>
        </div>
      </div>

      {active && (
        <div className="absolute top-2 right-2 bg-brand-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-lg">
          ACTIVE
        </div>
      )}
    </button>
  );
}

/**
 * Renders a mini sample page inside an iframe so the theme CSS is fully
 * isolated from the dashboard chrome. We reload via srcDoc whenever the
 * theme changes — cheap enough for a live preview. The iframe height
 * tracks its inner body so the preview never has its own scrollbar; the
 * outer page handles scrolling instead.
 */
function ThemePreview({ css, theme, page }: { css: string; theme: Preset; page?: { html: string; css: string } | null }) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [height, setHeight] = useState(900);

  const resize = () => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    const h = Math.max(
      doc.body?.scrollHeight ?? 0,
      doc.documentElement?.scrollHeight ?? 0
    );
    if (h > 0) setHeight(h);
  };

  const srcDoc = page?.html ? `<!doctype html>
<html><head>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css">
<link rel="stylesheet" href="/nk-public.css">
<style>${css}
${page.css}
html, body { overflow: hidden; margin: 0; }
</style>
</head><body>${page.html}</body></html>` : `<!doctype html>
<html><head>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css">
<link rel="stylesheet" href="/nk-public.css">
<style>${css}
html, body { overflow: hidden; margin: 0; }
</style>
</head><body class="p-4">
  <nav class="d-flex align-items-center justify-content-between mb-4">
    <strong class="fs-5" style="font-family:var(--nk-font-display)">${escape(theme.name)}</strong>
    <div class="d-flex gap-2">
      <button class="btn btn-outline-primary btn-sm">Sign in</button>
      <button class="btn btn-primary btn-sm">Get started</button>
    </div>
  </nav>
  <div class="mb-4">
    <h1 class="display-5 fw-bold mb-2">Build it visually.</h1>
    <p class="lead text-muted mb-3">Apps, forms, flows — all in one place.</p>
    <button class="btn btn-primary me-2">Primary</button>
    <button class="btn btn-outline-primary">Secondary</button>
  </div>
  <div class="row g-3 mb-4">
    <div class="col-md-6">
      <div class="card p-3">
        <h5 class="mb-1">Card title</h5>
        <p class="text-muted small mb-2">A preview of how cards look in this theme.</p>
        <a href="#">Learn more →</a>
      </div>
    </div>
    <div class="col-md-6">
      <div class="card p-3">
        <h5 class="mb-2">Sign up</h5>
        <input class="form-control mb-2" placeholder="Email" />
        <input class="form-control mb-2" type="password" placeholder="Password" />
        <button class="btn btn-primary w-100">Create account</button>
      </div>
    </div>
  </div>
  <div class="bg-light p-3 rounded">
    <small class="text-muted">Muted block with <a href="#">a link</a> and <span class="badge bg-primary">badge</span>.</small>
  </div>
</body></html>`;

  return (
    <iframe
      ref={iframeRef}
      title="Theme preview"
      srcDoc={srcDoc}
      // No scripts: the preview only shows how the page looks.
      sandbox="allow-same-origin"
      onLoad={resize}
      scrolling="no"
      className="w-full block"
      style={{ height, border: 0, background: theme.bg }}
    />
  );
}

function escape(s: string) {
  return s.replace(/[&<>"']/g, (c) =>
    c === "&"
      ? "&amp;"
      : c === "<"
        ? "&lt;"
        : c === ">"
          ? "&gt;"
          : c === '"'
            ? "&quot;"
            : "&#39;"
  );
}

/** Darken (negative) or lighten (positive) a #rrggbb colour. */
function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.round(amount < 0 ? v * (1 + amount) : v + (255 - v) * amount);
  const r = ch((n >> 16) & 255), g = ch((n >> 8) & 255), b = ch(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}
