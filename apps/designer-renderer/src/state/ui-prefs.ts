/**
 * Small, renderer-only preferences that aren't part of the design state:
 *
 *  - `advanced`: the Designer is made for non-technical people, so the
 *    developer-ish bits (files, workspace paths, token counts, comment mode,
 *    zoom, export formats) stay hidden until someone turns on "Advanced".
 *    Remembered per browser; storage failures just mean "off".
 *  - `me` / `brand`: who is signed in and which brand (name + logo) this
 *    person sees. The platform is white-label, so the Designer never
 *    hard-codes a product name — it shows whatever the server sends.
 */

import { create } from 'zustand';

export interface DesignerBrand {
  name: string;
  logoUrl: string | null;
  iconUrl: string | null;
}

export interface DesignerMe {
  id: string;
  email: string;
  name: string;
  role: 'USER' | 'ADMIN' | 'RESELLER';
  avatarUrl: string | null;
  brand?: DesignerBrand;
  links: {
    dashboard: string;
    projects: string;
    billing: string;
    admin: string | null;
    logout: string;
  };
}

const ADVANCED_KEY = 'designer:advanced';

function readAdvanced(): boolean {
  try {
    return window.localStorage.getItem(ADVANCED_KEY) === '1';
  } catch {
    return false;
  }
}

interface UiPrefsState {
  advanced: boolean;
  setAdvanced: (on: boolean) => void;
  me: DesignerMe | null;
  brand: DesignerBrand | null;
  loadMe: () => Promise<DesignerMe | null>;
}

let mePromise: Promise<DesignerMe | null> | null = null;

export const useUiPrefs = create<UiPrefsState>((set) => ({
  advanced: readAdvanced(),
  setAdvanced(on) {
    try {
      window.localStorage.setItem(ADVANCED_KEY, on ? '1' : '0');
    } catch {
      /* remembered for this visit only */
    }
    set({ advanced: on });
  },
  me: null,
  brand: null,
  loadMe() {
    if (mePromise) return mePromise;
    const api = (window as unknown as { codesign?: { me?: { get: () => Promise<DesignerMe> } } })
      .codesign?.me;
    if (!api) return Promise.resolve(null);
    mePromise = api
      .get()
      .then((me) => {
        set({ me, brand: me.brand ?? null });
        return me;
      })
      .catch(() => {
        mePromise = null;
        return null;
      });
    return mePromise;
  },
}));
