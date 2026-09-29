"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import type { Editor } from "grapesjs";
import { Check, Loader2, PanelLeft, PanelRight, Redo2, Undo2, MousePointer2 } from "lucide-react";
import { registerBlocks } from "./blocks";
import { registerPremadeBlocks } from "./premade-blocks";
import { AssetsPanel } from "./assets-panel";
import { ModulesPanel } from "./modules-panel";
import { IconPickerModal } from "./icon-picker-modal";
import { ThemePanel } from "./theme-panel";
import { WireUpModal } from "./wire-up-modal";
import { getModuleForBlock, type BlockModuleMapping } from "./block-module-map";
import { observePanelHelp } from "./panel-help";
import { STYLE_SECTORS, clickToEdit, plainSettings, syncEditingText, type FlowOption } from "./plain-editor";

type Props = {
  projectId: string;
  pageId: string;
  initialHtml: string;
  initialCss: string;
  initialComponents: object | null;
  initialStyles: object | null;
  onReady?: (editor: Editor) => void;
  onSaveReady?: (flush: () => Promise<boolean>) => void;
  /** Fired when this editor instance is destroyed, so holders of the
   *  instance (e.g. EditorShell's ref) can drop it before it goes stale. */
  onDestroy?: () => void;
};

/**
 * The forms plugin treats every <button> as a form button whose label is a
 * plain "text" setting, and replaces the contents of any button that isn't
 * plain text (an icon button, the menu's hamburger bars) with "Send" on the
 * first save. Only text-only buttons get that behaviour; the rest keep
 * their contents as ordinary elements.
 */
function keepButtonContents(editor: Editor) {
  editor.DomComponents.addType("button", {
    isComponent: (el: HTMLElement) =>
      el.tagName === "BUTTON" && Array.from(el.childNodes).every((n) => n.nodeType === Node.TEXT_NODE) ? { type: "button" } : undefined,
  });
}

