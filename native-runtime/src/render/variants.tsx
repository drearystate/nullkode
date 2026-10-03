import { createContext, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";
import type { NativeNode, NativeTextRun, NativeVariant } from "../spec";
import { usePageScope } from "../behaviours/scope";

/**
 * Variants: how a node looks in another state (spec: NativeNodeBase.variants).
 * The states in force are a set of keys in a context: "dark" for the whole
 * page (the visitor's dark theme), ".playing" inside a radio player that
 * plays, ".active" / "!.active" on a station pick. A provider adds keys; a
 * key of the same class family (".active" vs "!.active") replaces the outer one,
 * so a pick's own state wins over its list's.
 */

const EMPTY: ReadonlySet<string> = new Set();
export const VariantCtx = createContext<ReadonlySet<string>>(EMPTY);

export function useVariants(): ReadonlySet<string> {
  return useContext(VariantCtx);
}

/** Adds (or with `false` removes) state keys for everything inside. */
export function VariantScope({ set, children }: { set: Record<string, boolean>; children: ReactNode }) {
  const outer = useContext(VariantCtx);
  const sig = Object.entries(set)
    .map(([k, v]) => `${k}:${v ? 1 : 0}`)
    .join("|");
  const value = useMemo(() => {
    const next = new Set(outer);
    for (const [k, on] of Object.entries(set)) {
      const family = k.replace(/^!/, "");
      next.delete(family);
      next.delete(`!${family}`);
      if (on) next.add(k);
    }
    return next;
  }, [outer, sig]); // eslint-disable-line react-hooks/exhaustive-deps
  return <VariantCtx.Provider value={value}>{children}</VariantCtx.Provider>;
}

// The merged copies, per node and set of states: the same state gives the
// same object, so components that keep state per node (forms, lists) keep it.
const cache = new WeakMap<object, Map<string, object>>();

function merge<T extends { style?: unknown; hidden?: boolean; variants?: Record<string, NativeVariant> }>(item: T, keys: ReadonlySet<string>): T {
  const v = item.variants;
  if (!v || !keys.size) return item;
  const active = Object.keys(v).filter((k) => keys.has(k));
  if (!active.length) return item;
  const sig = active.join("|");
  let byItem = cache.get(item);
  const hit = byItem?.get(sig);
  if (hit) return hit as T;
  let out: T | null = null;
  for (const key of active) {
    const patch = v[key];
    out = out ?? ({ ...item } as T);
    if (patch.style) {
      const style: Record<string, unknown> = { ...((out.style as Record<string, unknown> | undefined) ?? {}) };
      for (const [k, val] of Object.entries(patch.style)) {
        // null: the property goes (no shadow, no gradient in that state).
        if (val === null || val === undefined) delete style[k];
        else style[k] = val;
      }
      (out as { style?: unknown }).style = style;
    }
    if (patch.hidden !== undefined) out.hidden = patch.hidden;
    if (patch.xml && (out as unknown as { type?: string }).type === "svg") (out as unknown as { xml: string }).xml = patch.xml;
  }
  if (!byItem) cache.set(item, (byItem = new Map()));
  byItem.set(sig, out as object);
  return out ?? item;
}

/** The node as it looks in the states in force. */
export function withVariants(node: NativeNode, keys: ReadonlySet<string>): NativeNode {
  return merge(node, keys);
}

export function runWithVariants(run: NativeTextRun, keys: ReadonlySet<string>): NativeTextRun {
  return merge(run, keys);
}

const NO_SUBSCRIBE = () => () => {};

/**
 * The states in force for one node or run: the context's, plus its form
 * field states ("checked:<fieldId>" / "!checked:<fieldId>": a label whose
 * look follows its checkbox or radio). Only nodes with such variants
 * subscribe to the fields.
 */
export function useNodeVariants(item: { variants?: Record<string, NativeVariant> }): ReadonlySet<string> {
  const keys = useContext(VariantCtx);
  const page = usePageScope();
  const fieldKeys = item.variants ? Object.keys(item.variants).filter((k) => /^!?checked:/.test(k)) : [];
  const has = fieldKeys.length > 0;
  const sig = useSyncExternalStore(
    has ? page.checks.subscribe : NO_SUBSCRIBE,
    () => (has ? fieldKeys.map((k) => (page.checks.get()[k.replace(/^!?checked:/, "")] ? 1 : 0)).join("") : ""),
    () => "",
  );
  return useMemo(() => {
    if (!has) return keys;
    const checks = page.checks.get();
    const next = new Set(keys);
    for (const k of fieldKeys) {
      const id = k.replace(/^!?checked:/, "");
      if (!(id in checks)) continue;
      if (k.startsWith("!") ? checks[id] === false : checks[id] === true) next.add(k);
    }
    return next;
  }, [keys, sig, has]); // eslint-disable-line react-hooks/exhaustive-deps
}
