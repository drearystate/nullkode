/**
 * Per-field help notes for the GrapesJS side panels (styles, selectors,
 * traits, layers). GrapesJS owns this DOM and re-renders it on every
 * selection change, so the notes are (re)applied by a MutationObserver —
 * see observePanelHelp(). The HelpTips overlay picks the notes up via the
 * delegated data-help attribute.
 *
 * Wording rule: every note must make sense to a 10-year-old. Say what the
 * field does, what happens when you change it, and give a concrete example
 * where it helps.
 *
 * The notes themselves are in messages/<locale>/editor.json (panelHelp,
 * blockHelp, blockCategories); this file only knows which fields have one.
 * Every function takes the editor's translator, `useTranslations("editor")`.
 */

/** Translates a key under "editor" (next-intl's `useTranslations("editor")`). */
export type EditorT = (key: string, values?: Record<string, string | number>) => string;

/** "z-index" → "zIndex", "adv-text" → "advText", "Live data" → "liveData": the message key for a GrapesJS id. */
export function messageKey(id: string): string {
  const k = id.replace(/[^a-zA-Z0-9]+([a-zA-Z0-9])/g, (_m, c: string) => c.toUpperCase()).replace(/[^a-zA-Z0-9]/g, "");
  return k.charAt(0).toLowerCase() + k.slice(1);
}

/** Style sections with a note (panelHelp.sectors). */
const SECTOR_IDS = new Set([
  "text",
  "colors",
  "spacing",
  "size",
  "corners",
  "adv-text",
  "adv-size",
  "adv-effects",
  "adv-layout",
  "adv-flex",
  "general",
  "layout",
  "dimension",
  "typography",
  "decorations",
  "extra",
  "flex",
  "background",
]);

/** Style fields with a note (panelHelp.styles), by CSS property. */
const STYLE_IDS = new Set([
  "display",
  "float",
  "position",
  "top",
  "right",
  "bottom",
  "left",
  "z-index",
  "overflow",
  "cursor",
  "width",
  "height",
  "max-width",
  "min-width",
  "max-height",
  "min-height",
  "margin",
  "margin-top",
  "margin-right",
  "margin-bottom",
  "margin-left",
  "padding",
  "padding-top",
  "padding-right",
  "padding-bottom",
  "padding-left",
  "font-family",
  "font-size",
  "font-weight",
  "letter-spacing",
  "color",
  "line-height",
  "text-align",
  "text-decoration",
  "text-shadow",
  "text-shadow-h",
  "text-shadow-v",
  "text-shadow-blur",
  "text-shadow-color",
  "text-transform",
  "vertical-align",
  "opacity",
  "border-radius",
  "border-top-left-radius",
  "border-top-right-radius",
  "border-bottom-left-radius",
  "border-bottom-right-radius",
  "border",
  "border-width",
  "border-style",
  "border-color",
  "box-shadow",
  "box-shadow-h",
  "box-shadow-v",
  "box-shadow-blur",
  "box-shadow-spread",
  "box-shadow-color",
  "box-shadow-type",
  "background",
  "background-color",
  "background-image",
  "background-repeat",
  "background-position",
  "background-attachment",
  "background-size",
  "flex-direction",
  "justify-content",
  "align-items",
  "align-content",
  "flex-wrap",
  "align-self",
  "flex-basis",
  "flex-grow",
  "flex-shrink",
  "order",
  "transition",
  "transition-property",
  "transition-duration",
  "transition-timing-function",
  "perspective",
  "transform",
  "transform-rotate-x",
  "transform-rotate-y",
  "transform-rotate-z",
  "transform-scale-x",
  "transform-scale-y",
  "transform-scale-z",
]);

/**
 * Element settings with a note (panelHelp.traits). The same keys name the
 * settings themselves (settings.<key>, see plain-editor.ts), which is how a
 * row is matched: GrapesJS only shows the setting's label.
 */
export const TRAIT_KEYS = [
  "hoverNote",
  "goesTo",
  "openInANewTab",
  "pictureDescription",
  "address",
  "answerName",
  "hintText",
  "startingValue",
  "mustBeFilledIn",
  "kind",
  "tickedAtTheStart",
  "buttonWords",
  "whenPressed",
  "whenSentRun",
  "whenPressedRun",
  "belongsToField",
  "showItemsFrom",
] as const;
export type TraitKey = (typeof TRAIT_KEYS)[number];

