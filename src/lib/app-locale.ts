import { getSetting, setSetting } from "./settings";
import { loadMessages } from "@/i18n/messages";
import { DEFAULT_LOCALE, LOCALES, isLocale, localeDir, type Locale } from "@/i18n/locales";

/**
 * The language an app (Project) speaks to its visitors: its pages, the
 * runtime's built-in notices, the pages and emails modules install, and
 * <html lang dir>. Stored in Setting `locale:<projectId>` as { locale }, so
 * no schema change is needed (erase.ts already removes `*:<projectId>` rows
 * with the app). Apps without one are English, exactly as before.
 *
 * The visitor texts the platform itself adds (runtime notices, the team-only
 * page, flow errors) live in messages/<locale>/runtime.json, translated by
 * scripts/i18n-translate.ts like every other area.
 */

export type AppLocale = {
  /** The app's default language (its pages are written in it). */
  locale: Locale;
  dir: "ltr" | "rtl";
  /** True when the owner (or the AI build) chose it; false for the English default. */
  explicit: boolean;
  /**
   * Every language the app offers, the default first. One for most apps;
   * multilingual apps (lib/app-translations.ts) add more, each with its own
   * translated pages at /<code>/<page>.
   */
  locales: Locale[];
};

const key = (projectId: string) => `locale:${projectId}`;
const TTL_MS = 30_000;
const memo = new Map<string, { at: number; value: AppLocale }>();

function info(locale: Locale, explicit: boolean, others: unknown = []): AppLocale {
  const extra = Array.isArray(others) ? others.filter((c): c is Locale => isLocale(c) && c !== locale) : [];
  return { locale, dir: localeDir(locale), explicit, locales: [locale, ...new Set(extra)] };
}

/** Whether the app offers more than one language. */
export function isMultilingual(app: Pick<AppLocale, "locales">): boolean {
  return app.locales.length > 1;
}

/** The app's language (English unless one was chosen). Cached briefly: flows and pages ask on every request. */
export async function getAppLocale(projectId: string): Promise<AppLocale> {
  const hit = memo.get(projectId);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value;
  const raw = await getSetting<{ locale?: unknown; locales?: unknown }>(key(projectId)).catch(() => undefined);
  const value = isLocale(raw?.locale) ? info(raw.locale, true, raw.locales) : info(DEFAULT_LOCALE, false);
  if (memo.size > 5000) memo.clear();
  memo.set(projectId, { at: Date.now(), value });
  return value;
}

/** Changes the app's default language; its other languages stay (the old default becomes one of them). */
export async function setAppLocale(projectId: string, locale: Locale): Promise<AppLocale> {
  memo.delete(projectId);
  const current = await getAppLocale(projectId);
  const others = current.explicit && current.locales.length > 1 ? current.locales.filter((c) => c !== locale) : [];
  return saveLocales(projectId, locale, others);
}

/** The app's other languages (besides the default); [] makes it single-language again. */
export async function setAppLocales(projectId: string, others: Locale[]): Promise<AppLocale> {
  memo.delete(projectId);
  const current = await getAppLocale(projectId);
  return saveLocales(projectId, current.locale, others);
}

async function saveLocales(projectId: string, locale: Locale, others: Locale[]): Promise<AppLocale> {
  const value = info(locale, true, others);
  // Single-language apps keep the shape they always had: { locale }.
  await setSetting(key(projectId), value.locales.length > 1 ? { locale, locales: value.locales } : { locale });
  memo.set(projectId, { at: Date.now(), value });
  return value;
}

/** Sets the app's language only if none was chosen yet (AI builds, the Designer's first save). */
export async function ensureAppLocale(projectId: string, locale: Locale): Promise<AppLocale> {
  const current = await getAppLocale(projectId);
  return current.explicit ? current : setAppLocale(projectId, locale);
}

/**
 * The language a new app is built in when nobody chose one: the studio
 * language of the person building it (their Profile, this device's choice,
 * the platform default, their browser), else English. Only works while
 * handling their request.
 */
