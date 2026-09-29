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
 */

export const SECTOR_HELP: Record<string, string> = {
  text: "How the words look: size, boldness, color, and which way they line up.",
  colors: "The color behind this piece.",
  spacing:
    "Room inside this piece (between its edge and its content) and room outside it (between it and its neighbours).",
  size: "How wide and how tall this piece is.",
  corners: "Round the corners, or add a line around the edge.",
  "adv-text": "Fonts, line spacing, letter spacing and text shadows.",
  "adv-size": "Limits on how wide or how short this piece can get on different screens.",
  "adv-effects": "Shadows, fading, background pictures and smooth animations.",
  "adv-layout": "Where this piece sits and how it's pinned in place. Most pages never need these.",
  "adv-flex": "How the pieces inside this box line up in rows or columns.",
  general:
    "The basics: how this piece sits on the page and where it's anchored.",
  layout:
    "How this piece is placed on the page and how things line up around it.",
  dimension:
    "Sizes and spacing: how big this piece is and how much empty room it keeps around and inside itself.",
  typography:
    "Everything about the text: which letters, how big, what color, and how the words line up.",
  decorations:
    "The pretty stuff: background colors and pictures, borders, round corners, and shadows.",
  extra:
    "Extras like smooth animations and tilts.",
  flex:
    "Tools for lining up the pieces inside this box in neat rows or columns.",
  background:
    "What fills the back of this piece — a color, a fade, or a picture.",
};