/** Block groups in the Blocks tab with a name and note (blockCategories.<key>), keyed by the group's id. */
export const BLOCK_CATEGORY_IDS = new Set([
  "Basic",
  "Layout",
  "Sections",
  "Content",
  "Media",
  "Interactive",
  "Forms",
  "Commerce",
  "Social",
  "Live data",
  "Premade",
  "Extra",
]);

/** Blocks whose name doesn't say it all, with a note (blockHelp.<key>), by block id. */
const BLOCK_HELP_IDS = new Set([
  "nk-section",
  "nk-container",
  "nk-grid",
  "nk-spacer",
  "nk-divider",
  "nk-lead",
  "nk-badge",
  "nk-icon-chip",
  "nk-accordion",
  "nk-tabs",
  "nk-carousel",
  "nk-modal",
  "nk-iframe",
  "nk-flow-form",
  "nk-data-list",
  "nk-data-table",
  "nk-data-cards",
  "nk-auth-gate",
  "nk-user-menu",
  "nk-signout",
  "nk-api-call",
  "nk-marquee-text",
]);

/** The message key for a block ("nk-icon-chip" → "nkIconChip", "column3-7" → "column37"). */
export function blockKey(id: string): string {
  return messageKey(id);
}

/** The hover note for a block tile: what it adds (when it needs saying) and how to add it. */
export function blockTip(t: EditorT, id: string, label: string): string {
  return BLOCK_HELP_IDS.has(id)
    ? t("panelHelp.blockTip", { about: t(`blockHelp.${blockKey(id)}`) })
    : t("panelHelp.blockTipGeneric", { label });
}

/** The hover note for a block group's title. */
export function blockCategoryTip(t: EditorT, id: string): string {
  return BLOCK_CATEGORY_IDS.has(id) ? t(`blockCategories.${messageKey(id)}.help`) : t("panelHelp.categoryGeneric");
}

/** The text toolbar that appears while you edit words: GrapesJS's English button title → key. */
const RTE_KEYS: Record<string, string> = {
  "Bold": "bold",
  "Italic": "italic",
  "Underline": "underline",
  "Strike-through": "strikeThrough",
  "Link": "link",
  "Wrap for style": "wrapForStyle",
};

function setHelp(el: Element, text: string) {
  if (el.getAttribute("data-help") !== text) el.setAttribute("data-help", text);
}

function annotateStyles(host: HTMLElement, t: EditorT) {
  host.querySelectorAll(".gjs-sm-sector").forEach((sector) => {
    const key = /gjs-sm-sector__([a-z0-9-]+)/.exec(sector.className)?.[1] ?? "";
    const title = sector.querySelector(".gjs-sm-sector-title");
    if (title && SECTOR_IDS.has(key)) setHelp(title, t(`panelHelp.sectors.${messageKey(key)}`));
  });
  host.querySelectorAll(".gjs-sm-property").forEach((el) => {
    let key = /gjs-sm-property__([a-z0-9-]+)/.exec(el.className)?.[1] ?? "";
    if (key.endsWith("-sub")) key = key.slice(0, -4);
    if (STYLE_IDS.has(key)) setHelp(el, t(`panelHelp.styles.${messageKey(key)}`));
  });
}

function annotateSelectors(host: HTMLElement, t: EditorT) {
  // The only <select> in the selector manager is the state picker.
  host.querySelectorAll("select").forEach((el) => setHelp(el, t("panelHelp.selectors.states")));
  host
    .querySelectorAll(".gjs-clm-tags-btn__add")
    .forEach((el) => setHelp(el, t("panelHelp.selectors.addClass")));
  host.querySelectorAll(".gjs-clm-tag").forEach((el) => setHelp(el, t("panelHelp.selectors.tag")));
  host
    .querySelectorAll(".gjs-clm-sels-info")
    .forEach((el) => setHelp(el, t("panelHelp.selectors.selectedInfo")));
}

function annotateTraits(host: HTMLElement, t: EditorT) {
  const byLabel = new Map<string, TraitKey>(TRAIT_KEYS.map((k) => [t(`settings.${k}`).trim().toLowerCase(), k]));
  host.querySelectorAll(".gjs-trt-trait").forEach((row) => {
    const label =
      row.querySelector(".gjs-label")?.textContent?.trim().toLowerCase() ?? "";
    const key = byLabel.get(label);
    if (key) setHelp(row, t(`panelHelp.traits.${key}`));
  });
}

function annotateLayers(host: HTMLElement, t: EditorT) {
  host.querySelectorAll(".gjs-layer").forEach((el) => setHelp(el, t("panelHelp.layers.layerRow")));
  host
    .querySelectorAll(".gjs-layer-vis")
    .forEach((el) => setHelp(el, t("panelHelp.layers.visibility")));
  host.querySelectorAll(".gjs-layer-move").forEach((el) => setHelp(el, t("panelHelp.layers.move")));
  mirrorLayerIndents(host);
}