export async function studioLocaleOrEnglish(): Promise<Locale> {
  try {
    const { requestLocale } = await import("@/i18n/request");
    return await requestLocale();
  } catch {
    return DEFAULT_LOCALE;
  }
}

/** "Arabic (العربية, code "ar")": how prompts name a language. */
export function languageLabel(locale: string): string {
  const l = LOCALES.find((x) => x.code === locale);
  if (!l) return locale;
  return l.name === l.english ? `${l.english} (code "${l.code}")` : `${l.english} (${l.name}, code "${l.code}")`;
}

/**
 * The instruction AI builders add so an app's content is written in its
 * language. "" for English, so English builds keep their prompts exactly.
 * kind "fragment": page-builder pages (the platform sets <html lang dir>);
 * "document": full HTML documents (AI Designer), which set them themselves.
 */
export function contentLanguageRule(locale: string | null | undefined, kind: "fragment" | "document" = "fragment"): string {
  if (!locale || !isLocale(locale) || locale === DEFAULT_LOCALE) return "";
  const l = LOCALES.find((x) => x.code === locale)!;
  const rtl = l.dir === "rtl";
  return (
    `LANGUAGE: This app is in ${languageLabel(locale)}. Write every word its visitors see in ${l.english}: page titles, headings, text, buttons, links, menus, form labels, placeholders, alt text, empty-list notes, success and error messages, and sample content and data. ` +
    `Keep code, CSS class names, ids, data-nk-* attributes, flow, table and field names, page slugs and URLs exactly as specified (in English).` +
    (kind === "document" ? ` Start the document with <html lang="${l.code}" dir="${l.dir}">.` : "") +
    (rtl
      ? ` ${l.english} is written right to left${kind === "fragment" ? ' (the platform sets dir="rtl" on the page)' : ""}: lay pages out with start/end instead of left/right (Bootstrap ms-*, me-*, ps-*, pe-*, text-start, text-end; CSS margin-inline-start, padding-inline-end, inset-inline-start, text-align: start), and mirror arrows that point forward or back.`
      : "")
  );
}

/* ── Built-in visitor texts (messages/<locale>/runtime.json) ─────────────── */

type Tree = { [k: string]: string | Tree };

function flatten(t: Tree | undefined, pre = "", out: Record<string, string> = {}): Record<string, string> {
  for (const [k, v] of Object.entries(t ?? {})) {
    const name = pre ? `${pre}.${k}` : k;
    if (typeof v === "string") out[name] = v;
    else flatten(v, name, out);
  }
  return out;
}

/** Every runtime text in this language (English where a translation is missing). */
export function runtimeMessages(locale: Locale): Record<string, string> {
  return flatten(loadMessages(locale).runtime as Tree | undefined);
}

/** The runtime texts a page needs (the delete-account page's own texts, "account.*", and the phone app's, "native.*", stay out). */
function pageTexts(locale: Locale): Record<string, string> {
  return Object.fromEntries(Object.entries(runtimeMessages(locale)).filter(([k]) => !k.startsWith("account.") && !k.startsWith("native.")));
}

/**
 * The runtime texts of the phone app (NullKode Native, NativeApp.texts): the
 * web runtime's visitor texts plus its own ("native.*"), English where a
 * translation is missing. English apps get them too (the engine has no other
 * copy of the runtime's words).
 */
export function nativeAppTexts(locale: Locale): Record<string, string> {
  return Object.fromEntries(Object.entries(runtimeMessages(locale)).filter(([k]) => !k.startsWith("account.")));
}

/** A group of runtime texts ("account" → { deleteTitle: … }), for pages rendered on the server. */
export function runtimeGroup(locale: Locale, group: string): Record<string, string> {
  const prefix = `${group}.`;
  return Object.fromEntries(Object.entries(runtimeMessages(locale)).filter(([k]) => k.startsWith(prefix)).map(([k, v]) => [k.slice(prefix.length), v]));
}