export const STYLE_HELP: Record<string, string> = {
  // ── General / layout ─────────────────────────────────────
  display:
    "How this piece sits on the page. 'Block' takes a whole row by itself. 'Inline' sits next to things, like a word in a sentence. 'Flex' neatly lines up the pieces inside it. 'None' hides it completely.",
  float:
    "Pushes this piece to the left or right and lets text wrap around it — like a photo in a newspaper. 'None' keeps it in its normal spot.",
  position:
    "How this piece is anchored. 'Static' = the normal spot. 'Relative' = nudge it from its normal spot. 'Absolute' = pin it anywhere inside its box. 'Fixed' = glue it to the screen so it stays put while you scroll.",
  top: "How far this piece sits from the TOP. Only works when Position isn't 'static'.",
  right: "How far this piece sits from the RIGHT. Only works when Position isn't 'static'.",
  bottom: "How far this piece sits from the BOTTOM. Only works when Position isn't 'static'.",
  left: "How far this piece sits from the LEFT. Only works when Position isn't 'static'.",
  "z-index":
    "Which piece wins when two overlap. Bigger number = closer to you, like the top card in a pile.",
  overflow:
    "What happens when the stuff inside is too big for the box: 'hidden' cuts it off, 'scroll'/'auto' adds scrollbars, 'visible' lets it spill out.",
  cursor:
    "What the mouse arrow turns into over this piece. 'Pointer' (the little hand) tells people it's clickable.",

  // ── Dimension ────────────────────────────────────────────
  width:
    "How wide this piece is. Use 100% to fill all the space it's given, or an exact size like 300px.",
  height:
    "How tall this piece is. 'auto' means it grows just enough to fit what's inside — usually the safest choice.",
  "max-width":
    "The widest it's ever allowed to get, even on a huge screen. Great for keeping lines of text short enough to read.",
  "min-width": "The narrowest it's allowed to get, even on a tiny screen.",
  "max-height": "The tallest it's ever allowed to get. Extra content gets cut off or scrolls.",
  "min-height":
    "The shortest it's allowed to be, even when it's empty. Handy for making sections that don't collapse.",
  margin:
    "The empty space OUTSIDE this piece — it pushes the neighbors away. Bigger number = more breathing room around it.",
  "margin-top": "Empty space ABOVE this piece, pushing it down from whatever is on top.",
  "margin-right": "Empty space to the RIGHT of this piece, pushing neighbors away on that side.",
  "margin-bottom": "Empty space BELOW this piece, pushing whatever comes next further down.",
  "margin-left": "Empty space to the LEFT of this piece, pushing neighbors away on that side.",
  padding:
    "The cushion INSIDE this piece — space between its edge and its content. More padding makes buttons and cards feel roomier.",
  "padding-top": "Inside cushion at the TOP, between the edge and the content.",
  "padding-right": "Inside cushion on the RIGHT, between the edge and the content.",
  "padding-bottom": "Inside cushion at the BOTTOM, between the edge and the content.",
  "padding-left": "Inside cushion on the LEFT, between the edge and the content.",

  // ── Typography ───────────────────────────────────────────
  "font-family":
    "The letter style. Different fonts feel different — playful, serious, fancy. Pick one and the text changes right away.",
  "font-size":
    "How big the letters are. Normal reading text is around 16px; big titles are 32px or more.",
  "font-weight":
    "How thick the letters are. 400 is normal, 700 is bold. Bolder text shouts louder.",
  "letter-spacing":
    "The gap between letters. A little extra space can make titles look fancy; too much gets hard to read.",
  color: "The color of the text. Click the color box to pick any color you like.",
  "line-height":
    "The space between lines in a paragraph. Around 1.5 makes text comfy to read; 1 squishes lines together.",
  "text-align":
    "Which way the text lines up: left, center, right, or stretched to touch both edges (justify).",
  "text-decoration":
    "Extra lines on text: underline it, cross it out, or pick 'none' to remove the line links usually have.",
  "text-shadow":
    "A soft shadow behind the letters so they pop off the background. Set how far it falls, how blurry, and its color.",
  "text-shadow-h": "Slides the letter shadow left or right. Negative numbers go left.",
  "text-shadow-v": "Slides the letter shadow up or down. Negative numbers go up.",
  "text-shadow-blur": "How fuzzy the letter shadow is. 0 is sharp; bigger is softer.",
  "text-shadow-color": "The color of the letter shadow.",
  "text-transform":
    "Rewrites the text's case for you: ALL CAPS, all lowercase, or Capitalize Each Word.",
  "vertical-align":
    "Lines this piece up with the text next to it — top, middle, or bottom.",

  // ── Decorations ──────────────────────────────────────────
  opacity:
    "How see-through this piece is. 100 is solid; lower numbers fade it out like a ghost. 0 is invisible.",
  "border-radius":
    "How round the corners are. 0 = sharp corners, bigger = rounder. Go really big to turn a box into a pill or circle.",
  "border-top-left-radius": "Rounds just the TOP-LEFT corner.",
  "border-top-right-radius": "Rounds just the TOP-RIGHT corner.",
  "border-bottom-left-radius": "Rounds just the BOTTOM-LEFT corner.",
  "border-bottom-right-radius": "Rounds just the BOTTOM-RIGHT corner.",
  border:
    "The line around the edge of this piece. Set how thick it is, its style (solid, dashed, dotted), and its color.",
  "border-width": "How thick the edge line is. 0 means no line at all.",
  "border-style":
    "What the edge line looks like: solid, dashed (- - -), or dotted (• • •).",
  "border-color": "The color of the edge line.",
  "box-shadow":
    "A soft shadow behind this piece so it looks lifted off the page, like a card on a table. Set where it falls, how blurry and wide, and its color.",
  "box-shadow-h": "Slides the shadow left or right. Negative numbers go left.",
  "box-shadow-v": "Slides the shadow up or down. Negative numbers go up.",
  "box-shadow-blur": "How fuzzy the shadow is. 0 is a hard edge; bigger is softer and dreamier.",
  "box-shadow-spread": "How far the shadow grows in every direction. Bigger = a wider shadow.",
  "box-shadow-color": "The color of the shadow. Soft gray or see-through black usually looks best.",
  "box-shadow-type":
    "'Outside' puts the shadow behind the piece. 'Inside' carves it into the piece, like a dent.",
  background:
    "What fills the back of this piece — a color, a smooth fade, or a picture. You can even stack more than one.",
  "background-color": "The fill color behind this piece's content.",
  "background-image": "A picture (or color fade) used as the back of this piece.",
  "background-repeat":
    "Whether the background picture tiles over and over like bathroom tiles, or shows just once.",
  "background-position":
    "Which part of the background picture you see — slide it left/right and up/down.",
  "background-attachment":
    "'Scroll' moves the background with the page. 'Fixed' glues it in place so the page slides over it — a cool depth trick.",
  "background-size":
    "How the picture fills the space: 'cover' fills everything (may crop the edges), 'contain' shows the whole picture (may leave gaps).",

  // ── Flex ─────────────────────────────────────────────────
  "flex-direction":
    "Stack the pieces inside this box in a ROW (side by side) or a COLUMN (top to bottom). 'Reverse' flips the order.",
  "justify-content":
    "How the pieces spread out ALONG the row or column: bunched at the start, centered, or spaced apart evenly.",
  "align-items":
    "How the pieces line up ACROSS the row: top, middle, bottom, or stretched to all be the same size.",
  "align-content":
    "When the pieces wrap onto extra lines, this spreads those lines out: together, centered, or spaced apart.",
  "flex-wrap":
    "Whether pieces that don't fit hop onto the next line ('wrap') or squish together on one line ('nowrap').",
  "align-self":
    "Lets THIS one piece break from the group and line up its own way — top, middle, bottom, or stretched.",
  "flex-basis": "This piece's starting size, before it grows or shrinks to share the space.",
  "flex-grow":
    "Lets this piece grow to grab extra empty space. A piece with 2 grabs twice as much as a piece with 1. 0 means don't grow.",
  "flex-shrink":
    "Lets this piece squish when space runs out. Bigger numbers squish more. 0 means never squish.",
  order:
    "Changes this piece's place in line without moving the others. Lower numbers go first.",

  // ── Extra ────────────────────────────────────────────────
  transition:
    "Makes style changes happen smoothly instead of instantly — like a button that gently changes color when you hover on it.",
  "transition-property":
    "WHICH style should animate smoothly — like 'all', or just the color, or just the size.",
  "transition-duration":
    "How long the smooth change takes. 0.3s feels snappy; 2s feels slow and dramatic.",
  "transition-timing-function":
    "The rhythm of the change: steady all the way ('linear'), or easing in/out like a car braking gently ('ease').",
  perspective:
    "Adds 3D depth for tilted pieces. Smaller numbers = more dramatic 3D, like holding it close to your face.",
  transform:
    "Spin, tilt, grow, or shrink this piece — without moving anything around it.",
  "transform-rotate-x": "Tips the piece backward/forward, like a door falling over.",
  "transform-rotate-y": "Turns the piece sideways, like a spinning door.",
  "transform-rotate-z": "Spins the piece flat, like a clock hand. 180 turns it upside-down.",
  "transform-scale-x": "Stretches or squishes the piece SIDEWAYS. 1 is normal, 2 is twice as wide.",
  "transform-scale-y": "Stretches or squishes the piece UP AND DOWN. 1 is normal, 2 is twice as tall.",
  "transform-scale-z": "Scales the piece in 3D depth — you'll only notice it with rotated pieces.",
};

