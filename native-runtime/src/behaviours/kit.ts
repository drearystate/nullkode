import { Platform } from "react-native";
import type { NativeApp, NativeNode, NativeTextRun } from "../spec";
import type { RenderContext } from "../render/context";
import { runFlow as netRunFlow, type FlowResult } from "./net";

/**
 * Small helpers shared by the phase 2B behaviours (cart, calendar, chart,
 * map, QR, push, radio, languages). Mirrors pieces of the web runtime
 * (RUNTIME_JS in NullKode's src/lib/public-page.tsx): its texts (nkT), date
 * and number formats (nkFormat), row templates (applyRowToElement) and flow
 * calls (fetch('/api/run/<flow>')).
 */

/* ── Texts ─────────────────────────────────────────────────────────────── */

/**
 * One of the runtime's visitor texts in the app's language (NativeApp.texts,
 * from messages/<locale>/runtime.json), English otherwise; {name}
 * placeholders filled. Same keys as the web runtime's nkT.
 */
export function tr(app: Pick<NativeApp, "texts"> | null | undefined, key: string, en: string, vars?: Record<string, string | number>): string {
  let t = app?.texts?.[key] ?? en;
  if (vars) t = t.replace(/\{(\w+)\}/g, (m, k: string) => (Object.prototype.hasOwnProperty.call(vars, k) ? String(vars[k]) : m));
  return t;
}

/** The language dates and numbers are written in (the web runtime's nkIntl: the app's, or the device's for English apps). */
export function intlLocale(app: Pick<NativeApp, "locale">): string | undefined {
  return app.locale && app.locale !== "en" ? app.locale : undefined;
}

/* ── Theme ─────────────────────────────────────────────────────────────── */

export type Theme = {
  primary: string;
  accent: string;
  text: string;
  muted: string;
  surface: string;
  border: string;
  bg: string;
  danger: string;
  success: string;
  radius: number;
};

/**
 * Whether the visitor's dark theme is in force (App sets it from the session:
 * signed in with theme_preference "dark", and the app has a dark palette).
 */
let darkNow = false;
export function setDarkTheme(on: boolean): void {
  darkNow = on;
}
export function darkThemeOn(app?: Pick<NativeApp, "theme"> | null): boolean {
  return darkNow && Boolean(app?.theme?.dark);
}

/** The app's --nk-* colours, resolved by the compiler (NativeApp.theme.tokens; the dark palette's in the visitor's dark theme). */
export function themeOf(app: NativeApp): Theme {
  const visitorDark = darkThemeOn(app);
  const t = visitorDark ? { ...(app.theme?.tokens ?? {}), ...(app.theme.dark?.tokens ?? {}) } : (app.theme?.tokens ?? {});
  const dark = visitorDark || app.theme?.mode === "dark";
  const radius = parseFloat(t["nk-radius"] ?? "") || 12;
  return {
    primary: t["nk-primary"] || "#4f46e5",
    accent: t["nk-accent"] || t["nk-primary"] || "#06b6d4",
    text: t["nk-text"] || (visitorDark ? "" : app.splash?.foreground) || (dark ? "#f3f4f6" : "#111827"),
    muted: t["nk-text-muted"] || (dark ? "#9ca3af" : "#6b7280"),
    surface: t["nk-surface"] || (dark ? "#1f2937" : "#ffffff"),
    border: t["nk-border"] || (dark ? "rgba(255,255,255,0.15)" : "#e5e7eb"),
    bg: t["nk-bg"] || (visitorDark ? "" : app.splash?.background) || (dark ? "#111827" : "#ffffff"),
    danger: t["nk-danger"] || "#dc2626",
    success: t["nk-success"] || "#16a34a",
    radius: Math.min(24, radius),
  };
}

const ARABIC_SCRIPT = new Set(["ar", "fa", "ur"]);

/**
 * A font key for the engine's own UI (calendar, scanner texts…): the app's
 * menu font, or for Arabic-script apps the Arabic font the compiler added
 * (lib/native/fonts.ts), nearest weight.
 */