/** One runtime text with its {placeholders} filled. Falls back to English, then to the key. */
export function runtimeText(locale: Locale, name: string, vars: Record<string, string | number> = {}): string {
  const text = runtimeMessages(locale)[name] ?? runtimeMessages(DEFAULT_LOCALE)[name] ?? name;
  return text.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

/**
 * A translator bound to an app's language, for server code that answers
 * visitors. `lang` is the visitor's language (x-nk-lang on /api/run) when
 * the app offers it; otherwise the app's default.
 */
export async function appRuntimeText(projectId: string, lang?: string | null): Promise<(name: string, vars?: Record<string, string | number>) => string> {
  const app = await getAppLocale(projectId);
  const locale = lang && isLocale(lang) && app.locales.includes(lang) ? lang : app.locale;
  return (name, vars) => runtimeText(locale, name, vars);
}

/** The visitor's language for a request to an app: a language it offers, else its default. */
export function offeredLocale(app: Pick<AppLocale, "locale" | "locales">, lang: string | null | undefined): Locale {
  return lang && isLocale(lang) && app.locales.includes(lang) ? lang : app.locale;
}

/** JSON safe inside an inline <script> ("<" and the JS line separators escaped). */
function scriptJson(value: unknown): string {
  return JSON.stringify(value).replace(/[<\u2028\u2029]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`);
}

/** Which language a published page is shown in, and the app's address (multilingual apps). */
export type PageLanguage = {
  /** The language of this page (a language the app offers). */
  lang: Locale;
  /** The app's base path: "/app/<slug>", or "" on its own domain. */
  base: string;
};

/** Name of the cookie that remembers a visitor's language choice for an app. */
export const APP_LANG_COOKIE = "nk-app-lang";

/**
 * Inline script for a published page, rendered before the page's own markup
 * so its scripts can read it:
 *  - window.__nkLocale = { lang, dir, locales, default }: the page's language
 *    (lang and dir are also on <html>), the languages the app offers and its
 *    default;
 *  - window.__nkText: the runtime's built-in visitor texts in that language
 *    (RUNTIME_JS falls back to English for anything missing);
 *  - window.nkSetLocale(code): changes <html lang dir> and __nkLocale, then
 *    fires "nk-locale-change" (detail { lang, dir }) on document and window.
 *    Modules that ship their own strings (Places, Rides) listen for it.
 * English apps get no __nkText, so the runtime behaves exactly as before.
 *
 * Multilingual apps (more than one language) also get, from
 * multilingualScript(): the language switcher ([data-nk-lang-switcher]),
 * the visitor's language on every flow call (x-nk-lang) and flow redirects
 * that stay in the visitor's language. Single-language apps' script is
 * unchanged.
 */
export function localeBootScript(app: AppLocale, page?: PageLanguage): string {
  const dirs = Object.fromEntries(LOCALES.map((l) => [l.code, l.dir]));
  const multi = isMultilingual(app);
  const lang = multi && page && app.locales.includes(page.lang) ? page.lang : app.locale;
  const text = lang === DEFAULT_LOCALE ? null : pageTexts(lang);
  const data = scriptJson({ lang, dir: localeDir(lang), locales: multi ? app.locales : [app.locale], default: app.locale });
  const textJson = text ? scriptJson(text) : "null";
  return (
    `(function(w,d){w.__nkLocale=${data};` +
    (text ? `w.__nkText=${textJson};` : "") +
    `var dirs=${JSON.stringify(dirs)};` +
    `w.nkSetLocale=function(code){if(!code)return;var dir=dirs[code]||"ltr",h=d.documentElement;` +
    `h.setAttribute("lang",code);h.setAttribute("dir",dir);w.__nkLocale.lang=code;w.__nkLocale.dir=dir;` +
    `var detail={lang:code,dir:dir};try{d.dispatchEvent(new CustomEvent("nk-locale-change",{detail:detail}));` +
    `w.dispatchEvent(new CustomEvent("nk-locale-change",{detail:detail}))}catch(e){}};})(window,document);` +
    (multi ? multilingualScript(app, page?.base ?? "", lang) : "")
  );
}

/**
 * The browser side of a multilingual app (see localeBootScript). Language
 * addresses: the default language has none (/contact), the others a prefix
 * (/es/contact), after the app's base. A visitor's choice is remembered in
 * the nk-app-lang cookie (per app: its path is the app's base).
 */
function multilingualScript(app: AppLocale, base: string, lang: Locale): string {
  const names = Object.fromEntries(app.locales.map((c) => [c, LOCALES.find((l) => l.code === c)?.name ?? c]));
  const cfg = scriptJson({ base, names, label: runtimeText(lang, "language"), cookie: APP_LANG_COOKIE });
  return `(function(w,d,c){var L=w.__nkLocale;L.base=c.base;L.names=c.names;
function lower(s){return String(s||"").toLowerCase()}
function strip(p){var b=c.base,r=p;if(b&&(r===b||r.indexOf(b+"/")===0))r=r.slice(b.length);var s=r.split("/")[1]||"";
for(var i=0;i<L.locales.length;i++){if(lower(L.locales[i])===lower(s)){r=r.slice(s.length+1);break}}return r||"/"}
function prefix(code){return code===L.default?"":"/"+code}
L.urlFor=function(code,path){var rest=strip(path==null?location.pathname:path);return c.base+prefix(code)+(rest==="/"&&(c.base||prefix(code))?"":rest)||"/"};
function remember(code){try{d.cookie=c.cookie+"="+encodeURIComponent(code)+"; Path="+(c.base||"/")+"; Max-Age=31536000; SameSite=Lax"+(location.protocol==="https:"?"; Secure":"")}catch(e){}}
w.nkChooseLocale=function(code){if(!code||L.locales.indexOf(code)<0)return;remember(code);w.nkSetLocale(code);var u=L.urlFor(code)+location.search+location.hash;if(u!==location.pathname+location.search+location.hash)location.href=u};
var f=w.fetch;if(f){w.fetch=function(input,init){try{var url=typeof input==="string"?input:input&&input.url;var u=url&&url.indexOf(location.origin+"/")===0?url.slice(location.origin.length):url;if(u&&u.indexOf("/api/run/")===0){init=init||{};var h=new Headers(init.headers||(typeof input!=="string"&&input.headers)||{});if(!h.has("x-nk-lang"))h.set("x-nk-lang",L.lang);init.headers=h}}catch(e){}return f.call(this,input,init)}}
var nav;try{Object.defineProperty(w,"__nkNavigate",{configurable:true,get:function(){return nav},set:function(fn){nav=typeof fn!=="function"?fn:function(p){if(typeof p==="string"&&p.charAt(0)==="/"&&!/^[/](api|uploads|_next|nk-)/.test(p)&&L.lang!==L.default){var s=p.split("/")[1]||"";if(lower(s)!==lower(L.lang))p="/"+L.lang+(p==="/"?"":p)}return fn(p)}}})}catch(e){}
function paint(){d.querySelectorAll("[data-nk-lang-switcher]").forEach(function(el){if(el.__nkLang)return;el.__nkLang=1;var s=d.createElement("select");s.className="form-select form-select-sm nk-lang-switcher";s.setAttribute("aria-label",c.label);s.setAttribute("data-nk-lang-select","");
L.locales.forEach(function(code){var o=d.createElement("option");o.value=code;o.lang=code;o.textContent=c.names[code]||code;if(code===L.lang)o.selected=true;s.appendChild(o)});
s.addEventListener("change",function(){w.nkChooseLocale(s.value)});el.textContent="";el.appendChild(s)})}
if(d.readyState==="loading")d.addEventListener("DOMContentLoaded",paint);else paint();w.__nkPaintLangSwitchers=paint;
})(window,document,${cfg});`;
}
