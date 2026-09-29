"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import type { Editor, Block, Component } from "grapesjs";
import { Check, Loader2, PanelLeft, PanelRight, Redo2, Undo2, MousePointer2, History } from "lucide-react";
import { registerBlocks } from "./blocks";
import { registerPremadeBlocks } from "./premade-blocks";
import { AssetsPanel } from "./assets-panel";
import { ModulesPanel } from "./modules-panel";
import { IconPickerModal } from "./icon-picker-modal";
import { ThemePanel } from "./theme-panel";
import { WireUpModal } from "./wire-up-modal";
import { getModuleForBlock, type BlockModuleMapping } from "./block-module-map";
import { observePanelHelp } from "./panel-help";
import {
  STYLE_SECTORS,
  clickToEdit,
  isWholePartBlock,
  pageHtmlNow,
  placeForBlock,
  plainSettings,
  scrollToPart,
  syncEditingText,
  syncEditingTextNow,
  type FlowOption,
} from "./plain-editor";
import { markersInsideBody } from "@/lib/page-visibility";
import { clearDraft, contentKey, draftIsNewer, loadDraft, noteSentOnClose, pruneDrafts, saveDraft, takeSentOnClose, type PageDraft } from "@/lib/editor/draft-store";
import type { InstallResult } from "@/components/modules/install-dialog";

/** Where the page's saving stands, for the toolbar and the editor shell. */
export type SaveStatus = "idle" | "pending" | "saving" | "saved" | "error";

/** Handed to the editor shell once the editor is running. */
export type EditorSaveApi = {
  /** Saves now; resolves true once every edit made so far is on the server. */
  flush: () => Promise<boolean>;
  /** Forgets unsaved edits (no save on the way out, local copy removed). */
  discard: () => void;
};

type Props = {
  projectId: string;
  pageId: string;
  /** The page's address, for the Preview button. */
  pageSlug?: string;
  /** The app's name, to prefill a feature's questions. */
  projectName?: string;
  initialHtml: string;
  initialCss: string;
  initialComponents: object | null;
  initialStyles: object | null;
  /** When the server last saved this page, to tell whether a copy kept in the browser is newer. */
  updatedAt?: string | null;
  onReady?: (editor: Editor) => void;
  onSaveReady?: (api: EditorSaveApi) => void;
  onStatusChange?: (status: SaveStatus) => void;
  /** A feature was added from the Features panel. */
  onFeatureAdded?: (result: InstallResult) => void | Promise<void>;
  /** Fired when this editor instance is destroyed, so holders of the
   *  instance (e.g. EditorShell's ref) can drop it before it goes stale. */
  onDestroy?: () => void;
};

/** Saves sent as a tab closes ride on keepalive, which browsers cap at 64 KB. */
const KEEPALIVE_LIMIT = 60_000;
const fitsKeepalive = (s: string) => s.length * 3 < KEEPALIVE_LIMIT || new TextEncoder().encode(s).length < KEEPALIVE_LIMIT;

/*
 * "Leave site? Changes you made may not be saved." while any editor has
 * edits that aren't on the server yet (waiting, being sent, or failed).
 */
const unsafeEditors = new Set<object>();
function warnBeforeLeaving(e: BeforeUnloadEvent) {
  e.preventDefault();
  // Older browsers only prompt when a value is set.
  e.returnValue = "";
}
function setUnsafe(token: object, unsafe: boolean) {
  const before = unsafeEditors.size > 0;
  if (unsafe) unsafeEditors.add(token);
  else unsafeEditors.delete(token);
  const after = unsafeEditors.size > 0;
  if (after && !before) window.addEventListener("beforeunload", warnBeforeLeaving);
  else if (!after && before) window.removeEventListener("beforeunload", warnBeforeLeaving);
}