export const SELECTOR_HELP = {
  states:
    "Style a special moment. Pick 'hover' and your changes only show while the mouse is over the piece; 'click' while it's pressed. Pick '- State -' to go back to normal styling.",
  addClass:
    "Give this piece a shared style name. Every piece with the same name shares the same look, so changing one changes them all.",
  tag:
    "A shared style name this piece uses. Changes apply to every piece with this name. Click the x to remove it from this piece.",
  selectedInfo:
    "Exactly what you're styling right now, so there are no surprises about what changes.",
} as const;

export const TRAIT_HELP: Record<string, string> = {
  "hover note":
    "A short note that pops up when someone rests their mouse on this piece.",
  "goes to":
    "Where this link takes people. Use /page-name for your own pages, or a full https:// address for other sites.",
  "open in a new tab":
    "Tick this to open the link in a new tab, so your app stays open too.",
  "picture description":
    "Words that describe the picture for people who can't see it, and for search engines. Say what's in the picture.",
  address: "The web address of the picture or video shown here.",
  "answer name":
    "The name your app saves this answer under, like 'email'. Keep it short and simple.",
  "hint text":
    "The grey hint shown inside the box while it's empty, like 'Type your name'. It disappears when someone starts typing.",
  "starting value": "What's already filled in when the page first opens.",
  "must be filled in":
    "Turn this on and the form won't send until this box is filled in.",
  kind:
    "What kind of box this is: text, email, password (hides the letters), number and more. The right kind helps phones show the right keyboard.",
  "ticked at the start": "Whether this box starts already ticked when the page opens.",
  "button words": "The words shown on this button.",
  "when pressed":
    "What this button does: send the form it's in, clear the form, or nothing (for buttons that do something else).",
  "when sent, run":
    "Pick what your app does with the answers when this form is sent, like saving them or sending an email. You'll find these under Flows.",
  "when pressed, run": "Pick what your app does when this button is pressed. You'll find these under Flows.",
  "belongs to field":
    "Which box on the form this label describes. Clicking the label then puts the cursor in that box.",
  "show items from":
    "Pick where this list gets its items from, like your bookings or products. It updates by itself.",
};

export const LAYER_HELP = {
  visibility:
    "Click the eye to hide this piece while you work — it's still there, just sleeping. Click again to wake it up.",
  move: "Grab here and drag to move this piece somewhere else on the page.",
  layerRow:
    "One piece of your page. Click to select it; the arrow opens what's nested inside it.",
} as const;

