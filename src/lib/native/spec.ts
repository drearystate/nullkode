/**
 * NullKode Native spec: the contract between the server-side compiler
 * (lib/native/compile.ts) and the NullKode Native engine (native-runtime/,
 * one Expo / React Native app for every NullKode app). The engine keeps a
 * copy of this file (native-runtime/src/spec.ts); change both together and
 * bump NATIVE_SPEC_VERSION when an engine already in people's phones could
 * misread a spec.
 *
 * A published app compiles to one NativeApp (app.json) per language and one
 * NativePage per page (pages/<slug>.json). Both are plain JSON.
 *
 * URLs in a spec are URL references resolved against `NativeApp.base + "/"`,
 * like links in a web page at the app's home address:
 *   - "https://…"   absolute (another site, fonts, CDN images)
 *   - "/uploads/a"  root-relative: a file on the app's origin (uploads, media)
 *   - "menu?id=3"   relative: one of the app's own pages ("" is the home page)
 * The server fills `origin` and `base` in when it serves app.json (from the
 * address the request came in on), so the same compiled spec works on
 * /app/<slug>, on <label>.<APPS_DOMAIN> and on custom domains.
 */

/**
 * Bumped when the meaning of an existing field changes or a node type the
 * engine must understand is added. Adding optional fields doesn't need a
 * bump. The engine refuses a spec whose version is newer than its own
 * ("Please update the app").
 */
export const NATIVE_SPEC_VERSION = 1;

/** The phone width the compiler lays pages out at (CSS px = RN points). */
export const NATIVE_DESIGN_WIDTH = 390;
/** The phone height used for vh units and fixed elements. */
export const NATIVE_DESIGN_HEIGHT = 844;

/* ── Styles ──────────────────────────────────────────────────────────── */

/** One React Native transform step (`{ translateX: 4 }`, `{ rotate: "45deg" }`). */
export type NativeTransform = Record<string, number | string>;

/**
 * A React Native style object (View, Text and Image styles). Only RN
 * properties appear here; values are numbers (points), percentages
 * ("50%"), RN keywords, resolved colours ("rgba(…)" / "#rrggbb", never CSS
 * variables), `transform` arrays, `boxShadow` and `experimental_backgroundImage`
 * strings (CSS syntax, which RN's New Architecture parses), and
 * `fontFamily` keys that name an entry of NativeApp.fonts (or a generic:
 * "serif", "monospace"; absent = the system font).
 */
export type NativeStyle = { [prop: string]: number | string | NativeTransform[] | undefined };

/* ── Nodes ───────────────────────────────────────────────────────────── */

/** Accessibility facts for a node (used by VoiceOver / TalkBack). */
export type NativeA11y = {
  /** RN accessibilityRole: "header", "link", "button", "image", "text", "checkbox", "radio", "search", "list", … */
  role?: string;
  /** Accessible name (aria-label, alt, the label of a form field). */
  label?: string;
  /** Heading level 1–6 for role "header". */
  level?: number;
  /** aria-hidden: decorative, skipped by screen readers. */
  hidden?: boolean;
  /** aria-current="page" and similar states. */
  current?: boolean;
  /** aria-expanded on toggles. */
  expanded?: boolean;
};

/** Where an internal link goes: one of the app's pages. */
export type NativeRoute = {
  /** Page slug ("" = the home page). */
  page: string;
  /** "?id=3" (with the "?"), when the link had a query string. */
  query?: string;
  /** "#reviews" (with the "#"), when the link had a fragment. */
  hash?: string;
  /** Multilingual apps: the language the link stays in. */
  lang?: string;
};