const STATUS_TEXT: Record<SaveStatus, string> = {
  idle: "Autosave on",
  pending: "Unsaved changes",
  saving: "Saving…",
  saved: "Saved",
  error: "Not saved",
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
  const panelHelpCleanupRef = useRef<(() => void) | null>(null);
  // The latest props, for callbacks made from inside the editor's setup.
  const propsRef = useRef(props);
  propsRef.current = props;

  const [status, setStatus] = useState<SaveStatus>("idle");
  const [rightTab, setRightTab] = useState<"styles" | "layers" | "traits" | "theme">("styles");
  const [leftTab, setLeftTab] = useState<"blocks" | "modules" | "assets">("blocks");
  const [editorReady, setEditorReady] = useState(false);
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [selectedName, setSelectedName] = useState("");
  const saveApiRef = useRef<EditorSaveApi | null>(null);
  const markDirtyRef = useRef<(() => void) | null>(null);
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [iconReplaceId, setIconReplaceId] = useState<string | null>(null);
  const [blockSearch, setBlockSearch] = useState("");
  const [wireUpMapping, setWireUpMapping] = useState<BlockModuleMapping | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [hasSettings, setHasSettings] = useState(false);
  const [draftOffer, setDraftOffer] = useState<{ draft: PageDraft; newer: boolean } | null>(null);

  useEffect(() => {
    let mounted = true;
    let cleanupSaving: (() => void) | null = null;
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

      // A tapped block (phones and tablets can't drag): see tapToAdd below.
      let tapToAdd: (block: Block, ed: Editor) => void = () => {};

      const editor = grapes.init({
        container: editorHostRef.current,
        height: "100%",
        width: "100%",
        storageManager: false,
        fromElement: false,
        showOffsets: true,
        noticeOnUnload: false,
        parser: {
          optionsHtml: {
            // GrapesJS strips <script> tags by default, which silently deleted
            // the browser-side logic of AI-built features (game loops, canvas
            // drawing, geolocation) on the first autosave after an AI edit.
            // Pages are only ever authored by the owner, so keeping their own
            // scripts is safe — published pages already execute them.
            allowScripts: true,
            // Keeps the page's "signed-in only" / "admins only" / menu markers
            // (HTML comments at the top) through every parse: comments before
            // the first element would otherwise be dropped, and the next save
            // would make the page public.
            preParser: (input: string) => markersInsideBody(input),
          },
        },
        components: props.initialComponents ? (props.initialComponents as unknown as string) : markersInsideBody(props.initialHtml),
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
        blockManager: {
          appendTo: blocksHostRef.current!,
          appendOnClick: (block: Block, ed: Editor) => tapToAdd(block, ed),
        },
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
            `Tap or drag: tap "${label}" to add it below the part you picked, or drag it to where you want it.`
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

      // Opens the icon picker to replace a freshly added Icon placeholder.
      const pickIconFor = (component: Component) => {
        const id = component.getId();
        // The picker finds the placeholder by its id on the page.
        component.addAttributes({ id });
        setIconReplaceId(id);
        setIconPickerOpen(true);
      };

      // When a premade block is dropped, check if it has a module mapping
      // and offer to wire it up with the backend.
      editor.on("block:drag:stop", (component: Component | Component[] | undefined, block: { getId?: () => string }) => {
        if (!block?.getId) return;
        const blockId = block.getId();
        const first = Array.isArray(component) ? component[0] : component;
        if (blockId === "nk-icon-picker" && first) return pickIconFor(first);
        const mapping = getModuleForBlock(blockId);
        if (mapping) {
          setWireUpMapping(mapping);
        }
      });

      // Tap to add: dragging doesn't work on touch screens, and a tap is
      // simpler anywhere. A tapped block goes after the part that's picked
      // (see placeForBlock), is selected and scrolled to, and gets the same
      // follow-ups a dropped block gets.
      tapToAdd = (block, ed) => {
        const content = block.get("content");
        if (!content) return;
        const id = block.getId();
        const { parent, at } = placeForBlock(ed, isWholePartBlock(id, String(block.getCategoryLabel?.() ?? "")));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const added = parent.append(content as any, { at });
        const first = Array.isArray(added) ? added[0] : (added as Component | undefined);
        if (!first) return;
        ed.select(first);
        scrollToPart(ed, first);
        // Under 700px the blocks panel covers the page.
        if (window.innerWidth < 700) setLeftOpen(false);
        if (id === "nk-icon-picker") return pickIconFor(first);
        if (block.get("activate")) first.trigger("active");
        const mapping = getModuleForBlock(id);
        if (mapping) setWireUpMapping(mapping);
      };

      // Icon block: opens the icon picker to choose the icon (tapped or
      // dropped). This replaces the old dedicated Icons tab.
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
        // On touch screens, a piece picked near the bottom edge is brought
        // up, so its toolbar (Move up, Move down…) isn't under a thumb, the
        // keyboard or the Ask AI button.
        if (sel && window.matchMedia("(pointer: coarse)").matches) {
          const el = sel.getEl();
          const win = editor.Canvas.getWindow();
          const top = el?.getBoundingClientRect().top;
          if (top !== undefined && win && (top > win.innerHeight * 0.6 || top < 0)) scrollToPart(editor, sel);
        }
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

      cleanupSaving = startSaving(editor);
    })();

    /*
     * Saving. Edits save 800 ms after typing stops, in order, one at a time.
     * A copy also goes into this browser every 300 ms of editing (see
     * lib/editor/draft-store.ts) until the server has the edits. When the tab
     * is hidden or closed, the latest edits are sent at once, on keepalive.
     * Every copy sent is numbered; the server ignores one that arrives after
     * a newer one (a slow save overtaken by the one sent as the tab closed).
     */
    function startSaving(editor: Editor): () => void {
      const { projectId, pageId } = props;
      const url = `/api/projects/${projectId}/pages/${pageId}`;
      const token = {};
      const session = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      let seq = 0; // numbers every copy sent
      let savedSeq = 0; // the newest copy the server confirmed
      let failedSeq = 0; // the newest copy that failed
      let dirty = false; // edits not yet in a copy
      let inFlight = 0;
      let everSaved = false;
      let discarded = false;
      let composing = false;
      let baseUpdatedAt = props.updatedAt ?? null;
      // Fingerprint of the server's copy (as loaded, then as last saved).
      let baseKey = "";
      let saveTimer: ReturnType<typeof setTimeout> | null = null;
      let draftTimer: ReturnType<typeof setTimeout> | null = null;
      let retryTimer: ReturnType<typeof setTimeout> | null = null;
      let retryDelay = 2000;
      let queue: Promise<unknown> = Promise.resolve();
      let hideSave: Promise<unknown> = Promise.resolve();

      const failed = () => failedSeq > savedSeq;
      const unsafe = () => !discarded && (dirty || inFlight > 0 || failed());
      const report = () => {
        const next: SaveStatus = failed() ? "error" : inFlight > 0 ? "saving" : dirty ? "pending" : everSaved ? "saved" : "idle";
        if (mounted) {
          setStatus(next);
          propsRef.current.onStatusChange?.(next);
        }
        setUnsafe(token, unsafe());
      };

      const takeCopy = () => ({
        html: editor.getHtml(),
        css: editor.getCss() ?? "",
        components: JSON.parse(JSON.stringify(editor.getComponents())),
        styles: JSON.parse(JSON.stringify(editor.getStyle())),
      });

      const writeDraft = (html?: string, css?: string) => {
        if (!unsafe()) return;
        try {
          void saveDraft({
            projectId,
            pageId,
            html: html ?? pageHtmlNow(editor),
            css: css ?? editor.getCss() ?? "",
            savedAt: Date.now(),
            baseUpdatedAt,
            baseKey,
          });
        } catch {
          /* the editor is closing */
        }
      };

      const send = (copy: ReturnType<typeof takeCopy>, mySeq: number, keepalive: boolean): Promise<boolean> => {
        const takenAt = Date.now();
        let body = JSON.stringify({ ...copy, clientSession: session, clientSeq: mySeq });
        let useKeepalive = false;
        if (keepalive) {
          if (fitsKeepalive(body)) useKeepalive = true;
          else {
            // Too big to survive the tab closing: send the page itself, which
            // is what visitors see, and let the editor rebuild from it.
            const lite = JSON.stringify({ html: copy.html, css: copy.css, clientSession: session, clientSeq: mySeq });
            if (fitsKeepalive(lite)) {
              body = lite;
              useKeepalive = true;
            }
          }
        }
        inFlight++;
        report();
        return fetch(url, { method: "PATCH", headers: { "content-type": "application/json" }, body, keepalive: useKeepalive })
          .then(async (res) => {
            if (!res.ok) throw new Error("Save failed");
            const data = (await res.json().catch(() => null)) as { page?: { updatedAt?: string } } | null;
            if (mySeq > savedSeq) {
              savedSeq = mySeq;
              if (data?.page?.updatedAt) baseUpdatedAt = data.page.updatedAt;
              baseKey = contentKey(copy.html, copy.css);
            }
            everSaved = true;
            retryDelay = 2000;
            // Everything up to now is on the server: the browser copy can go.
            if (!dirty && savedSeq >= seq) void clearDraft(projectId, pageId, takenAt);
            return true;
          })
          .catch(() => {
            if (mySeq > savedSeq) {
              failedSeq = Math.max(failedSeq, mySeq);
              dirty = true;
              if (mounted && !discarded && !retryTimer) {
                retryTimer = setTimeout(() => { retryTimer = null; void flush(); }, retryDelay);
                retryDelay = Math.min(retryDelay * 2, 30_000);
              }
            }
            return false;
          })
          .finally(() => {
            inFlight--;
            report();
          });
      };

      // Capture each page's payload before unmount. Serialize saves so an older
      // response cannot overwrite newer edits; page navigation awaits flush().
      const flush = async (): Promise<boolean> => {
        if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
        if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
        if (discarded) return true;
        if (dirty) {
          dirty = false;
          const mySeq = ++seq;
          // Text being typed lives only in the page until editing stops; copy
          // it into the page model first (what GrapesJS's own storage does) so
          // words typed after a single click are saved without clicking away.
          const synced = editor.getEditing() ? syncEditingText(editor).catch(() => {}) : null;
          // Taken now in case the editor is gone by the time the sync is done
          // (leaving the page); without text editing it's the payload itself.
          const early = takeCopy();
          queue = queue.catch(() => {}).then(async () => {
            let copy = early;
            if (synced) {
              await synced;
              try { copy = takeCopy(); } catch { /* editor closed: keep the earlier copy */ }
            }
            await send(copy, mySeq, false);
          });
          report();
        }
        const target = seq;
        await Promise.allSettled([queue, hideSave]);
        return savedSeq >= target;
      };

      // The tab is being hidden or closed: send the latest edits right away.
      const saveNow = () => {
        if (!unsafe()) return;
        if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
        let copy: ReturnType<typeof takeCopy>;
        try {
          if (editor.getEditing()) syncEditingTextNow(editor);
          copy = takeCopy();
        } catch {
          return;
        }
        writeDraft(copy.html, copy.css);
        noteSentOnClose(projectId, pageId, contentKey(copy.html, copy.css));
        dirty = false;
        hideSave = send(copy, ++seq, true);
        report();
      };

      const saveSoon = () => {
        saveTimer = null;
        // Wait for a phone keyboard to finish a word before touching the text.
        if (composing) saveTimer = setTimeout(saveSoon, 800);
        else void flush();
      };
      const markDirty = () => {
        if (discarded) return;
        dirty = true;
        report();
        if (saveTimer) clearTimeout(saveTimer);
        saveTimer = setTimeout(saveSoon, 800);
        if (!draftTimer) draftTimer = setTimeout(() => { draftTimer = null; writeDraft(); }, 300);
      };
      editor.on("update", markDirty);
      // Typing inside text doesn't fire "update" until editing stops.
      editor.on("component:input", markDirty);
      markDirtyRef.current = markDirty;

      const discard = () => {
        discarded = true;
        dirty = false;
        for (const t of [saveTimer, draftTimer, retryTimer]) if (t) clearTimeout(t);
        saveTimer = draftTimer = retryTimer = null;
        void clearDraft(projectId, pageId);
        report();
      };
      saveApiRef.current = { flush, discard };
      propsRef.current.onSaveReady?.({ flush, discard });

      const onVisibility = () => { if (document.visibilityState === "hidden") saveNow(); };
      const onOnline = () => { if (failed() || dirty) void flush(); };
      window.addEventListener("pagehide", saveNow);
      document.addEventListener("visibilitychange", onVisibility);
      window.addEventListener("online", onOnline);

      editor.on("load", () => {
        // Phone keyboards build each word as a "composition"; saving copies
        // the text into the page, which would break the word being typed.
        try {
          const doc = editor.Canvas.getDocument();
          doc?.addEventListener("compositionstart", () => { composing = true; });
          doc?.addEventListener("compositionend", () => { composing = false; });
        } catch {
          /* no canvas yet */
        }
        // Edits from an earlier visit that never reached the server.
        baseKey = contentKey(editor.getHtml(), editor.getCss() ?? "");
        const sentOnClose = takeSentOnClose(projectId, pageId);
        void (async () => {
          void pruneDrafts();
          const draft = await loadDraft(projectId, pageId);
          if (!draft || !mounted || discarded) return;
          // The server has them: the save sent as the tab closed arrived, or
          // the copy is what's on the server anyway.
          if (sentOnClose === baseKey || contentKey(draft.html, draft.css) === baseKey) {
            void clearDraft(projectId, pageId);
            return;
          }
          // Newer if the server copy is still the one the edits started from
          // (menu changes aside), or if it was simply saved after it.
          const newer = draft.baseKey === baseKey || draftIsNewer(draft, propsRef.current.updatedAt);
          setDraftOffer({ draft, newer });
        })();
      });

      return () => {
        window.removeEventListener("pagehide", saveNow);
        document.removeEventListener("visibilitychange", onVisibility);
        window.removeEventListener("online", onOnline);
        if (draftTimer) { clearTimeout(draftTimer); draftTimer = null; writeDraft(); }
        if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
        markDirtyRef.current = null;
        // Save what's left on the way out; the leave-site warning stays
        // until that save is done.
        if (discarded) {
          setUnsafe(token, false);
          return;
        }
        void flush().finally(() => setUnsafe(token, false));
      };
    }

    return () => {
      mounted = false;
      cleanupSaving?.();
      saveApiRef.current = null;
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

  const restoreDraft = useCallback(() => {
    const ed = editorRef.current;
    const offer = draftOffer;
    if (!ed || !offer) return;
    ed.setComponents(offer.draft.html);
    ed.setStyle(offer.draft.css);
    setDraftOffer(null);
    markDirtyRef.current?.();
  }, [draftOffer]);

  const discardDraft = useCallback(() => {
    void clearDraft(props.projectId, props.pageId);
    setDraftOffer(null);
  }, [props.projectId, props.pageId]);

  const flushNow = useCallback(() => saveApiRef.current?.flush() ?? Promise.resolve(true), []);
  const previewHref = `/preview/${props.projectId}${props.pageSlug ? `?page=${encodeURIComponent(props.pageSlug)}` : ""}`;

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

      {/* Wire-up modal — appears when a premade block with a module mapping is added */}
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
                  ? "Ready-made pieces for your page: text, pictures, buttons, whole sections. Tap or drag: tap one to add it below the part you picked, or drag it onto the page."
                  : t === "modules"
                    ? "Ready-made features, like bookings or a shop. Add one and it comes with its own pages, ready to use."
                    : "Free photos for your page. Tap or drag: tap one to add it, or to swap the picture you picked, or drag it onto the page."
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
            <p className="mt-1.5 text-[10px] leading-snug text-surface-500">Tap a block to add it below the part you picked, or drag it onto the page.</p>
          </div>
          <div ref={blocksHostRef} className="nk-blocks flex-1 overflow-y-auto" />
        </div>
        <div className={`flex-1 min-h-0 ${leftTab === "modules" ? "" : "hidden"}`}>
          <ModulesPanel
            projectId={props.projectId}
            projectName={props.projectName ?? ""}
            flush={flushNow}
            onInstalled={(result) => propsRef.current.onFeatureAdded?.(result)}
          />
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
            <span role="status" aria-live="polite" data-state={status} title={STATUS_TEXT[status]} className={`studio-save-status ${status === "error" ? "text-red-300" : "text-surface-400"}`}>
              <span className="studio-save-dot" aria-hidden />
              {status === "saving" ? <Loader2 size={12} className="studio-save-icon animate-spin" aria-hidden /> : status === "idle" || status === "saved" ? <Check size={12} className="studio-save-icon" aria-hidden /> : null}
              <span className="studio-save-text">{STATUS_TEXT[status]}</span>
              {status === "error" && <button type="button" className="studio-save-retry" onClick={() => void flushNow()}>Retry</button>}
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
                className={`studio-device-button flex items-center justify-center w-8 h-6 rounded transition ${
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
            href={previewHref}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Preview this page"
            data-help="Open this page in a new tab and try it for real — buttons, forms and all — just like your visitors will."
            className="studio-preview-button flex items-center gap-1.5 bg-brand-500 hover:bg-brand-400 text-white font-semibold px-3 py-1 rounded-md transition text-xs"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><polygon points="5 3 19 12 5 21 5 3"/></svg>
            <span>Preview</span>
          </a>
          </div>
        </div>
        {draftOffer && (
          <div role="alert" className="studio-draft-offer">
            <History size={15} className="shrink-0 text-amber-300" aria-hidden />
            <span className="min-w-0 flex-1">
              {draftOffer.newer
                ? "We found edits that didn't save. Restore them?"
                : `We found edits from ${new Date(draftOffer.draft.savedAt).toLocaleString()} that didn't save. This page has changed since then. Restore them anyway?`}
            </span>
            <span className="flex shrink-0 gap-2">
              <button type="button" className="btn-primary !min-h-0 !px-3 !py-1.5 text-xs" onClick={restoreDraft}>Restore</button>
              <button type="button" className="btn-ghost !min-h-0 !px-3 !py-1.5 text-xs" onClick={discardDraft}>Discard</button>
            </span>
          </div>
        )}
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
