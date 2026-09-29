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
      dc.addType(id, { model: { defaults: { traits: traits as any }, initToolbar: plainToolbar } });
    }
    editor.Commands.add(MOVE_UP, { run: (ed: Editor) => moveSelected(ed, -1) });
    editor.Commands.add(MOVE_DOWN, { run: (ed: Editor) => moveSelected(ed, 1) });
    // A form only sends to its flow when it's marked as an app form.
    editor.on("component:update:attributes", (component: Component) => {
      if (String(component.get("tagName") ?? "").toLowerCase() !== "form") return;
      const attrs = component.getAttributes();
      if (attrs["data-nk-flow"] && !("data-nk-form" in attrs)) component.addAttributes({ "data-nk-form": "" });
    });
  };
}

// ─── Element toolbar ───────────────────────────────────────────────────────

const MOVE_UP = "nk:move-up";
const MOVE_DOWN = "nk:move-down";

const svgIcon = (path: string) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${path}"/></svg>`;
const ICONS = {
  parent: svgIcon("M9 4 4 9l1.41 1.41L8 7.83V14c0 3.31 2.69 6 6 6h6v-2h-6c-2.21 0-4-1.79-4-4V7.83l2.59 2.58L14 9 9 4z"),
  up: svgIcon("M7.41 15.41 12 10.83l4.59 4.58L18 14l-6-6-6 6z"),
  down: svgIcon("M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6z"),
};

type ToolbarItem = { id: string; label: string; command: string | ((ed: Editor) => unknown); attributes: Record<string, unknown> };

/**
 * Every piece's toolbar, in plain words: select the part around it, move it
 * up or down (buttons work on touch screens, where dragging doesn't), drag,
 * duplicate and delete. Replaces GrapesJS's own initToolbar, keeping its
 * rules for which buttons a piece gets.
 */
function plainToolbar(this: Component) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const self = this as any;
  const em = self.em;
  if (this.get("toolbar") || !em) return;
  const item = (id: string, label: string, title: string, command: ToolbarItem["command"], extra: Record<string, unknown> = {}): ToolbarItem => ({
    id,
    label,
    command,
    attributes: { title, "aria-label": title, role: "button", ...extra },
  });
  const tb: ToolbarItem[] = [];
  if (self.collection) {
    tb.push(item("nk-parent", ICONS.parent, "Select the part around this", (ed) => ed.runCommand("core:component-exit", { force: 1 })));
  }
  if (self.collection && this.get("draggable")) {
    tb.push(item("nk-up", ICONS.up, "Move up", MOVE_UP));
    tb.push(item("nk-down", ICONS.down, "Move down", MOVE_DOWN));
    tb.push(item("nk-drag", em.getIcon("move"), "Drag to move", "tlb-move", { class: "gjs-no-touch-actions", draggable: true }));
  }
  if (this.get("copyable")) tb.push(item("nk-copy", em.getIcon("copy"), "Duplicate", "tlb-clone"));
  if (this.get("removable")) tb.push(item("nk-delete", em.getIcon("delete"), "Delete", "tlb-delete"));
  this.set("toolbar", tb);
}

/** Parts people can see and pick (not bits of text or page markers). */
function isVisiblePart(c: Component): boolean {
  const type = String(c.get("type") ?? "");
  return c.get("layerable") !== false && type !== "textnode" && type !== "comment";
}

/**
 * Moves the selected piece past its neighbour. Uses component.move(), so
 * the move is one step in undo (Ctrl+Z).
 */
function moveSelected(editor: Editor, dir: -1 | 1) {
  const c = editor.getSelected();
  const parent = c?.parent();
  if (!c || !parent) return;
  const siblings = parent.components().models as Component[];
  let j = siblings.indexOf(c) + dir;
  while (j >= 0 && j < siblings.length && !isVisiblePart(siblings[j])) j += dir;
  if (j < 0 || j >= siblings.length) return;
  c.move(parent, { at: dir < 0 ? j : j + 1 });
  editor.select(c);
  scrollToPart(editor, c);
}

export function scrollToPart(editor: Editor, c: Component) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (editor.Canvas as any).scrollTo(c, { behavior: "smooth", block: "center", force: true });
  } catch {
    /* scrolling is a nicety */
  }
}

// ─── Tap to add ────────────────────────────────────────────────────────────

/** Block categories that make a whole part of the page, and GrapesJS's small basics listed among them. */
const WHOLE_PART_CATEGORIES = new Set(["Layout", "Sections", "Premade"]);
const SMALL_BASIC_BLOCKS = new Set(["text", "link", "image", "video", "map"]);

export function isWholePartBlock(id: string, category: string): boolean {
  return WHOLE_PART_CATEGORIES.has(category) && !SMALL_BASIC_BLOCKS.has(id);
}

function acceptsChildren(c: Component): boolean {
  const droppable = c.get("droppable");
  return droppable !== false && !c.get("void") && !c.isInstanceOf?.("text") && isVisiblePart(c);
}

/**
 * Where a tapped block goes. A whole part (a section, a premade block) goes
 * after the top-level section holding the selection: added inside the
 * selection it could land in a button or a heading. A small piece (a button,
 * a picture) goes inside the selected box, or right after the selected piece,
 * never inside a line of text. With nothing selected, the end of the page.
 */
export function placeForBlock(editor: Editor, wholePart: boolean): { parent: Component; at: number } {
  const wrapper = editor.getWrapper()!;
  const selected = editor.getSelected();
  const end = { parent: wrapper, at: wrapper.components().length };
  if (!selected || selected === wrapper) return end;
  if (wholePart) {
    let top: Component = selected;
    while (top.parent() && top.parent() !== wrapper) top = top.parent()!;
    return top.parent() === wrapper ? { parent: wrapper, at: top.index() + 1 } : end;
  }
  if (acceptsChildren(selected)) return { parent: selected, at: selected.components().length };
  let piece: Component = selected;
  while (piece.parent() && piece.parent() !== wrapper && (piece.parent()!.isInstanceOf?.("text") || !acceptsChildren(piece.parent()!))) {
    piece = piece.parent()!;
  }
  const parent = piece.parent();
  return parent ? { parent, at: piece.index() + 1 } : end;
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

/**
 * The same copy, done at once: for a tab that's closing, where waiting a
 * moment isn't possible. Passing the content in keeps GrapesJS from
 * reading it asynchronously.
 */
export function syncEditingTextNow(editor: Editor): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const view = editor.getEditing()?.getView() as any;
  if (!view?.syncContent) return;
  const el = (view.getChildrenContainer?.() ?? view.el) as HTMLElement;
  void view.syncContent({ noCount: true, content: el.innerHTML });
}

/**
 * The page's HTML including words still being typed, without touching the
 * text being edited (copying it into the page model mid-word would upset
 * phone keyboards). Used for the copy kept in the browser.
 */
export function pageHtmlNow(editor: Editor): string {
  const editing = editor.getEditing();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const view = editing?.getView() as any;
  const el = (view?.getChildrenContainer?.() ?? view?.el) as HTMLElement | undefined;
  if (!editing || !el) return editor.getHtml();
  const live = el.innerHTML;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const target = editing as any;
  const own = Object.prototype.hasOwnProperty.call(target, "getInnerHTML");
  const previous = target.getInnerHTML;
  target.getInnerHTML = () => live;
  try {
    return editor.getHtml();
  } finally {
    if (own) target.getInnerHTML = previous;
    else delete target.getInnerHTML;
  }
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
