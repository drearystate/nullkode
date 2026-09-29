/**
 * Plain-language setup for the GrapesJS page editor: the Design panel's
 * sections, the per-element settings ("traits"), and click-to-edit text.
 *
 * The people using the editor run small businesses; they should never have
 * to know what "flex", "padding" or a "flow ID" is to change their page.
 */
import type { Editor, Component } from "grapesjs";

// ─── Design panel ──────────────────────────────────────────────────────────

/**
 * Sector ids starting with "adv-" sit behind the Design panel's "Advanced"
 * toggle (see grapes-editor.tsx). Everything a shop owner reaches for comes
 * first, in plain words.
 */
export const STYLE_SECTORS = [
  {
    id: "text",
    name: "Text",
    open: true,
    properties: [
      { extend: "font-size", label: "Text size" },
      { extend: "font-weight", label: "Boldness" },
      { extend: "color", label: "Text color" },
      { extend: "text-align", label: "Line up" },
    ],
  },
  {
    id: "colors",
    name: "Background",
    open: true,
    properties: [{ extend: "background-color", label: "Background color" }],
  },
  {
    id: "spacing",
    name: "Spacing",
    open: false,
    properties: [
      { extend: "padding", label: "Space inside" },
      { extend: "margin", label: "Space outside" },
    ],
  },
  {
    id: "size",
    name: "Size",
    open: false,
    properties: [
      { extend: "width", label: "Width" },
      { extend: "height", label: "Height" },
    ],
  },
  {
    id: "corners",
    name: "Corners and border",
    open: false,
    properties: [
      { extend: "border-radius", label: "Round corners" },
      { extend: "border", label: "Border" },
    ],
  },
  {
    id: "adv-text",
    name: "More text options",
    open: false,
    properties: [
      { extend: "font-family", label: "Font" },
      { extend: "line-height", label: "Line spacing" },
      { extend: "letter-spacing", label: "Letter spacing" },
      { extend: "text-shadow", label: "Text shadow" },
    ],
  },
  {
    id: "adv-size",
    name: "More size options",
    open: false,
    properties: [
      { extend: "max-width", label: "Widest it can get" },
      { extend: "min-height", label: "Shortest it can get" },
    ],
  },
  {
    id: "adv-effects",
    name: "Shadow and effects",
    open: false,
    properties: [
      { extend: "box-shadow", label: "Shadow" },
      { extend: "opacity", label: "See-through" },
      { extend: "background", label: "Background picture or fade" },
      { extend: "transition", label: "Smooth changes" },
      { extend: "transform", label: "Turn and resize" },
    ],
  },
  {
    id: "adv-layout",
    name: "Placement",
    open: false,
    properties: ["display", "float", "position", "top", "right", "left", "bottom"],
  },
  {
    id: "adv-flex",
    name: "Line up items inside",
    open: false,
    properties: [
      "flex-direction",
      "flex-wrap",
      "justify-content",
      "align-items",
      "align-content",
      "order",
      "flex-basis",
      "flex-grow",
      "flex-shrink",
      "align-self",
    ],
  },
];

// ─── Element settings (traits) ─────────────────────────────────────────────

export type FlowOption = { id: string; label: string };

type TraitDef = { name?: string; label?: string; type?: string; [k: string]: unknown };

/** Plain labels for the settings GrapesJS and its plugins give elements. */
const TRAIT_LABELS: Record<string, string> = {
  title: "Hover note",
  href: "Goes to",
  target: "Open in a new tab",
  alt: "Picture description",
  src: "Address",
  name: "Answer name",
  placeholder: "Hint text",
  value: "Starting value",
  required: "Must be filled in",
  checked: "Ticked at the start",
  type: "Kind",
  text: "Button words",
  for: "Belongs to field",
};

/** Settings that only make sense to developers; the attributes stay as they are. */
const HIDDEN_TRAITS = new Set(["id", "method", "action", "data-nk-action"]);

function friendlyTrait(t: string | TraitDef, component: Component): TraitDef | null {
  const def: TraitDef = typeof t === "string" ? { name: t } : { ...t };
  const name = def.name ?? "";
  if (HIDDEN_TRAITS.has(name)) return null;
  const tag = String(component.get("tagName") ?? "").toLowerCase();
  if (name === "type" && tag === "button") return { ...def, label: "When pressed" };
  if (TRAIT_LABELS[name]) def.label = TRAIT_LABELS[name];
  return def;
}

/**
 * Wraps every component type's settings so they read in plain words, and
 * only offers "run a flow" / "show data" settings on elements where they do
 * something: forms (run a flow when sent), lists bound to data, and buttons
 * or links that were set up to run a flow.
 */