export function uiFont(ctx: Pick<RenderContext, "app" | "fonts">, weight = 400): { fontFamily?: string; fontWeight?: "normal" | "bold" } {
  const { app, fonts } = ctx;
  const pick = (family: (f: { family: string }) => boolean) => {
    let best: { key: string; weight: number } | null = null;
    for (const f of fonts.values()) {
      if (!family(f) || f.style !== "normal") continue;
      if (!best || Math.abs(f.weight - weight) < Math.abs(best.weight - weight)) best = { key: f.key, weight: f.weight };
    }
    return best;
  };
  const base = (app.locale ?? "").split("-")[0];
  const arabic = ARABIC_SCRIPT.has(base) ? pick((f) => /arabic|naskh|nastaliq/i.test(f.family)) : null;
  const navKey = app.nav?.style?.fontFamily;
  const nav = navKey && fonts.get(navKey) ? fonts.get(navKey)! : null;
  const chosen = arabic ?? (nav ? pick((f) => f.family === nav.family) : null);
  if (!chosen) return weight >= 600 ? { fontWeight: "bold" } : {};
  const f = fonts.get(chosen.key)!;
  return {
    fontFamily: Platform.OS === "web" ? `"${f.family}"` : f.key,
    ...(Platform.OS === "web" ? { fontWeight: String(f.weight) as never } : {}),
  };
}

/* ── Flows ─────────────────────────────────────────────────────────────── */

export type { FlowResult } from "./net";

/**
 * Runs one of the app's flows with the visitor's session and language
 * (net.ts runFlow, the web runtime's fetch('/api/run/<flow>')). Never throws.
 */
export function runFlow(ctx: { app: NativeApp; page?: { slug: string } | null }, flowId: string, body: unknown = {}): Promise<FlowResult> {
  return netRunFlow(ctx, flowId, body);
}

/** Rows from a flow's answer: a list, { rows: [...] }, or { body: [...] } (charts). */
export function rowsOf(data: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(data)) return data as Array<Record<string, unknown>>;
  const d = data as { rows?: unknown; body?: unknown } | null;
  if (d && Array.isArray(d.rows)) return d.rows as Array<Record<string, unknown>>;
  if (d && Array.isArray(d.body)) return d.body as Array<Record<string, unknown>>;
  return [];
}

/** The flow a widget reads: data-nk-bind-flow, data-nk-flow, or their -ref (a flow's short name; /api/run accepts it). */
export function flowOf(nk: Record<string, string> | undefined, ...names: string[]): string | null {
  if (!nk) return null;
  for (const n of [...names, "data-nk-bind-flow", "data-nk-flow"]) {
    const v = nk[n] || nk[`${n}-ref`];
    if (v && !/\{\w+\}/.test(v)) return v;
  }
  return null;
}

/* ── Values ────────────────────────────────────────────────────────────── */

