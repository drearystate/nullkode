import type { ReactNode } from "react";
import type { NativeNode, NativeTextRun } from "../spec";
import type { RenderContext } from "./context";
import { BEHAVIOURS_2B } from "../behaviours/index2b";
import { BEHAVIOURS_2A } from "../behaviours/index2a";

/**
 * Behaviours: what data-nk-* attributes do, the native twin of the web
 * runtime (RUNTIME_JS in NullKode's src/lib/public-page.tsx). Each handler is
 * keyed by one attribute and may hide a node, make it pressable, or (phase 2)
 * wrap it in a component with state (forms, bound lists, calendars, cart…).
 *
 * Phase 1 implements links (data-nk-href) and the signed-out view of
 * data-nk-auth / data-nk-role; the rest are registered as stubs so the
 * renderer already routes every node through the registry.
 */

type Target = Pick<NativeNode, "nk" | "href" | "to"> | NativeTextRun;

export type BehaviourResult = {
  /** Don't render the node. */
  hidden?: boolean;
  /** Make the node pressable. */
  onPress?: () => void;
};

/** More a behaviour can ask of the usual drawing (lists, boards, sortable items: behaviours/lists.tsx). */
export type RenderExtras = {
  /** React children drawn inside the box after the node's own (a spinner, a list's rows). */
  extra?: ReactNode;
  /** Touch and hold (move a card, reorder an item). */
  onLongPress?: () => void;
  /** Screen-reader actions (VoiceOver / TalkBack "actions"). */
  actions?: { name: string; label: string; run: () => void }[];
  /** Read out by screen readers ("Touch and hold to move"). */
  hint?: string;
};

/** Draws a node the usual way (without the behaviour that asks), optionally pressable. */
export type InnerRender = (node: NativeNode, press?: () => void, extras?: RenderExtras) => ReactNode;
/** Draws a text run the usual way (without the behaviour that asks), optionally pressable. */
export type InnerRunRender = (run: NativeTextRun, press?: () => void) => ReactNode;

export type Behaviour = {
  /** The data-nk-* attribute this handler is keyed by. */
  attr: string;
  /** 1: implemented natively now; 2: later (renders as compiled until then). */
  phase: 1 | 2;
  apply?: (value: string, node: Target, ctx: RenderContext) => BehaviourResult | null;
  /**
   * Draws the node with a component of its own (state, data, a native
   * widget). `inner` draws a node the usual way without this behaviour: the
   * node itself, a changed copy, or one with a press handler.
   */
  render?: (value: string, node: NativeNode, ctx: RenderContext, inner: InnerRender) => ReactNode;
  /** The same for a text run (a <span data-nk-cart-count> inside a sentence). */
  renderRun?: (value: string, run: NativeTextRun, ctx: RenderContext, inner: InnerRunRender) => ReactNode;
  /** When a node has several attributes with `render`, the highest priority draws it (default 0). */
  priority?: number;
  /**
   * `render` / `renderRun` also get nodes the compiler saw hidden (signed-in
   * content, a form's message area) and decide whether to show them.
   */
  reveals?: boolean;
};

function hasPlaceholder(v: string): boolean {
  return /\{\w+\}/.test(v);
}