/** Block groups in the Blocks tab, keyed by the group's name. */
export const BLOCK_CATEGORY_HELP: Record<string, string> = {
  Basic: "Simple building pieces. Click the name to show or hide them.",
  Layout: "Boxes and columns that hold other pieces, plus basics like text and pictures. Click the name to show or hide them.",
  Sections: "Whole ready-made parts of a page, like an intro, prices or a footer. Click the name to show or hide them.",
  Content: "Headings, paragraphs, lists and notes. Click the name to show or hide them.",
  Media: "Pictures, videos, sound and maps. Click the name to show or hide them.",
  Interactive: "Buttons, cards, tabs, pop-ups and other pieces people click. Click the name to show or hide them.",
  Forms: "Boxes people fill in, like contact and sign-up forms. Click the name to show or hide them.",
  Commerce: "Pieces for selling, like product cards and prices. Click the name to show or hide them.",
  Social: "Links to your social media, share buttons, and content from other websites. Click the name to show or hide them.",
  "Live data":
    "Pieces that work with your app's information: forms that save, lists that fill themselves, sign-in areas. Click the name to show or hide them.",
  Premade: "Designed sections you can drop in and then change. Click the name to show or hide them.",
};

/** What a block adds, for blocks whose name doesn't say it all (keyed by the block's label). */
export const BLOCK_HELP: Record<string, string> = {
  Section: "A full-width band of the page with its own heading.",
  Container: "A box that keeps what's inside at a comfortable width in the middle of the page.",
  "Auto Grid": "Boxes that sit side by side and wrap onto new rows by themselves on smaller screens.",
  Spacer: "Empty space, to push things apart.",
  Divider: "A thin line to separate parts of the page.",
  "Lead text": "A slightly bigger paragraph, good for an introduction.",
  Badge: "A small colored label, like “New” or “Sale”.",
  "Icon chip": "An icon in a small colored circle.",
  Accordion: "Questions or headings that open when clicked to show more.",
  Tabs: "Several panels of content, one shown at a time, switched with tabs.",
  Carousel: "Pictures or slides that take turns.",
  "Pop-up": "A button that opens a small window on top of the page.",
  "Embed (iframe)": "Shows content from another website inside your page, like a booking or payment widget.",
  "Form that runs a flow": "A form whose answers your app acts on, like saving them or emailing you. Pick what it does in Settings.",
  "List of items": "A list that fills itself with your app's information, like products or bookings. Pick what it shows in Settings.",
  "Table of items": "A table that fills itself with your app's information. Pick what it shows in Settings.",
  "Grid of items": "Cards that fill themselves with your app's information. Pick what they show in Settings.",
  "Members-only area": "A box only signed-in people can see.",
  "User menu": "An Account menu for signed-in people, with links like Profile and Settings.",
  "Sign out button": "A button that signs the person out of your app.",
  "Button that runs a flow": "A button that makes your app do something when pressed. Pick what in Settings.",
  "Marquee text": "Words that scroll across the screen.",
};

/** The text toolbar that appears while you edit words, keyed by button title. */
export const RTE_HELP: Record<string, string> = {
  Bold: "Make the highlighted words bold. Click again to undo it.",
  Italic: "Make the highlighted words slanted (italic). Click again to undo it.",
  Underline: "Underline the highlighted words. Click again to remove the line.",
  "Strike-through": "Cross out the highlighted words with a line. Click again to remove it.",
  Link: "Turn the highlighted words into a link, or remove the link. Then set where it goes in the Settings tab.",
  "Wrap for style":
    "Wrap the highlighted words in their own piece, so you can give just those words a different color or size in the Design tab.",
};

function setHelp(el: Element, text: string) {
  if (el.getAttribute("data-help") !== text) el.setAttribute("data-help", text);
}

function annotateStyles(host: HTMLElement) {
  host.querySelectorAll(".gjs-sm-sector").forEach((sector) => {
    const key = /gjs-sm-sector__([a-z0-9-]+)/.exec(sector.className)?.[1] ?? "";
    const title = sector.querySelector(".gjs-sm-sector-title");
    const help = SECTOR_HELP[key];
    if (title && help) setHelp(title, help);
  });
  host.querySelectorAll(".gjs-sm-property").forEach((el) => {
    let key = /gjs-sm-property__([a-z0-9-]+)/.exec(el.className)?.[1] ?? "";
    if (key.endsWith("-sub")) key = key.slice(0, -4);
    let help = STYLE_HELP[key];
    if (!help) {
      // Fall back to the visible label ("Font size" → "font-size").
      const label =
        el.querySelector(".gjs-sm-label")?.textContent?.trim().toLowerCase().replace(/\s+/g, "-") ?? "";
      help = STYLE_HELP[label];
    }
    if (help) setHelp(el, help);
  });
}