/**
 * GrapesJS indents nested rows in Layers with an inline padding-left; in a
 * right-to-left studio the indent belongs on the right, where each row starts.
 */
function mirrorLayerIndents(host: HTMLElement) {
  if (getComputedStyle(host).direction !== "rtl") return;
  host.querySelectorAll<HTMLElement>(".gjs-layer-title").forEach((el) => {
    if (!el.style.paddingLeft) return;
    el.style.paddingInlineStart = el.style.paddingLeft;
    el.style.paddingLeft = "";
  });
}

/**
 * Names and notes for the text toolbar's buttons (GrapesJS builds it the
 * first time text is edited, with English titles). The English title is kept
 * in data-nk-rte so the button is still known once its title is translated.
 */
export function annotateTextToolbar(toolbar: HTMLElement | null | undefined, t: EditorT) {
  toolbar?.querySelectorAll(".gjs-rte-action").forEach((el) => {
    const original = el.getAttribute("data-nk-rte") ?? el.getAttribute("title") ?? "";
    const key = RTE_KEYS[original];
    if (!key) return;
    el.setAttribute("data-nk-rte", original);
    const name = t(`rte.${key}`);
    if (el.getAttribute("title") !== name) el.setAttribute("title", name);
    setHelp(el, t(`panelHelp.rte.${key}`));
  });
}

/** Adds notes to GrapesJS's own picture window (double-click a picture); call when it opens or its list changes. */
export function annotateImagePicker(root: ParentNode | null | undefined, t: EditorT) {
  if (!root) return;
  root.querySelectorAll(".gjs-am-add-asset input").forEach((el) => setHelp(el, t("panelHelp.imagePicker.urlInput")));
  root.querySelectorAll(".gjs-am-add-asset button").forEach((el) => setHelp(el, t("panelHelp.imagePicker.addButton")));
  root.querySelectorAll(".gjs-am-file-uploader").forEach((el) => setHelp(el, t("panelHelp.imagePicker.upload")));
  root.querySelectorAll(".gjs-am-asset").forEach((el) => setHelp(el, t("panelHelp.imagePicker.asset")));
  root.querySelectorAll(".gjs-am-close").forEach((el) => {
    setHelp(el, t("panelHelp.imagePicker.removeAsset"));
    if (!el.getAttribute("aria-label")) el.setAttribute("aria-label", t("panelHelp.imagePicker.removeLabel"));
  });
  root.querySelectorAll(".gjs-mdl-btn-close").forEach((el) => {
    setHelp(el, t("panelHelp.imagePicker.close"));
    if (!el.getAttribute("aria-label")) el.setAttribute("aria-label", t("panelHelp.imagePicker.closeLabel"));
  });
}

export type PanelHosts = {
  styles?: HTMLElement | null;
  selectors?: HTMLElement | null;
  traits?: HTMLElement | null;
  layers?: HTMLElement | null;
};

export function annotatePanelHelp(hosts: PanelHosts, t: EditorT) {
  if (hosts.styles) annotateStyles(hosts.styles, t);
  if (hosts.selectors) annotateSelectors(hosts.selectors, t);
  if (hosts.traits) annotateTraits(hosts.traits, t);
  if (hosts.layers) annotateLayers(hosts.layers, t);
}

/**
 * GrapesJS rebuilds these panels on every selection change, wiping our
 * attributes — so watch each host and re-annotate (debounced) whenever its
 * DOM changes. setAttribute only fires attribute mutations, which we don't
 * observe, so this never loops. Returns a cleanup function.
 */
export function observePanelHelp(hosts: PanelHosts, t: EditorT): () => void {
  let timer: number | null = null;
  const run = () => {
    timer = null;
    annotatePanelHelp(hosts, t);
  };
  const schedule = () => {
    if (timer !== null) return;
    timer = window.setTimeout(run, 100);
  };
  const observers: MutationObserver[] = [];
  for (const host of [hosts.styles, hosts.selectors, hosts.traits, hosts.layers]) {
    if (!host) continue;
    const mo = new MutationObserver(schedule);
    mo.observe(host, { childList: true, subtree: true });
    observers.push(mo);
  }
  annotatePanelHelp(hosts, t);
  return () => {
    if (timer !== null) window.clearTimeout(timer);
    observers.forEach((o) => o.disconnect());
  };
}