/** Fields every node may carry. */
export type NativeNodeBase = {
  /**
   * Lower-case HTML tag the node came from ("section", "a", "h2"); "::before"
   * / "::after" for pseudo-elements; tags starting with "#" are boxes the
   * compiler added (#text: loose text, #inline: a line of inline boxes,
   * #row: one row of a grid).
   */
  tag: string;
  /** The element's id attribute (anchors, data-nk-target selectors). */
  id?: string;
  /** The element's class attribute, verbatim (behaviours match selectors and toggle classes). */
  cls?: string;
  /**
   * Every data-nk-* attribute of the element, verbatim: full attribute name
   * → value (`{ "data-nk-bind-flow": "cl…", "data-nk-field": "name" }`).
   * Phase 2 behaviours are keyed by these, mirroring RUNTIME_JS.
   */
  nk?: Record<string, string>;
  /** Link target as a URL reference (see the header comment). Present on <a href> and anything inside it that the engine makes pressable. */
  href?: string;
  /** Set when `href` is one of the app's own pages: the engine navigates natively. */
  to?: NativeRoute;
  /** Link opens a new window (target=_blank): open in the browser. */
  external?: boolean;
  /** Accessibility. */
  a11y?: NativeA11y;
  /** React Native style for the node's box (and text, for text nodes). */
  style?: NativeStyle;
  /**
   * Present in the page but not shown at first: [hidden] elements, display:none
   * regions the runtime reveals (data-nk-empty, data-nk-error, signed-in-only
   * content, the other auth state). The engine skips rendering them until a
   * behaviour shows them.
   */
  hidden?: boolean;
  /**
   * Sizes that follow the screen height, in percent of it (CSS vh): the
   * engine turns them into points at render time. Keys are RN style props
   * ("minHeight", "height").
   */
  vh?: Record<string, number>;
  /** position: sticky in the source; the engine pins it when it is a direct child of the page. */
  sticky?: boolean;
  /** A CSS background image (url) on a view: drawn under the children, filling the box. */
  bgImage?: NativeBackgroundImage;
  /**
   * How the node looks in another state (see NativeVariant), by variant key:
   *   "dark"       the visitor's dark theme (html[data-theme="dark"], set by the
   *                web runtime when the signed-in visitor's theme_preference is "dark")
   *   ".playing"   a radio player ([data-nk-radio]) that plays: the class the web
   *                runtime adds to the player; on the player and everything inside it
   *   ".active"    a station pick ([data-nk-radio-pick]) that is the chosen one
   *   "!.active"   the same pick when it is not (the page had it chosen at first)
   * Only what differs from the compiled look is listed.
   */
  variants?: Record<string, NativeVariant>;
  /**
   * A <label>: the form field it belongs to (`fieldId` of an input node), by
   * for= or by wrapping it. Tapping the label focuses (or ticks) the field.
   */
  labelFor?: string;
};

/** What changes in a variant: style properties (merged over the node's), whether it shows, an SVG's drawing. */
export type NativeVariant = {
  /** Style properties of that state; null removes one (no shadow, no gradient there). */
  style?: { [prop: string]: NativeStyle[string] | null };
  /** true: not shown in this state; false: shown although the compiled page hid it. */
  hidden?: boolean;
  /** An SVG node's markup in this state (its colours). */
  xml?: string;
};

export type NativeBackgroundImage = {
  src: string;
  /** CSS background-size: "cover" | "contain" | "auto" | "<w> <h>". */
  size?: string;
  /** CSS background-position, resolved ("50% 50%"). */
  position?: string;
  /** CSS background-repeat ("no-repeat", "repeat"). */
  repeat?: string;
};

/** A box: div, section, header, a (block), li, form, … */
export type NativeViewNode = NativeNodeBase & {
  type: "view";
  children: NativeNode[];
  /** For <form>: what the web form would do (data-nk-form / data-nk-flow are in `nk`). */
  form?: { action?: string; method?: string };
  /** Horizontal scrolling row (overflow-x: auto with wider content). */
  scrollX?: boolean;
  /**
   * The box was a CSS grid. Its children are then rows the compiler made
   * (tag "#row", one per grid row, items sized by their measured share);
   * a list that adds items later flows them the same way.
   */
  grid?: { columns: number; columnGap: number; rowGap: number };
};

/** One styled piece of text inside a text node. */
export type NativeTextRun = {
  /** The text, white space already collapsed the way the browser showed it ("\n" for <br>). */
  text?: string;
  /** Text style differences from the enclosing text node (colour, weight, font, decoration…). */
  style?: NativeStyle;
  /** Inline element the run came from (span, a, em, strong, …) with its own runs (nested Text). */
  tag?: string;
  id?: string;
  cls?: string;
  nk?: Record<string, string>;
  href?: string;
  to?: NativeRoute;
  external?: boolean;
  /** Nested runs (an <em> inside an <a>). */
  runs?: NativeTextRun[];
  /** Other states' looks (see NativeNodeBase.variants). */
  variants?: Record<string, NativeVariant>;
  /** A <label> inside a line of text: the field it belongs to (NativeNodeBase.labelFor). */
  labelFor?: string;
  /** An inline box inside the text (an icon, a badge, an inline image), drawn in the line. */
  node?: NativeNode;
  hidden?: boolean;
};

/** A paragraph-like block of text: one RN <Text> with nested runs. */
export type NativeTextNode = NativeNodeBase & {
  type: "text";
  runs: NativeTextRun[];
  /** Number of lines when the source clamps text (-webkit-line-clamp / single-line ellipsis). */
  lines?: number;
};

