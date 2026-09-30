import { cookies } from "next/headers";

/**
 * Light / dark for the studio. The choice lives in the nk-theme cookie (so
 * signed-out pages like the landing page and sign-in remember it) and, for
 * signed-in people, in their account prefs (so it follows them to other
 * devices; that wins over the cookie). "system" follows the device.
 */

export const THEME_COOKIE = "nk-theme";
export type ThemePref = "light" | "dark" | "system";

export function isThemePref(v: unknown): v is ThemePref {
  return v === "light" || v === "dark" || v === "system";
}

export async function themePref(user?: { prefs?: unknown } | null): Promise<ThemePref> {
  const fromAccount = (user?.prefs as { theme?: unknown } | null | undefined)?.theme;
  if (isThemePref(fromAccount)) return fromAccount;
  const fromCookie = (await cookies()).get(THEME_COOKIE)?.value;
  return isThemePref(fromCookie) ? fromCookie : "system";
}

/**
 * Runs in <head> before anything paints: sets data-theme from the choice, or
 * from the device when the choice is "system", and follows the device while
 * the page is open.
 */
export function themeBootScript(pref: ThemePref): string {
  return `(function(){try{var p=${JSON.stringify(pref)},d=document.documentElement,m=window.matchMedia&&matchMedia('(prefers-color-scheme: light)');function a(){var t=p==='system'?(m&&m.matches?'light':'dark'):p;d.setAttribute('data-theme',t);d.style.colorScheme=t;}a();d.setAttribute('data-theme-pref',p);if(m&&m.addEventListener)m.addEventListener('change',function(){if(d.getAttribute('data-theme-pref')==='system')a();});}catch(e){}})();`;
}