export function GrapesEditor(props: Props) {
  const editorHostRef = useRef<HTMLDivElement>(null);
  const blocksHostRef = useRef<HTMLDivElement>(null);
  const stylesHostRef = useRef<HTMLDivElement>(null);
  const layersHostRef = useRef<HTMLDivElement>(null);
  const traitsHostRef = useRef<HTMLDivElement>(null);
  const selectorsHostRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<Editor | null>(null);
  const pageIdRef = useRef(props.pageId);
  const panelHelpCleanupRef = useRef<(() => void) | null>(null);

  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [rightTab, setRightTab] = useState<"styles" | "layers" | "traits" | "theme">("styles");
  const [leftTab, setLeftTab] = useState<"blocks" | "modules" | "assets">("blocks");
  const [editorReady, setEditorReady] = useState(false);
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [selectedName, setSelectedName] = useState("");
  const flushOnDestroyRef = useRef<(() => Promise<boolean>) | null>(null);
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [iconReplaceId, setIconReplaceId] = useState<string | null>(null);
  const [blockSearch, setBlockSearch] = useState("");
  const [wireUpMapping, setWireUpMapping] = useState<BlockModuleMapping | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [hasSettings, setHasSettings] = useState(false);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    if (pageIdRef.current === props.pageId) return;
    pageIdRef.current = props.pageId;
    editor.setComponents((props.initialComponents as unknown as string) ?? props.initialHtml);
    editor.setStyle((props.initialStyles as unknown as string) ?? props.initialCss);
  }, [props.pageId, props.initialHtml, props.initialCss, props.initialComponents, props.initialStyles]);

  useEffect(() => {
    let mounted = true;
    if (window.innerWidth < 1100) setRightOpen(false);
    if (window.innerWidth < 700) setLeftOpen(false);

    (async () => {
      const grapes = (await import("grapesjs")).default;
      const presetWebpage = (await import("grapesjs-preset-webpage")).default;
      const blocksBasic = (await import("grapesjs-blocks-basic")).default;
      const pluginForms = (await import("grapesjs-plugin-forms")).default;
      const pluginNavbar = (await import("grapesjs-navbar")).default;
      // Parses page CSS as text. The default parser goes through the
      // browser's CSSOM, which reports shorthands that use var() (e.g.
      // "border: 1px solid var(--nk-border)") as empty, so they vanished on
      // the first save.
      const parserPostCss = (await import("grapesjs-parser-postcss")).default;
      await import("grapesjs/dist/css/grapes.min.css" as string).catch(() => {});
      // The app's flows, by name, for the "When sent, run" / "Show items
      // from" pickers on forms and lists.
      const flowOptions: FlowOption[] = await fetch(`/api/projects/${props.projectId}/flows`)
        .then((r) => (r.ok ? r.json() : { flows: [] }))
        .then((d: { flows?: { id: string; name: string }[] }) => (d.flows ?? []).map((f) => ({ id: f.id, label: f.name })))
        .catch(() => []);

      if (
        !mounted ||
        !editorHostRef.current ||
        !blocksHostRef.current ||
        !stylesHostRef.current ||
        !layersHostRef.current ||
        !traitsHostRef.current ||
        !selectorsHostRef.current
      )
        return;

      const editor = grapes.init({
        container: editorHostRef.current,
        height: "100%",
        width: "100%",
        storageManager: false,
        fromElement: false,
        showOffsets: true,
        noticeOnUnload: false,
        // GrapesJS strips <script> tags by default, which silently deleted
        // the browser-side logic of AI-built features (game loops, canvas
        // drawing, geolocation) on the first autosave after an AI edit.
        // Pages are only ever authored by the owner, so keeping their own
        // scripts is safe — published pages already execute them.
        parser: { optionsHtml: { allowScripts: true } },
        components: (props.initialComponents as unknown as string) ?? props.initialHtml,
        style: (props.initialStyles as unknown as string) ?? props.initialCss,
        canvas: {
          styles: [
            "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css",
            // Nullkode design system — same stylesheet served to published
            // pages, so what you see in the editor matches what you ship.
            "/nk-public.css",
            // Per-project theme: :root variables override the design system
            // defaults so the editor canvas re-skins whenever the theme
            // changes. Loaded last so it wins.
            `/api/projects/${props.projectId}/theme.css`,
          ],
          // Inject the Nullkode runtime inside the canvas iframe so data-bound
          // lists fetch real rows live in the editor, forms preview errors,
          // the radio player wires up, etc. Same file as the published viewer.
          scripts: ["/api/runtime"],
        },
        plugins: [parserPostCss, blocksBasic, pluginForms, keepButtonContents, pluginNavbar, presetWebpage, plainSettings(flowOptions)],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pluginsOpts: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          [blocksBasic as any]: {
            flexGrid: true,
            addBasicStyle: true,
            category: "Layout",
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          [pluginForms as any]: { category: "Forms" },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          [pluginNavbar as any]: { category: "Sections" },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          [presetWebpage as any]: {
            modalImportTitle: "Import template",
            modalImportLabel:
              '<div style="margin-bottom:10px;font-size:13px;">Paste HTML/CSS here and hit import.</div>',
            modalImportContent: (ed: Editor) =>
              `${ed.getHtml()}<style>${ed.getCss()}</style>`,
          },
        },
        deviceManager: {
          devices: [
            { id: "desktop", name: "Desktop", width: "" },
            { id: "tablet", name: "Tablet", width: "768px", widthMedia: "992px" },
            { id: "mobile", name: "Mobile", width: "375px", widthMedia: "575px" },
          ],
        },
        blockManager: { appendTo: blocksHostRef.current! },
        // Plain sections first (Text, Background, Spacing, Size, Corners);
        // the rest sits behind the panel's "Advanced" toggle.
        styleManager: { appendTo: stylesHostRef.current!, sectors: STYLE_SECTORS },
        layerManager: { appendTo: layersHostRef.current! },
        traitManager: { appendTo: traitsHostRef.current! },
        selectorManager: { appendTo: selectorsHostRef.current! },
      });

      // Register the full Nullkode block library on top of the plugin defaults.
      registerBlocks(editor);
      registerPremadeBlocks(editor);
      // One click on any words starts editing them.
      clickToEdit(editor);

      // Give every block tile a friendly hover note (picked up by the
      // HelpTips overlay via delegated data-help). GrapesJS owns this DOM,
      // so we annotate it after render instead of via JSX.
      editor.on("load", () => {
        const host = blocksHostRef.current;
        if (!host) return;
        host.querySelectorAll<HTMLElement>(".gjs-block").forEach((el) => {
          const label =
            el.querySelector(".gjs-block-label")?.textContent?.trim() ??
            el.getAttribute("title") ??
            "this";
          el.setAttribute(
            "data-help",
            `Drag "${label}" onto your page and drop it where you want it.`
          );
        });
        host.querySelectorAll<HTMLElement>(".gjs-block-category .gjs-title").forEach((el) => {
          el.setAttribute(
            "data-help",
            "A group of blocks. Click the name to show or hide them."
          );
        });

        // Per-field notes for the style/selector/trait/layer panels.
        // GrapesJS rebuilds those panels on every selection change, so this
        // watches them and re-annotates each field as it appears.
        panelHelpCleanupRef.current = observePanelHelp({
          styles: stylesHostRef.current,
          selectors: selectorsHostRef.current,
          traits: traitsHostRef.current,
          layers: layersHostRef.current,
        });
      });

      // When a premade block is dropped, check if it has a module mapping
      // and offer to wire it up with the backend.
      editor.on("block:drag:stop", (component: unknown, block: { getId?: () => string }) => {
        if (!block?.getId) return;
        const blockId = block.getId();
        const mapping = getModuleForBlock(blockId);
        if (mapping) {
          setWireUpMapping(mapping);
        }
      });

      // Icon block: clicking it opens the icon picker modal instead of
      // inserting a static SVG. This replaces the old dedicated Icons tab.
      editor.BlockManager.add("nk-icon-picker", {
        label: "Icon",
        category: "Basic",
        media: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 3 14.5 9 21 9.5 16 14 17.5 21 12 17.5 6.5 21 8 14 3 9.5 9.5 9 12 3"/></svg>`,
        content: `<span class="nk-icon" style="display:inline-block;width:32px;height:32px;color:var(--nk-primary);">⬡</span>`,
        activate: true,
      });

      // Double-click on any SVG or .nk-icon → reopen the icon picker to swap it.
      editor.on("component:dblclick", (component: ReturnType<typeof editor.getSelected>) => {
        if (!component) return;
        const tag = component.get("tagName")?.toLowerCase();
        const classes = (component.getClasses?.() ?? []).join(" ");
        if (tag === "svg" || classes.includes("nk-icon")) {
          const id = component.getId();
          setIconReplaceId(id);
          setIconPickerOpen(true);
        }
      });

      // GrapesJS ships default top/right-side panel chrome (styles/layers/
      // traits/blocks icons + device switcher + options) that we don't want
      // because we render our own tabs and toolbar. removePanel() is
      // unreliable across plugin variants — it silently no-ops when the
      // preset uses different panel IDs — so we also hide them with CSS
      // below in the component JSX to be sure they disappear.
      editor.Panels.removePanel("views");
      editor.Panels.removePanel("views-container");
      editor.Panels.removePanel("devices-c");
      editor.Panels.removePanel("options");

      // Element settings (plain labels, flow pickers only on forms, lists
      // and flow buttons) come from the plainSettings plugin above.

      editorRef.current = editor;
      setEditorReady(true);
      props.onReady?.(editor);
      editor.on("component:selected", () => {
        const sel = editor.getSelected();
        setSelectedName(sel?.getName() || "Element");
        setHasSettings((sel?.getTraits().length ?? 0) > 0);
      });
      editor.on("component:deselected", () => { setSelectedName(""); setHasSettings(false); });

      // Keep our device toolbar in sync with grapesjs's internal device state
      // — anything that calls editor.setDevice(...) will flip our buttons.
      editor.on("change:device", () => {
        const current = editor.getDevice?.() || "desktop";
        const name = current.toLowerCase();
        if (name === "tablet") setDevice("tablet");
        else if (name === "mobile") setDevice("mobile");
        else setDevice("desktop");
      });

      // Capture each page's payload before unmount. Serialize saves so an older
      // response cannot overwrite newer edits; page navigation awaits flush().
      let timer: ReturnType<typeof setTimeout> | null = null;
      let dirty = false;
      let queue: Promise<boolean> = Promise.resolve(true);
      const flush = (): Promise<boolean> => {
        if (timer) { clearTimeout(timer); timer = null; }
        if (!dirty) return queue;
        dirty = false;
        const snapshot = () => JSON.stringify({
          html: editor.getHtml(), css: editor.getCss(),
          components: JSON.parse(JSON.stringify(editor.getComponents())),
          styles: JSON.parse(JSON.stringify(editor.getStyle())),
        });
        // Taken now in case the editor is gone by the time the sync is done
        // (leaving the page); without text editing it's the payload itself.
        const now = snapshot();
        // Text being typed lives only in the page until editing stops; copy
        // it into the page model first (what GrapesJS's own storage does) so
        // words typed after a single click are saved without clicking away.
        const synced = editor.getEditing() ? syncEditingText(editor).catch(() => {}) : null;
        if (mounted) setStatus("saving");
        queue = queue.catch(() => false).then(async () => {
          let payload = now;
          if (synced) {
            await synced;
            try { payload = snapshot(); } catch { /* editor closed: keep the earlier copy */ }
          }
          try {
            const res = await fetch(`/api/projects/${props.projectId}/pages/${props.pageId}`, {
              method: "PATCH", headers: { "content-type": "application/json" },
              body: payload, keepalive: payload.length < 60000,
            });
            if (!res.ok) throw new Error("Save failed");
            if (mounted) setStatus(dirty ? "idle" : "saved");
            return true;
          } catch {
            dirty = true;
            if (mounted) setStatus("error");
            return false;
          }
        });
        return queue;
      };
      flushOnDestroyRef.current = flush;
      props.onSaveReady?.(flush);
      const markDirty = () => {
        dirty = true;
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => { void flush(); }, 800);
      };
      editor.on("update", markDirty);
      // Typing inside text doesn't fire "update" until editing stops.
      editor.on("component:input", markDirty);

    })();

    return () => {
      mounted = false;
      void flushOnDestroyRef.current?.();
      flushOnDestroyRef.current = null;
      panelHelpCleanupRef.current?.();
      panelHelpCleanupRef.current = null;
      editorRef.current?.destroy();
      editorRef.current = null;
      props.onDestroy?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.projectId]);

  const setEditorDevice = (name: "desktop" | "tablet" | "mobile") => {
    const ed = editorRef.current;
    if (!ed) return;
    const label = name === "desktop" ? "Desktop" : name === "tablet" ? "Tablet" : "Mobile";
    ed.setDevice?.(label);
    setDevice(name);
  };

  return (
    <div className="studio-canvas-workspace absolute inset-0 flex bg-surface-950 text-surface-50">
      {/* Kill any GrapesJS default chrome that survives removePanel() — the
          plugin landscape uses inconsistent panel IDs, so a CSS sledgehammer
          is more reliable than Panels.removePanel() alone. */}
      <style>{`
        .gjs-pn-panels .gjs-pn-views,
        .gjs-pn-panels .gjs-pn-views-container,
        .gjs-pn-panels .gjs-pn-devices-c,
        .gjs-pn-panels .gjs-pn-options,
        .gjs-pn-panels .gjs-pn-commands { display: none !important; }
        .gjs-editor .gjs-cv-canvas { top: 0 !important; width: 100% !important; height: 100% !important; }

        /* Stronger separators in side panels */
        .nk-styles .gjs-sm-sector { border-top: 1px solid rgba(255,255,255,0.08) !important; }
        .nk-styles .gjs-sm-sector-title { border-bottom: 1px solid rgba(255,255,255,0.06) !important; padding: 10px 8px !important; }
        .nk-selectors { border-bottom: 1px solid rgba(255,255,255,0.1) !important; }
        .nk-layers .gjs-layer { border-bottom: 1px solid rgba(255,255,255,0.06) !important; }
        .nk-traits .gjs-trt-trait { border-bottom: 1px solid rgba(255,255,255,0.06) !important; padding-bottom: 8px !important; margin-bottom: 8px !important; }
        .nk-blocks .gjs-block-category { border-bottom: 1px solid rgba(255,255,255,0.08) !important; }
        .nk-blocks .gjs-block-category .gjs-title { border-bottom: 1px solid rgba(255,255,255,0.05) !important; }

        /* Design panel: plain sections, then the Advanced toggle, then the
           advanced sections and the shared-styles picker (hidden until open). */
        .nk-design { flex-direction: column; }
        .nk-design .nk-styles, .nk-design .nk-styles > .gjs-sm-sectors { display: contents; }
        .nk-design .gjs-sm-sector { order: 0; }
        .nk-design .nk-adv-toggle { order: 1; display: flex; align-items: center; gap: 8px; margin-top: 10px; padding: 10px 8px; font-size: 12px; font-weight: 600; color: rgb(203 213 225); border-top: 1px solid rgba(255,255,255,0.1); text-align: left; }
        .nk-design .nk-adv-toggle:hover { color: #fff; }
        .nk-design .gjs-sm-sector[class*="gjs-sm-sector__adv-"] { order: 2; }
        .nk-design .nk-selectors-wrap { order: 3; padding: 12px 8px; border-top: 1px solid rgba(255,255,255,0.08); }
        .nk-design:not(.nk-adv-open) .gjs-sm-sector[class*="gjs-sm-sector__adv-"],
        .nk-design:not(.nk-adv-open) .nk-selectors-wrap { display: none !important; }

        /* GrapesJS renders the class picker into its host twice; show one. */
        .nk-selectors > .gjs-clm-tags ~ .gjs-clm-tags { display: none !important; }

        /* Make the selector area stand out more */
        .nk-selectors .gjs-clm-tags { padding: 6px 0 !important; }
        .nk-selectors .gjs-clm-tag { border-color: var(--color-brand-500) !important; }
      `}</style>
      {/* Icon picker modal — opens from the Icon block or double-click on any SVG */}
      {editorReady && editorRef.current && (
        <IconPickerModal
          editor={editorRef.current}
          open={iconPickerOpen}
          onClose={() => {
            setIconPickerOpen(false);
            setIconReplaceId(null);
          }}
          replaceComponentId={iconReplaceId}
        />
      )}

      {/* Wire-up modal — appears when a premade block with a module mapping is dropped */}
      {wireUpMapping && (
        <WireUpModal
          mapping={wireUpMapping}
          projectId={props.projectId}
          open={!!wireUpMapping}
          onClose={() => setWireUpMapping(null)}
          onWired={() => setWireUpMapping(null)}
        />
      )}

      {/* Left: blocks + modules + assets */}
      <aside className={`studio-editor-library shrink-0 border-r border-surface-800 bg-surface-900 flex flex-col ${leftOpen ? "" : "!hidden"}`}>
        <div className="flex items-stretch border-b border-surface-800 shrink-0">
          {(["blocks", "modules", "assets"] as const).map((t) => (
            <button
              key={t}
              data-help={
                t === "blocks"
                  ? "Ready-made pieces for your page: text, pictures, buttons, whole sections. Drag one onto the page to add it."
                  : t === "modules"
                    ? "Ready-made features, like bookings or a shop. Add one and it comes with its own pages, ready to use."
                    : "All your pictures live here. Upload one, then drag it onto your page."
              }
              onClick={() => setLeftTab(t)}
              className={`flex-1 py-2.5 text-[11px] uppercase tracking-wider font-semibold transition ${
                leftTab === t
                  ? "text-white border-b-2 border-brand-500"
                  : "text-surface-500 hover:text-surface-200"
              }`}
            >
              {t === "modules" ? "Features" : t}
            </button>
          ))}
        </div>
        <div className={`flex-1 min-h-0 flex flex-col ${leftTab === "blocks" ? "" : "hidden"}`}>
          <div className="px-3 py-2 border-b border-surface-800 shrink-0">
            <input
              type="search"
              value={blockSearch}
              onChange={(e) => {
                const q = e.target.value;
                setBlockSearch(q);
                // Filter GrapesJS blocks by matching against their label text.
                // Each block renders as .gjs-block with a .gjs-block-label child.
                const host = blocksHostRef.current;
                if (!host) return;
                const blocks = host.querySelectorAll<HTMLElement>(".gjs-block");
                const lower = q.toLowerCase();
                blocks.forEach((el) => {
                  const label = el.querySelector(".gjs-block-label")?.textContent ?? el.getAttribute("title") ?? "";
                  el.style.display = !lower || label.toLowerCase().includes(lower) ? "" : "none";
                });
                // Also hide empty category headers
                const cats = host.querySelectorAll<HTMLElement>(".gjs-block-category");
                cats.forEach((cat) => {
                  const visible = cat.querySelectorAll<HTMLElement>('.gjs-block:not([style*="display: none"])');
                  cat.style.display = !lower || visible.length > 0 ? "" : "none";
                });
              }}
              placeholder="Search blocks..."
              data-help="Type here to find a block fast — try words like 'button' or 'photo'."
              className="w-full bg-surface-950 border border-surface-800 rounded px-2.5 py-1.5 text-xs text-surface-100 placeholder:text-surface-600 focus:outline-none focus:border-brand-500"
            />
          </div>
          <div ref={blocksHostRef} className="nk-blocks flex-1 overflow-y-auto" />
        </div>
        <div className={`flex-1 min-h-0 ${leftTab === "modules" ? "" : "hidden"}`}>
          <ModulesPanel projectId={props.projectId} />
        </div>
        <div className={`flex-1 min-h-0 ${leftTab === "assets" ? "" : "hidden"}`}>
          {editorReady && editorRef.current && (
            <AssetsPanel editor={editorRef.current} />
          )}
        </div>
      </aside>

      {/* Center: canvas */}
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="studio-canvas-toolbar">
          <div className="flex items-center gap-3">
            <button className="studio-icon-button" aria-label="Toggle blocks panel" aria-pressed={leftOpen} onClick={() => setLeftOpen((v) => !v)}><PanelLeft size={16} /></button>
            <button className="studio-icon-button" aria-label="Undo" title="Undo" onClick={() => editorRef.current?.UndoManager.undo()}><Undo2 size={15} /></button>
            <button className="studio-icon-button" aria-label="Redo" title="Redo" onClick={() => editorRef.current?.UndoManager.redo()}><Redo2 size={15} /></button>
            <span role="status" aria-live="polite" className={`studio-save-status ${status === "error" ? "text-red-300" : "text-surface-400"}`}>
              {status === "saving" ? <><Loader2 size={12} className="animate-spin" />Saving…</> : status === "error" ? <button onClick={() => void flushOnDestroyRef.current?.()}>Save failed · Retry</button> : <><Check size={12} />{status === "saved" ? "Saved" : "Autosave on"}</>}
            </span>
          </div>
          <div className="flex items-center gap-2">
          <button className="studio-icon-button" aria-label="Toggle properties panel" aria-pressed={rightOpen} onClick={() => setRightOpen((v) => !v)}><PanelRight size={16} /></button>
          <div className="flex items-center gap-1 bg-surface-900 rounded-md p-0.5 border border-surface-800">
            {(
              [
                { id: "desktop" as const, label: "Desktop", icon: (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="13" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                  ) },
                { id: "tablet" as const, label: "Tablet", icon: (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="12" y1="18" x2="12" y2="18.01"/></svg>
                  ) },
                { id: "mobile" as const, label: "Mobile", icon: (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="2" width="12" height="20" rx="2"/><line x1="12" y1="18" x2="12" y2="18.01"/></svg>
                  ) },
              ] as const
            ).map((d) => (
              <button
                key={d.id}
                onClick={() => setEditorDevice(d.id)}
                title={d.label}
                aria-label={d.label}
                data-help={
                  d.id === "desktop"
                    ? "See how your page looks on a big computer screen."
                    : d.id === "tablet"
                      ? "See how your page looks on a tablet, like an iPad."
                      : "See how your page looks on a phone. Always check this — most visitors use phones!"
                }
                className={`flex items-center justify-center w-8 h-6 rounded transition ${
                  device === d.id
                    ? "bg-brand-500/25 text-brand-200"
                    : "text-surface-500 hover:text-surface-100 hover:bg-surface-800"
                }`}
              >
                {d.icon}
              </button>
            ))}
          </div>
          <a
            href={`/preview/${props.projectId}`}
            target="_blank"
            rel="noopener noreferrer"
            data-help="Open your app in a new tab and try it for real — buttons, forms and all — just like your visitors will."
            className="flex items-center gap-1.5 bg-brand-500 hover:bg-brand-400 text-white font-semibold px-3 py-1 rounded-md transition text-xs"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            Preview
          </a>
          </div>
        </div>
        <div ref={editorHostRef} className="flex-1 min-h-0 relative" />
      </div>

      {/* Right: styles/layers/traits */}
      <aside className={`studio-editor-inspector shrink-0 border-l border-surface-800 bg-surface-900 flex flex-col ${rightOpen ? "" : "!hidden"}`}>
        <div className="flex items-stretch border-b border-surface-800 shrink-0">
          {(["styles", "layers", "traits", "theme"] as const).map((t) => (
            <button
              key={t}
              data-help={
                t === "styles"
                  ? "Change how the selected piece looks: text, colors, spacing and size. Click something on the page first."
                  : t === "layers"
                    ? "Everything on your page in order, top to bottom. Handy for picking pieces that are hard to click."
                    : t === "traits"
                      ? "Settings for the selected piece, like where a link goes or what a form does when it's sent."
                      : "Quick color and font settings for your whole app, right here in the editor."
              }
              onClick={() => setRightTab(t)}
              className={`flex-1 py-2.5 text-xs uppercase tracking-wider font-semibold transition ${
                rightTab === t
                  ? "text-white border-b-2 border-brand-500"
                  : "text-surface-500 hover:text-surface-200"
              }`}
            >
              {t === "traits" ? "Settings" : t === "styles" ? "Design" : t}
            </button>
          ))}
        </div>
        <div className="studio-selection-label"><MousePointer2 size={13} /><span>{selectedName || "Select something on your page"}</span></div>
        <div className="flex-1 overflow-y-auto">
          {/* Plain sections first; the "adv-" sections and the class/state
              picker only show once "Advanced" is opened. The GrapesJS
              wrappers use display:contents so CSS order can put the toggle
              between the plain and advanced sections. */}
          <div className={`nk-design p-2 ${rightTab === "styles" ? "flex" : "hidden"} ${advancedOpen ? "nk-adv-open" : ""}`}>
            <div
              ref={stylesHostRef}
              className="nk-styles"
              data-help="How the piece you picked looks: text, colors, spacing and size. Change one and the page updates right away."
            />
            <button
              type="button"
              className="nk-adv-toggle"
              aria-expanded={advancedOpen}
              onClick={() => setAdvancedOpen((v) => !v)}
              data-help="More detailed design options, like fonts, shadows and how pieces line up inside a box. You won't need these often."
            >
              <span aria-hidden className={`inline-block transition ${advancedOpen ? "rotate-90" : ""}`}>›</span>
              Advanced
            </button>
            <div
              className="nk-selectors-wrap"
              data-help="Style names this piece shares with others, and styles for when the mouse is over it."
            >
              <div className="text-[10px] uppercase tracking-wider text-surface-400 mb-2">Shared styles and hover</div>
              <div ref={selectorsHostRef} className="nk-selectors" />
            </div>
          </div>
          <div className={rightTab === "layers" ? "block" : "hidden"}>
            <div
              ref={layersHostRef}
              className="nk-layers p-2"
              data-help="Every piece of your page, in order. Click a row to select that piece; drag rows to move pieces around."
            />
          </div>
          <div className={rightTab === "traits" ? "block" : "hidden"}>
            {!hasSettings && (
              <p className="px-4 pt-4 text-xs leading-relaxed text-surface-400">
                {selectedName
                  ? "Nothing to set up here. Links, pictures, buttons, forms and lists have settings in this tab."
                  : "Select a link, picture, button, form or list on your page to see its settings."}
              </p>
            )}
            <div
              ref={traitsHostRef}
              className="nk-traits p-3"
              data-help="Settings for the piece you picked, like where a link goes or what a form does when it's sent."
            />
          </div>
          <div className={rightTab === "theme" ? "block" : "hidden"}>
            {editorReady && editorRef.current && (
              <ThemePanel projectId={props.projectId} editor={editorRef.current} />
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