export type NativeImageNode = NativeNodeBase & {
  type: "image";
  /** URL reference (see the header comment); the image the browser actually picked from srcset. */
  src: string;
  alt?: string;
  /** object-fit: "cover" | "contain" | "fill" | "none" | "scale-down". */
  fit?: string;
  /** object-position, resolved ("50% 50%"). */
  position?: string;
  /** Natural size of the image file, when known. */
  natural?: { width: number; height: number };
};

/** Inline SVG markup, made self-contained (computed fill/stroke/colour written onto the shapes). */
export type NativeSvgNode = NativeNodeBase & {
  type: "svg";
  xml: string;
};

export type NativeOption = {
  value: string;
  label: string;
  selected?: boolean;
  disabled?: boolean;
  group?: string;
  /** The option's data-nk-* attributes (a bound <select>'s row template: data-nk-item, data-nk-field). */
  nk?: Record<string, string>;
  /** The option has its own value attribute (otherwise a row fills it in, as on the web). */
  hasValue?: boolean;
};

/** A form field. */
export type NativeInputNode = NativeNodeBase & {
  type: "input";
  /** input type ("text", "email", "password", "number", "tel", "url", "search", "date", "time", "datetime-local", "file", "hidden", "checkbox", "radio", "range", "color"), or "textarea" / "select". */
  inputType: string;
  name?: string;
  value?: string;
  placeholder?: string;
  /** Placeholder text colour (::placeholder). */
  placeholderColor?: string;
  checked?: boolean;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  multiple?: boolean;
  min?: string;
  max?: string;
  step?: string;
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  autoComplete?: string;
  /** inputmode attribute. */
  inputMode?: string;
  /** accept attribute (file inputs). */
  accept?: string;
  /** <textarea rows>. */
  rows?: number;
  /** <select> options in order. */
  options?: NativeOption[];
  /** The <label> text of the field (for= or wrapping label). */
  label?: string;
  /** What labels point at (their `labelFor`): the element's id, or one the compiler made up. */
  fieldId?: string;
};

/** A <button> or <input type=submit|button|reset>; children are its content. */
export type NativeButtonNode = NativeNodeBase & {
  type: "button";
  buttonType: "submit" | "button" | "reset";
  name?: string;
  value?: string;
  disabled?: boolean;
  children: NativeNode[];
};

/**
 * A web island: a part of the page the engine can't draw natively yet, shown
 * in an embedded web view (canvas, iframe embeds, video/audio, subtrees with
 * their own scripts, CSS that has no native equivalent). The island document
 * is `NativePage.web.head` + `html`, with the page's address as its base, so
 * links, images, the app's styles and the NullKode runtime all work.
 */
export type NativeWebNode = NativeNodeBase & {
  type: "web";
  /** The subtree's outer HTML, wrapped in empty copies of its ancestors so the page's selectors still match. */
  html: string;
  /** Height measured in the browser at the design width (the island reports its real height once loaded). */
  height: number;
  /** Why it is an island: "canvas", "iframe", "video", "audio", "embed", "script", "css". */
  reason: string;
};

export type NativeNode =
  | NativeViewNode
  | NativeTextNode
  | NativeImageNode
  | NativeSvgNode
  | NativeInputNode
  | NativeButtonNode
  | NativeWebNode;

/* ── Pages ───────────────────────────────────────────────────────────── */

export type NativePage = {
  v: number;
  slug: string;
  /** "" when the page is the app's home. */
  title: string;
  lang: string;
  dir: "ltr" | "rtl";
  designWidth: number;
  /** The page background (body, else html). */
  background: { color: string; image?: NativeBackgroundImage; gradient?: string };
  /** The page content (the body), without the shared menu (that is NativeApp.nav). */
  root: NativeViewNode;
  /** position: fixed elements, drawn over the page relative to the screen. */
  overlays: NativeNode[];
  /**
   * What every web island of this page shares: the page's stylesheets,
   * <style> blocks and scripts (the NullKode runtime and the page's own),
   * as HTML for the island document's <head>/<body> start. Absent when the
   * page has no islands.
   */
  web?: { head: string; scripts: string; url: string };
  /** Font keys (NativeApp.fonts[].key) the page uses. */
  fonts: string[];
  /** Compiler facts for the studio and the fidelity harness. */
  stats: { nodes: number; islands: number; islandReasons: Record<string, number>; textRuns: number; images: number; ms: number };
  /** Requires a signed-in visitor (or a role); the engine asks them to sign in first. */
  requiresAuth?: boolean;
  role?: string;
  /** The page in the visitor's dark theme (NativeNodeBase.variants "dark"): its background. */
  dark?: { background: NativePage["background"] };
  /**
   * The page couldn't be compiled yet (it timed out or failed): this is its
   * web page as one island, for now. The server compiles it again in the
   * background and serves it with no-store; the engine doesn't keep it for
   * offline use and asks again a little later.
   */
  provisional?: boolean;
};