/** data-nk-format="date|datetime|time|number|money", like the web runtime's nkFormat. */
export function formatValue(val: unknown, fmt: string | undefined, app: Pick<NativeApp, "locale">): string {
  if (val == null) return "";
  const loc = intlLocale(app);
  try {
    if (fmt === "date" || fmt === "datetime" || fmt === "time") {
      const d = new Date(val as string);
      if (isNaN(d.getTime())) return String(val);
      if (fmt === "date") return d.toLocaleDateString(loc, { dateStyle: "medium" });
      if (fmt === "time") return d.toLocaleTimeString(loc, { timeStyle: "short" });
      return d.toLocaleString(loc, { dateStyle: "medium", timeStyle: "short" });
    }
    if (fmt === "number" || fmt === "money") {
      const n = Number(val);
      if (!isFinite(n)) return String(val);
      return fmt === "money" ? n.toLocaleString(loc, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : n.toLocaleString(loc);
    }
  } catch {
    /* plain text below */
  }
  return typeof val === "object" ? JSON.stringify(val) : String(val);
}

/** Like the web runtime's nkSafeUrl: no script or inline-document links from data. */
export function safeUrl(v: unknown, forSrc = false): string {
  const s = String(v ?? "").trim();
  const bare = s.replace(/[\u0000- ]/g, "").toLowerCase();
  if (forSrc && /^data:image\/(png|jpe?g|gif|webp|avif|svg\+xml)[;,]/.test(bare)) return s;
  if (/^(javascript|vbscript|data|blob|file):/.test(bare)) return "#";
  return s;
}

/** {field} placeholders filled from the row when it has that field (nkFillKnown). */
export function fillKnown(str: string, row: Record<string, unknown>): string {
  return str.replace(/\{(\w+)\}/g, (m, k: string) => (Object.prototype.hasOwnProperty.call(row, k) ? (row[k] == null ? "" : String(row[k])) : m));
}

/** {field} placeholders filled from the row, missing ones empty (tpl). */
export function fillAll(str: string, row: Record<string, unknown>): string {
  return str.replace(/\{(\w+)\}/g, (_m, k: string) => (row[k] == null ? "" : String(row[k])));
}

/** All the text of a node, as plain text. */
export function textOf(node: NativeNode | NativeTextRun): string {
  if ("type" in node) {
    if (node.type === "text") return node.runs.map(textOf).join("");
    if ("children" in node && Array.isArray(node.children)) return node.children.map(textOf).join(" ").trim();
    return "";
  }
  return (node.text ?? "") + (node.runs ?? []).map(textOf).join("") + (node.node ? textOf(node.node) : "");
}

/** The nodes with their text replaced: the first text line says `text`, other text lines go. */
function setText(list: NativeNode[], text: string): NativeNode[] {
  let done = false;
  const walk = (nodes: NativeNode[]): NativeNode[] =>
    nodes.flatMap((n): NativeNode[] => {
      if (n.type === "text") {
        if (done) return [];
        done = true;
        return [{ ...n, runs: [{ text }] }];
      }
      if ("children" in n && Array.isArray(n.children)) return [{ ...n, children: walk(n.children) } as NativeNode];
      return [n];
    });
  const out = walk(list);
  return done ? out : [...out, { type: "text", tag: "#text", runs: [{ text }] }];
}

/** A copy of a node whose text reads `text` (a button's label, a count). */
export function withText(node: NativeNode, text: string): NativeNode {
  if (node.type === "text") return { ...node, runs: [{ text }] };
  if ("children" in node && Array.isArray(node.children)) return { ...node, children: setText(node.children, text) } as NativeNode;
  return node;
}

/** Every node of a tree (with text runs' inline nodes), depth first. */
export function walk(node: NativeNode, fn: (n: NativeNode) => void): void {
  fn(node);
  if ("children" in node && Array.isArray(node.children)) node.children.forEach((c) => walk(c, fn));
  if (node.type === "text") {
    const runs = (list: NativeTextRun[] | undefined) =>
      list?.forEach((r) => {
        if (r.node) walk(r.node, fn);
        runs(r.runs);
      });
    runs(node.runs);
  }
}

/** A tiny CSS selector test for "#id", ".class", "[data-x]", "[data-x=v]" and "tag" (data-nk-target / data-nk-radio-target). */
export function matches(node: { tag?: string; id?: string; cls?: string; nk?: Record<string, string> }, selector: string): boolean {
  return selector
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .some((sel) => {
      if (sel.startsWith("#")) return node.id === sel.slice(1);
      if (sel.startsWith(".")) return (node.cls ?? "").split(/\s+/).includes(sel.slice(1));
      const a = /^\[([\w-]+)(?:=["']?([^"'\]]*)["']?)?\]$/.exec(sel);
      if (a) {
        const v = a[1] === "id" ? node.id : node.nk?.[a[1]];
        return a[2] === undefined ? v !== undefined : v === a[2];
      }
      return node.tag === sel.toLowerCase();
    });
}

/* ── Stores and events ─────────────────────────────────────────────────── */

/** A value shared by the app's screens, with subscribers (for useSyncExternalStore). */
export class Store<T> {
  private listeners = new Set<() => void>();
  constructor(private value: T) {}
  get = (): T => this.value;
  set = (next: T): void => {
    this.value = next;
    this.listeners.forEach((l) => l());
  };
  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };
}

type Handler<T> = (v: T) => void;

/** A small event channel. */
export class Channel<T> {
  private handlers = new Set<Handler<T>>();
  on(fn: Handler<T>): () => void {
    this.handlers.add(fn);
    return () => {
      this.handlers.delete(fn);
    };
  }
  emit(v: T): void {
    this.handlers.forEach((h) => {
      try {
        h(v);
      } catch {
        /* one listener's error doesn't stop the others */
      }
    });
  }
}