/** A link on the app (/page?x=1, page, https://…) as a native navigation or an outside address. */
export function followHref(href: string, ctx: RenderContext): void {
  const base = `/app/${ctx.app.slug}`;
  let path = href;
  if (/^https?:\/\//i.test(href)) {
    if (!href.startsWith(`${ctx.app.base}/`) && href !== ctx.app.base) return ctx.openUrl(href);
    path = href.slice(ctx.app.base.length);
  }
  if (path.startsWith(base)) path = path.slice(base.length);
  const m = /^\/?([^?#]*)(\?[^#]*)?(#.*)?$/.exec(path);
  const segs = (m?.[1] ?? "").split("/").filter(Boolean).map(decodeURIComponent);
  let lang: string | undefined;
  if (segs.length && ctx.app.locales.some((l) => l.code === segs[0]) && ctx.app.locales.length > 1) lang = segs.shift();
  const page = segs[0] ?? "";
  if (segs.length <= 1 && (page === "" || ctx.app.pages.some((p) => p.slug === page))) {
    ctx.navigate({ page, ...(m?.[2] ? { query: m[2] } : {}), ...(m?.[3] ? { hash: m[3] } : {}), ...(lang ? { lang } : {}) });
    return;
  }
  ctx.openUrl(path.startsWith("/") ? `${ctx.app.origin}${path}` : `${ctx.app.base}/${path}`);
}

const REGISTRY: Behaviour[] = [
  {
    // A row's link (filled from the row by bound lists in phase 2). Static
    // values work now.
    attr: "data-nk-href",
    phase: 1,
    apply: (value, _node, ctx) => (value && !hasPlaceholder(value) ? { onPress: () => followHref(value, ctx) } : null),
  },
  {
    attr: "data-nk-auth",
    phase: 1,
    apply: (value, _node, ctx) => ({ hidden: value === "in" ? !ctx.session.signedIn : value === "out" ? ctx.session.signedIn : false }),
  },
  {
    attr: "data-nk-role",
    phase: 1,
    apply: (value, _node, ctx) => {
      const want = value.toLowerCase().split(",").map((s) => s.trim()).filter(Boolean);
      return { hidden: !ctx.session.signedIn || !want.includes((ctx.session.role ?? "").toLowerCase()) };
    },
  },
  // Phase 2: forms and flows, bound data, commerce, widgets.
  ...[
    "data-nk-form",
    "data-nk-bind-flow",
    "data-nk-field",
    "data-nk-src",
    "data-nk-field-value",
    "data-nk-filter",
    "data-nk-qs-field",
    "data-nk-user-field",
    "data-nk-logout",
    "data-nk-calendar",
    "data-nk-chart",
    "data-nk-map",
    "data-nk-cart-add",
    "data-nk-cart-list",
    "data-nk-cart-count",
    "data-nk-cart-total",
    "data-nk-cart-checkout",
    "data-nk-cart-clear",
    "data-nk-cart-remove",
    "data-nk-inline-edit",
    "data-nk-sortable",
    "data-nk-kanban",
    "data-nk-radio",
    "data-nk-qr-scanner",
    "data-nk-push-subscribe",
    "data-nk-nav-toggle",
  ].map((attr): Behaviour => ({ attr, phase: 2 })),
  // Phase 2B: cart, map, calendar, chart, QR, push, radio, languages (behaviours/index2b.ts).
  // A later entry for the same attribute replaces the stub above.
  ...BEHAVIOURS_2B,
  // Phase 2A: sign-in, forms and flows, bound data (behaviours/index2a.ts).
  ...BEHAVIOURS_2A,
];

const BY_ATTR = new Map(REGISTRY.map((b) => [b.attr, b]));

/** Registered behaviours (for diagnostics and phase 2). */
export function behaviours(): readonly Behaviour[] {
  return [...BY_ATTR.values()];
}

/** Runs every behaviour keyed by the node's data-nk-* attributes (except those in `skip`). */
export function applyBehaviours(node: Target, ctx: RenderContext, skip?: readonly string[]): BehaviourResult {
  const out: BehaviourResult = {};
  if (!node.nk) return out;
  for (const [attr, value] of Object.entries(node.nk)) {
    if (skip?.includes(attr)) continue;
    const b = BY_ATTR.get(attr);
    const r = b?.apply?.(value, node, ctx);
    if (!r) continue;
    if (r.hidden) out.hidden = true;
    if (r.onPress && !out.onPress) out.onPress = r.onPress;
  }
  return out;
}

/** The behaviour that draws this node itself (the highest priority one), if any. */
export function renderingBehaviour(node: { nk?: Record<string, string> }, kind: "render" | "renderRun", skip?: readonly string[]): { b: Behaviour; value: string } | null {
  if (!node.nk) return null;
  let best: { b: Behaviour; value: string } | null = null;
  for (const [attr, value] of Object.entries(node.nk)) {
    if (skip?.includes(attr)) continue;
    const b = BY_ATTR.get(attr);
    if (!b?.[kind]) continue;
    if (!best || (b.priority ?? 0) > (best.b.priority ?? 0)) best = { b, value };
  }
  return best;
}
