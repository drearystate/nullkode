import { useCallback, useEffect, useMemo, useRef, type RefObject } from "react";
import { Platform, type NativeSyntheticEvent, type NativeScrollEvent, type ScrollView } from "react-native";
import type { NativeNode, NativePage, NativeTextRun } from "../spec";
import type { AnchorApi } from "../render/context";

/**
 * In-page links (href="#menu", or a link to this page with #menu): the page
 * scrolls to the element with that id, as the browser does. Only nodes some
 * link points at are tracked (Node.tsx gives them a ref through
 * ctx.anchors.refFor). A link from another page with a #hash scrolls once
 * the page is drawn (PageScreen's `hash`).
 */

type Measurable = {
  measureInWindow?: (cb: (x: number, y: number, w: number, h: number) => void) => void;
  measureLayout?: (relativeTo: never, onSuccess: (x: number, y: number) => void, onFail: () => void) => void;
};

function hashTargets(page: NativePage, extra?: string): Set<string> {
  const out = new Set<string>();
  const add = (h?: string) => {
    if (h && h.length > 1 && h.startsWith("#")) {
      try {
        out.add(decodeURIComponent(h.slice(1)));
      } catch {
        out.add(h.slice(1));
      }
    }
  };
  const runs = (list?: NativeTextRun[]) =>
    list?.forEach((r) => {
      add(r.to?.hash);
      if (r.href?.startsWith("#")) add(r.href);
      if (r.node) visit(r.node);
      runs(r.runs);
    });
  const visit = (n: NativeNode) => {
    add(n.to?.hash);
    if (n.href?.startsWith("#")) add(n.href);
    if (n.type === "text") runs(n.runs);
    if ("children" in n && Array.isArray(n.children)) n.children.forEach(visit);
  };
  visit(page.root);
  page.overlays.forEach(visit);
  add(extra);
  return out;
}

/** The anchors of one page; `scroll` is the page's scroll view. */
export function useAnchors(page: NativePage | null, scroll: RefObject<ScrollView | null>, initialHash?: string) {
  const targets = useMemo(() => (page ? hashTargets(page, initialHash) : new Set<string>()), [page, initialHash]);
  const refs = useRef(new Map<string, Measurable>());
  const offset = useRef(0);

  const scrollTo = useCallback(
    (hash: string) => {
      let id = hash.replace(/^#/, "");
      try {
        id = decodeURIComponent(id);
      } catch {
        /* as written */
      }
      const el = refs.current.get(id);
      const ref = scroll.current as unknown as (Measurable & { getNativeScrollRef?: () => Measurable | null; getInnerViewRef?: () => unknown }) | null;
      if (!el || !ref) return;
      const go = (y: number) => scroll.current?.scrollTo({ y: Math.max(0, y), animated: true });
      // Phones: the target's offset inside the scroll view's content.
      const inner = ref.getInnerViewRef?.();
      if (Platform.OS !== "web" && inner && el.measureLayout) {
        el.measureLayout(inner as never, (_x, y) => go(y), () => {});
        return;
      }
      // Browser: where it is on the screen, against the scroll view, plus how far it has scrolled.
      const sv = ref.measureInWindow ? ref : (ref.getNativeScrollRef?.() ?? null);
      if (!el.measureInWindow || !sv?.measureInWindow) return;
      sv.measureInWindow((_x, top) => {
        el.measureInWindow!((_x2, y) => go(y - top + offset.current));
      });
    },
    [scroll],
  );

  const api = useMemo<AnchorApi>(
    () => ({
      isTarget: (id) => targets.has(id),
      refFor: (id) => (el) => {
        if (el) refs.current.set(id, el as Measurable);
        else refs.current.delete(id);
      },
      scrollTo,
    }),
    [targets, scrollTo],
  );

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    offset.current = e.nativeEvent.contentOffset.y;
  }, []);

  // A link from another page: scroll once the page is drawn.
  useEffect(() => {
    if (!page || !initialHash) return;
    const t = setTimeout(() => scrollTo(initialHash), 350);
    return () => clearTimeout(t);
  }, [page, initialHash, scrollTo]);

  return { api, onScroll };
}