export function plainSettings(flowOptions: FlowOption[]) {
  return (editor: Editor) => {
    const dc = editor.DomComponents;
    const pick = (name: string, label: string) => ({
      type: "select",
      name,
      label,
      options: [{ id: "", label: "Nothing" }, ...flowOptions],
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const type of dc.getTypes() as any[]) {
      const id: string = type.id;
      if (id === "wrapper") continue;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const base = (type.model?.prototype as any)?.defaults?.traits;
      // GrapesJS accepts a function for traits at runtime (evaluated per
      // component), though its types only describe arrays.
      const traits = (component: Component) => {
        const own = typeof base === "function" ? base(component) : base ?? ["id", "title"];
        const out = (own as (string | TraitDef)[])
          .map((t) => friendlyTrait(t, component))
          .filter((t): t is TraitDef => !!t && t.name !== "data-nk-flow" && t.name !== "data-nk-bind-flow");
        const attrs = component.getAttributes?.() ?? {};
        const tag = String(component.get("tagName") ?? "").toLowerCase();
        if (tag === "form" || "data-nk-form" in attrs) out.push(pick("data-nk-flow", "When sent, run"));
        else if ("data-nk-flow" in attrs && (tag === "button" || tag === "a")) out.push(pick("data-nk-flow", "When pressed, run"));
        if ("data-nk-bind-flow" in attrs) out.push(pick("data-nk-bind-flow", "Show items from"));
        return out;
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      dc.addType(id, { model: { defaults: { traits: traits as any } } });
    }
    // A form only sends to its flow when it's marked as an app form.
    editor.on("component:update:attributes", (component: Component) => {
      if (String(component.get("tagName") ?? "").toLowerCase() !== "form") return;
      const attrs = component.getAttributes();
      if (attrs["data-nk-flow"] && !("data-nk-form" in attrs)) component.addAttributes({ "data-nk-form": "" });
    });
  };
}

// ─── Click to edit ─────────────────────────────────────────────────────────

/**
 * GrapesJS starts editing text on a double-click; people expect one click.
 * When a text element is picked with a click on the page, start editing it
 * straight away and put the cursor where they clicked. Dragging still works
 * from the element's toolbar and the Layers list, and non-text elements are
 * only selected, as before.
 */
export function clickToEdit(editor: Editor) {
  editor.on("component:selected", (component: Component, opts?: { event?: MouseEvent }) => {
    const ev = opts?.event;
    if (!ev || ev.type !== "click" || ev.detail > 1) return;
    if (!component?.isInstanceOf?.("text") || !component.get("editable")) return;
    // Let GrapesJS finish selecting (toolbar, panels) before editing starts.
    setTimeout(async () => {
      if (editor.getSelected() !== component) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const view = component.getView() as any;
      if (!view?.onActive || view.rteEnabled) return;
      await view.onActive();
      placeCaret(view.el as HTMLElement, ev.clientX, ev.clientY);
    }, 0);
  });
}

function placeCaret(el: HTMLElement, x: number, y: number) {
  const doc = el.ownerDocument;
  const win = doc.defaultView;
  const sel = win?.getSelection();
  if (!sel) return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = doc as any;
  let range: Range | null = null;
  if (typeof d.caretRangeFromPoint === "function") range = d.caretRangeFromPoint(x, y);
  else if (typeof d.caretPositionFromPoint === "function") {
    const pos = d.caretPositionFromPoint(x, y);
    if (pos) { range = doc.createRange(); range.setStart(pos.offsetNode, pos.offset); range.collapse(true); }
  }
  if (!range || !el.contains(range.startContainer)) {
    range = doc.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
  }
  el.focus();
  sel.removeAllRanges();
  sel.addRange(range);
}

// ─── Saving while typing ───────────────────────────────────────────────────

/**
 * Copies the words in the text element being edited into the page model
 * (what GrapesJS's own storage does before saving), keeping the cursor
 * where it was: the copy redraws the element's contents, which would
 * otherwise throw the cursor back to the start mid-sentence.
 */
export async function syncEditingText(editor: Editor): Promise<void> {
  const editing = editor.getEditing();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const view = editing?.getView() as any;
  if (!view?.syncContent) return;
  const el = view.el as HTMLElement;
  const caret = caretOffset(el);
  await view.syncContent({ noCount: true });
  if (caret !== null && editor.getEditing() === editing) setCaretOffset(el, caret);
}

function caretOffset(el: HTMLElement): number | null {
  const sel = el.ownerDocument.defaultView?.getSelection();
  if (!sel || !sel.rangeCount || !el.contains(sel.focusNode)) return null;
  const range = el.ownerDocument.createRange();
  range.setStart(el, 0);
  range.setEnd(sel.focusNode!, sel.focusOffset);
  return range.toString().length;
}

function setCaretOffset(el: HTMLElement, offset: number) {
  const doc = el.ownerDocument;
  const walker = doc.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let left = offset;
  let node = walker.nextNode() as Text | null;
  let last: Text | null = null;
  while (node) {
    if (left <= node.length) break;
    left -= node.length;
    last = node;
    node = walker.nextNode() as Text | null;
  }
  const range = doc.createRange();
  if (node) range.setStart(node, left);
  else if (last) range.setStart(last, last.length);
  else range.setStart(el, el.childNodes.length);
  range.collapse(true);
  const sel = doc.defaultView?.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
}