function annotateSelectors(host: HTMLElement) {
  // The only <select> in the selector manager is the state picker.
  host.querySelectorAll("select").forEach((el) => setHelp(el, SELECTOR_HELP.states));
  host
    .querySelectorAll(".gjs-clm-tags-btn__add")
    .forEach((el) => setHelp(el, SELECTOR_HELP.addClass));
  host.querySelectorAll(".gjs-clm-tag").forEach((el) => setHelp(el, SELECTOR_HELP.tag));
  host
    .querySelectorAll(".gjs-clm-sels-info")
    .forEach((el) => setHelp(el, SELECTOR_HELP.selectedInfo));
}

function annotateTraits(host: HTMLElement) {
  host.querySelectorAll(".gjs-trt-trait").forEach((row) => {
    const label =
      row.querySelector(".gjs-label")?.textContent?.trim().toLowerCase() ?? "";
    const help = TRAIT_HELP[label];
    if (help) setHelp(row, help);
  });
}

function annotateLayers(host: HTMLElement) {
  host.querySelectorAll(".gjs-layer").forEach((el) => setHelp(el, LAYER_HELP.layerRow));
  host
    .querySelectorAll(".gjs-layer-vis")
    .forEach((el) => setHelp(el, LAYER_HELP.visibility));
  host.querySelectorAll(".gjs-layer-move").forEach((el) => setHelp(el, LAYER_HELP.move));
}

/** Adds notes to the text toolbar's buttons (GrapesJS builds it the first time text is edited). */
export function annotateTextToolbar(toolbar: HTMLElement | null | undefined) {
  toolbar?.querySelectorAll(".gjs-rte-action").forEach((el) => {
    const help = RTE_HELP[el.getAttribute("title") ?? ""];
    if (help) setHelp(el, help);
  });
}

/** GrapesJS's own picture window (double-click a picture on the page). */
export const IMAGE_PICKER_HELP = {
  urlInput:
    "Paste the web address of a picture that's already online, then press Add image to put it in the list below.",
  addButton: "Add the picture from the web address you typed to the list below. Then click it to use it.",
  upload:
    "Choose a picture from your computer or phone, or drop one here. It's saved inside your page and added to the list below.",
  asset: "Click to use this picture on your page. Double-click to use it and close this window.",
  removeAsset: "Take this picture off the list. Pictures already on your page stay there.",
  close: "Close this window. Any picture you already clicked stays on your page.",
} as const;

/** Adds notes to the picture window; call when it opens or its list changes. */
export function annotateImagePicker(root: ParentNode | null | undefined) {
  if (!root) return;
  root.querySelectorAll(".gjs-am-add-asset input").forEach((el) => setHelp(el, IMAGE_PICKER_HELP.urlInput));
  root.querySelectorAll(".gjs-am-add-asset button").forEach((el) => setHelp(el, IMAGE_PICKER_HELP.addButton));
  root.querySelectorAll(".gjs-am-file-uploader").forEach((el) => setHelp(el, IMAGE_PICKER_HELP.upload));
  root.querySelectorAll(".gjs-am-asset").forEach((el) => setHelp(el, IMAGE_PICKER_HELP.asset));
  root.querySelectorAll(".gjs-am-close").forEach((el) => {
    setHelp(el, IMAGE_PICKER_HELP.removeAsset);
    if (!el.getAttribute("aria-label")) el.setAttribute("aria-label", "Remove from list");
  });
  root.querySelectorAll(".gjs-mdl-btn-close").forEach((el) => {
    setHelp(el, IMAGE_PICKER_HELP.close);
    if (!el.getAttribute("aria-label")) el.setAttribute("aria-label", "Close");
  });
}

export type PanelHosts = {
  styles?: HTMLElement | null;
  selectors?: HTMLElement | null;
  traits?: HTMLElement | null;
  layers?: HTMLElement | null;
};

export function annotatePanelHelp(hosts: PanelHosts) {
  if (hosts.styles) annotateStyles(hosts.styles);
  if (hosts.selectors) annotateSelectors(hosts.selectors);
  if (hosts.traits) annotateTraits(hosts.traits);
  if (hosts.layers) annotateLayers(hosts.layers);
}

/**
 * GrapesJS rebuilds these panels on every selection change, wiping our
 * attributes — so watch each host and re-annotate (debounced) whenever its
 * DOM changes. setAttribute only fires attribute mutations, which we don't
 * observe, so this never loops. Returns a cleanup function.
 */
export function observePanelHelp(hosts: PanelHosts): () => void {
  let timer: number | null = null;
  const run = () => {
    timer = null;
    annotatePanelHelp(hosts);
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
  annotatePanelHelp(hosts);
  return () => {
    if (timer !== null) window.clearTimeout(timer);
    observers.forEach((o) => o.disconnect());
  };
}