/* ── App ─────────────────────────────────────────────────────────────── */

export type NativeFont = {
  /** Key used as fontFamily in styles: "<Family>-<weight>[i]" ("Manrope-600", "Cormorant Garamond-500i"). */
  key: string;
  family: string;
  weight: number;
  style: "normal" | "italic";
  /** TTF or OTF file (React Native can't load woff/woff2). */
  url: string;
};

export type NativeNavItem = {
  label: string;
  /** The page the item opens (absent for external links and groups). */
  to?: NativeRoute;
  href?: string;
  /** data-nk-auth="in" | "out" on the item. */
  auth?: string;
  /** data-nk-role on the item ("admin" or "admin,staff"). */
  role?: string;
  /** Dropdown groups. */
  children?: NativeNavItem[];
  /** The item is the current page in the web menu (aria-current). */
  active?: boolean;
  /** Every data-nk-* attribute of the item's link and list item, verbatim. */
  nk?: Record<string, string>;
};

export type NativeNav = {
  /**
   * "tabs": bottom tabs (5 or fewer top-level items); "stack": a header with
   * a menu button listing the items; "none": the app has no shared menu
   * (its pages bring their own header).
   */
  kind: "tabs" | "stack" | "none";
  /**
   * The pages draw their own header around the menu (AI Designer pages put
   * the shared menu inside their header): the engine shows no app bar of its
   * own on top-level screens.
   */
  pageHeader?: boolean;
  brand?: { text: string; to?: NativeRoute; image?: string };
  items: NativeNavItem[];
  /** The menu's colours and fonts as the web menu shows them. */
  style?: { background: string; text: string; active: string; border?: string; fontFamily?: string; brandFontFamily?: string };
};

export type NativePageRef = {
  slug: string;
  title: string;
  isHome: boolean;
  /** Spec address, a URL reference ("nk-native/pages/<slug>.json?lang=…"). */
  spec: string;
  requiresAuth: boolean;
  role?: string;
  /** Shown in the shared menu. */
  inNav: boolean;
};

/** `name`: the language's own name ("Español"), for the language picker. */
export type NativeLocale = { code: string; dir: "ltr" | "rtl"; name?: string };

export type NativeApp = {
  v: number;
  /** Project id. */
  id: string;
  slug: string;
  name: string;
  /** Filled in when served: the origin the app was fetched from ("https://shop.example.com"). */
  origin: string;
  /** Filled in when served: the app's home address without a trailing slash (origin, or origin + "/app/<slug>"). */
  base: string;
  /** The live deployment this spec was compiled from. */
  deploymentId: string;
  /** This spec's language and direction. */
  locale: string;
  dir: "ltr" | "rtl";
  /** Multilingual apps: every published language, the default first (one spec set per language, ?lang=<code>). */
  locales: NativeLocale[];
  /** The app's theme tokens, resolved: { "nk-bg": "rgb(…)", "nk-primary": "…", "nk-radius": "4px", "nk-font": "Manrope, …" }. */
  theme: {
    mode: "light" | "dark";
    tokens: Record<string, string>;
    /**
     * The visitor's dark theme, when the app has one (light apps get a dark
     * palette): its tokens and menu colours. Used while the signed-in
     * visitor's theme_preference is "dark", as the web runtime does.
     */
    dark?: { tokens: Record<string, string>; nav?: NativeNav["style"] };
  };
  fonts: NativeFont[];
  nav: NativeNav;
  pages: NativePageRef[];
  /** The home page's slug. */
  home: string;
  /** App icon (PNG URL reference). */
  icon: string;
  splash: { background: string; foreground: string };
  /** When this spec was compiled (ISO). */
  compiledAt: string;
  /** The engine's own words in this spec's language ("menu", "retry", …); English when absent. */
  texts?: Record<string, string>;
  /**
   * The owner's own wording for permission prompts (Mobile app tab), shown
   * before the engine asks for that permission (the QR scanner's camera).
   */
  permissions?: Partial<Record<"camera" | "microphone" | "photos" | "location", string>>;
  /** Push on phones: the Expo project the operator's push credentials belong to (NK_EXPO_PROJECT_ID). */
  push?: { expoProjectId?: string };
};

/** Pages a NativeApp lists, by slug. */
export function pageRef(app: NativeApp, slug: string): NativePageRef | undefined {
  return app.pages.find((p) => p.slug === slug);
}
