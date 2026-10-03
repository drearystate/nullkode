import { createContext, useContext } from "react";
import type { NativeApp, NativeFont, NativePage, NativeRoute } from "../spec";

/** In-page links (#id): which nodes are link targets, and scrolling to them (behaviours/anchors.tsx). */
export type AnchorApi = {
  isTarget: (id: string) => boolean;
  refFor: (id: string) => (el: unknown) => void;
  /** "#reviews" or "reviews". */
  scrollTo: (hash: string) => void;
};

/** The visitor's session as the app's back end reports it (phase 2 fills it). */
export type Session = { signedIn: boolean; role?: string; user?: Record<string, unknown> };

export type RenderContext = {
  app: NativeApp;
  page: NativePage;
  /** Fonts that loaded, by key (others fall back to the system font). */
  fonts: Map<string, NativeFont>;
  session: Session;
  /** Screen height in points (vh units). */
  screenHeight: number;
  /** Opens one of the app's pages natively. */
  navigate: (to: NativeRoute) => void;
  /** Opens an address outside the app (browser, mail, phone). */
  openUrl: (href: string) => void;
  /** In-page links; absent where the page doesn't scroll (fidelity harness). */
  anchors?: AnchorApi;
  /** Multilingual apps: switch the app to another of its languages (behaviours/locale.tsx). */
  setLocale?: (code: string) => void;
};

export const RenderCtx = createContext<RenderContext | null>(null);

export function useRender(): RenderContext {
  const ctx = useContext(RenderCtx);
  if (!ctx) throw new Error("RenderCtx missing");
  return ctx;
}
