import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { Platform, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import type { NativeApp, NativeNode, NativeTextRun } from "../spec";
import type { Behaviour } from "../render/behaviours";
import { followHref } from "../render/behaviours";
import type { RenderContext } from "../render/context";
import { addFormExtra, onFormSuccess } from "./bus";
import { Store, themeOf, tr, uiFont, withText } from "./kit";
import { fillNode, findTemplate } from "./rows";

/**
 * The cart, the native twin of the web runtime's (RUNTIME_JS "8. Cart"):
 * the same items ({ product_id, name, price, image_url, quantity }) under the
 * same key ("nk-cart-<host>") in the phone's storage (AsyncStorage; in the
 * browser preview that is localStorage, so the preview and the web app on
 * the same address share one cart, as two web pages do).
 *
 *   data-nk-cart-add      adds data-nk-id / -name / -price / -image / -qty, says "Added" for a moment
 *   data-nk-cart-count    the number of items        data-nk-cart-total  the total (2 decimals)
 *   data-nk-cart-list     one row per item from its template (data-nk-item), the empty state otherwise
 *   data-nk-cart-remove   removes the item with that product id (or name)
 *   data-nk-cart-clear    empties the cart
 *   data-nk-cart-checkout a form that also sends items (JSON) and total; a flow answering
 *                         { clearCart: true } empties the cart; a flow answering
 *                         { redirect: "https://checkout.stripe.com/…" } opens the payment
 *                         page in the phone's browser (openFlowRedirect) and comes back.
 */

export type CartItem = { product_id?: string; name?: string; price?: string | number; image_url?: string; quantity?: number | string; [k: string]: unknown };

type Cart = { store: Store<CartItem[]>; ready: Promise<void>; key: string };
const carts = new Map<string, Cart>();

function hostOf(app: Pick<NativeApp, "base" | "origin">): string {
  const m = /^[a-z][a-z0-9+.-]*:\/\/([^/:?#]+)/i.exec(app.base || app.origin || "");
  return m ? m[1].toLowerCase() : "app";
}

function cartOf(app: Pick<NativeApp, "base" | "origin">): Cart {
  const key = `nk-cart-${hostOf(app)}`;
  let c = carts.get(key);
  if (!c) {
    const store = new Store<CartItem[]>([]);
    const ready = AsyncStorage.getItem(key)
      .then((raw) => {
        try {
          const items = JSON.parse(raw || "[]");
          if (Array.isArray(items)) store.set(items);
        } catch {
          /* a broken cart starts empty, like on the web */
        }
      })
      .catch(() => {});
    c = { store, ready, key };
    carts.set(key, c);
  }
  return c;
}

async function write(app: Pick<NativeApp, "base" | "origin">, items: CartItem[]): Promise<void> {
  const c = cartOf(app);
  c.store.set(items);
  await AsyncStorage.setItem(c.key, JSON.stringify(items)).catch(() => {});
}

const keyOf = (i: CartItem) => String(i.product_id || i.name || "");
const qty = (v: unknown) => parseInt(String(v ?? ""), 10) || 1;

export async function cartRead(app: Pick<NativeApp, "base" | "origin">): Promise<CartItem[]> {
  const c = cartOf(app);
  await c.ready;
  return c.store.get();
}

export async function cartAdd(app: Pick<NativeApp, "base" | "origin">, item: CartItem): Promise<void> {
  const items = (await cartRead(app)).map((i) => ({ ...i }));
  const key = keyOf(item);
  const existing = items.find((i) => keyOf(i) === key);
  if (existing) existing.quantity = qty(existing.quantity) + qty(item.quantity);
  else items.push({ quantity: qty(item.quantity), ...item });
  await write(app, items);
}

export async function cartRemove(app: Pick<NativeApp, "base" | "origin">, key: string): Promise<void> {
  await write(app, (await cartRead(app)).filter((i) => keyOf(i) !== key));
}

export async function cartClear(app: Pick<NativeApp, "base" | "origin">): Promise<void> {
  await cartRead(app);
  await write(app, []);
}

export function cartTotal(items: CartItem[]): number {
  return items.reduce((s, i) => s + (parseFloat(String(i.price ?? "")) || 0) * qty(i.quantity), 0);
}

export function cartCount(items: CartItem[]): number {
  return items.reduce((s, i) => s + qty(i.quantity), 0);
}

/** The cart's items, kept current on every screen. */
export function useCart(app: Pick<NativeApp, "base" | "origin">): CartItem[] {
  const c = cartOf(app);
  return useSyncExternalStore(c.store.subscribe, c.store.get, c.store.get);
}

/* ── Checkout ──────────────────────────────────────────────────────────── */

addFormExtra((form, ctx) => {
  if (!form.nk || !("data-nk-cart-checkout" in form.nk)) return null;
  const items = cartOf(ctx.app).store.get();
  return { items: JSON.stringify(items), total: cartTotal(items).toFixed(2) };
});

onFormSuccess((_form, body, ctx) => {
  if (body && typeof body === "object" && (body as { clearCart?: unknown }).clearCart) void cartClear(ctx.app);
});

/**
 * A flow's redirect to another site (a Stripe Checkout page): opened in the
 * phone's browser as an auth session that returns to the app through its
 * own address (the app's URL scheme, or exp:// in Expo Go). When the payment
 * page sends the visitor to one of the app's own pages (success_url), the app
 * opens that page. Returns once the browser is closed.
 */
export async function openFlowRedirect(url: string, ctx: Pick<RenderContext, "app" | "navigate" | "openUrl">): Promise<void> {
  if (Platform.OS === "web") {
    // Browser preview: the payment page in a new tab.
    await WebBrowser.openBrowserAsync(url).catch(() => {});
    return;
  }
  const back = Linking.createURL("nk-return");
  try {
    const r = await WebBrowser.openAuthSessionAsync(url, back);
    if (r.type !== "success" || !r.url) return;
    // nk-return?to=<path> or the app's own https address.
    const to = Linking.parse(r.url).queryParams?.to;
    const target = typeof to === "string" ? to : r.url;
    if (target.startsWith(ctx.app.base) || target.startsWith("/")) followHref(target, ctx as RenderContext);
  } catch {
    await WebBrowser.openBrowserAsync(url).catch(() => {});
  }
}

/* ── Components ────────────────────────────────────────────────────────── */

function itemFrom(nk: Record<string, string> | undefined): CartItem {
  const a = (k: string) => {
    const v = nk?.[`data-nk-${k}`];
    return v && !/^\{\w+\}$/.test(v) ? v : "";
  };
  return { product_id: a("id"), name: a("name"), price: a("price") || "0", image_url: a("image"), quantity: qty(a("qty") || "1") };
}

function CartAdd({ node, ctx, inner }: { node: NativeNode; ctx: RenderContext; inner: (n: NativeNode, press?: () => void) => ReactNode }) {
  const [added, setAdded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  const press = () => {
    if (added) return;
    void cartAdd(ctx.app, itemFrom(node.nk));
    setAdded(true);
    timer.current = setTimeout(() => setAdded(false), 900);
  };
  const shown = added ? ({ ...withText(node, tr(ctx.app, "cartAdded", "✓ Added")), ...(node.type === "button" ? { disabled: true } : {}) } as NativeNode) : node;
  return <>{inner(shown, press)}</>;
}

function CartFigure({ kind, app, draw }: { kind: "count" | "total"; app: NativeApp; draw: (text: string) => ReactNode }) {
  const items = useCart(app);
  return <>{draw(kind === "count" ? String(cartCount(items)) : cartTotal(items).toFixed(2))}</>;
}

function CartList({ node, ctx, inner }: { node: NativeNode; ctx: RenderContext; inner: (n: NativeNode, press?: () => void) => ReactNode }) {
  const items = useCart(ctx.app);
  const kids = "children" in node && Array.isArray(node.children) ? node.children : [];
  // The compiler keeps the row template (data-nk-item, hidden) next to the empty state it drew.
  const template = kids.find((c) => c.nk && "data-nk-item" in c.nk) ?? null;
  const empty = kids.filter((c) => c !== template);
  if (!items.length) return <>{inner({ ...node, children: empty.length ? empty : [emptyText(ctx)] } as NativeNode)}</>;
  // Without one (a spec from an older compiler), a template-looking first child, else a plain list.
  const item = template ?? findTemplate({ ...node, children: empty } as NativeNode)?.item ?? null;
  if (!item || (!template && !item.nk)) return <PlainCart ctx={ctx} items={items} />;
  const rows = items.map((row) => fillNode({ ...item, hidden: false } as NativeNode, row as Record<string, unknown>, ctx.app));
  return <>{inner({ ...node, children: rows } as NativeNode)}</>;
}

function emptyText(ctx: RenderContext): NativeNode {
  const th = themeOf(ctx.app);
  return { type: "text", tag: "#text", runs: [{ text: tr(ctx.app, "cartEmpty", "Your cart is empty.") }], style: { color: th.muted, fontSize: 14, padding: 16 } };
}

/** A cart list without a row template (the compiler didn't keep one): name, quantity and price. */
function PlainCart({ ctx, items }: { ctx: RenderContext; items: CartItem[] }) {
  const th = themeOf(ctx.app);
  const font = uiFont(ctx);
  return (
    <View style={{ gap: 8 }}>
      {items.map((i, n) => (
        <View key={n} style={{ flexDirection: "row", justifyContent: "space-between", padding: 12, borderWidth: 1, borderColor: th.border, borderRadius: th.radius, backgroundColor: th.surface }}>
          <Text style={{ color: th.text, ...font }}>
            {i.name} × {qty(i.quantity)}
          </Text>
          <Text style={{ color: th.text, ...font }}>{(parseFloat(String(i.price ?? "")) || 0).toFixed(2)}</Text>
        </View>
      ))}
    </View>
  );
}

const placeholder = (v: string) => /\{\w+\}/.test(v);

export const CART_BEHAVIOURS: Behaviour[] = [
  {
    attr: "data-nk-cart-add",
    phase: 2,
    render: (_v, node, ctx, inner) => <CartAdd node={node} ctx={ctx} inner={inner} />,
  },
  {
    attr: "data-nk-cart-count",
    phase: 2,
    render: (_v, node, ctx, inner) => <CartFigure kind="count" app={ctx.app} draw={(t) => inner(withText(node, t))} />,
    renderRun: (_v, run, ctx, inner) => <CartFigure kind="count" app={ctx.app} draw={(t) => inner({ ...run, text: t, runs: undefined } as NativeTextRun)} />,
  },
  {
    attr: "data-nk-cart-total",
    phase: 2,
    render: (_v, node, ctx, inner) => <CartFigure kind="total" app={ctx.app} draw={(t) => inner(withText(node, t))} />,
    renderRun: (_v, run, ctx, inner) => <CartFigure kind="total" app={ctx.app} draw={(t) => inner({ ...run, text: t, runs: undefined } as NativeTextRun)} />,
  },
  {
    attr: "data-nk-cart-list",
    phase: 2,
    priority: 5,
    render: (_v, node, ctx, inner) => <CartList node={node} ctx={ctx} inner={inner} />,
  },
  {
    attr: "data-nk-cart-remove",
    phase: 2,
    apply: (value, _node, ctx) => (placeholder(value) ? null : { onPress: () => void cartRemove(ctx.app, value) }),
  },
  {
    attr: "data-nk-cart-clear",
    phase: 2,
    apply: (_value, _node, ctx) => ({ onPress: () => void cartClear(ctx.app) }),
  },
  // The form itself is sent by the forms behaviour; the cart adds its fields (addFormExtra above).
  { attr: "data-nk-cart-checkout", phase: 2 },
];
