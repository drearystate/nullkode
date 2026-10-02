import { createHash } from "node:crypto";
import { providerComplete } from "./ai/provider";
import { aiReady } from "./ai/client";
import { estimateTokens } from "./ai/budget";
import { extractJson, stripFences, stripThinking } from "./ai/text";
import { languageLabel } from "./app-locale";
import { DEFAULT_LOCALE, isLocale } from "@/i18n/locales";

/**
 * Translating content the platform installs into an app (feature-module
 * pages, their titles and built-in messages) into the app's language with
 * the configured AI. Nothing here ever makes things worse: when the AI isn't
 * set up, fails, or changes anything but the words (a tag, an attribute, a
 * data-nk-* wiring attribute, a {placeholder}, a comment marker, a script),
 * the English original is kept.
 *
 *   localizeHtml(html, "es")       one AI call per page
 *   localizeStrings({ k: "…" }, "es")  one AI call for a batch of short texts
 */

/** Attributes people read; their values may be translated. Every other attribute must come back unchanged. */
const TEXT_ATTRS = new Set([
  "title", "alt", "placeholder", "aria-label", "aria-description", "label",
  "data-nk-empty-text", "data-nk-success-text", "data-nk-pending-text", "data-nk-confirm", "data-help",
]);
const BUTTON_INPUT_TYPES = new Set(["submit", "button", "reset"]);

/** Script, style, inline SVG and comments are kept out of the AI's reach and put back afterwards. */
const KEEP_RE = /<script\b[\s\S]*?<\/script\s*>|<style\b[\s\S]*?<\/style\s*>|<svg\b[\s\S]*?<\/svg\s*>|<!--[\s\S]*?-->/gi;
const KEEP_TOKEN_RE = /<!--nk-keep:(\d+)-->/g;
const TAG_RE = /<(\/?)([a-zA-Z][a-zA-Z0-9:-]*)((?:\s+[^\s"'>/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*)\s*\/?\s*>/g;
const ATTR_RE = /([^\s"'>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
/** {{config.appName}}, {{vars.x}}, {name}: filled in later, so they must survive word for word. */
const PLACEHOLDER_RE = /\{\{[\s\S]*?\}\}|\{[A-Za-z_][\w.]*\}/g;

const decode = (s: string) => s.replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");

type Tag = { close: boolean; name: string; attrs: Map<string, string> };

function tags(html: string): Tag[] {
  const out: Tag[] = [];
  for (const m of html.matchAll(TAG_RE)) {
    const attrs = new Map<string, string>();
    for (const a of (m[3] ?? "").matchAll(ATTR_RE)) {
      attrs.set(a[1].toLowerCase(), decode(a[2] ?? a[3] ?? a[4] ?? ""));
    }
    out.push({ close: m[1] === "/", name: m[2].toLowerCase(), attrs });
  }
  return out;
}

const placeholders = (s: string) => [...s.matchAll(PLACEHOLDER_RE)].map((m) => m[0].replace(/\s+/g, "")).sort().join("\u0000");
const keepTokens = (s: string) => [...s.matchAll(KEEP_TOKEN_RE)].map((m) => m[1]).join(",");

function translatable(tag: Tag, attr: string): boolean {
  if (TEXT_ATTRS.has(attr)) return true;
  return attr === "value" && tag.name === "input" && BUTTON_INPUT_TYPES.has((tag.attrs.get("type") ?? "").toLowerCase());
}

/** Why a translation can't be used, or null when only words changed. */
export function htmlTranslationProblem(original: string, translated: string): string | null {
  if (!translated.trim()) return "empty answer";
  if (keepTokens(original) !== keepTokens(translated)) return "a script, style, icon or comment marker was changed";
  const a = tags(original);
  const b = tags(translated);
  if (a.length !== b.length) return `tag count changed (${a.length} → ${b.length})`;
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    const y = b[i];
    if (x.close !== y.close || x.name !== y.name) return `tag ${i + 1} changed (<${x.close ? "/" : ""}${x.name}> → <${y.close ? "/" : ""}${y.name}>)`;
    const names = [...x.attrs.keys()].sort().join(" ");
    if (names !== [...y.attrs.keys()].sort().join(" ")) return `attributes of <${x.name}> changed (${names} → ${[...y.attrs.keys()].sort().join(" ")})`;
    for (const [k, v] of x.attrs) {
      if (translatable(x, k)) continue;
      if (y.attrs.get(k) !== v) return `attribute ${k} of <${x.name}> changed`;
    }
  }
  if (placeholders(original) !== placeholders(translated)) return "a {placeholder} was changed";
  // Prose added before the first tag or after the last one ("Here is the page:").
  const lead = (s: string) => s.slice(0, s.search(/</) < 0 ? s.length : s.search(/</)).trim() !== "";
  const tail = (s: string) => s.slice(s.lastIndexOf(">") + 1).trim() !== "";
  if (lead(original) !== lead(translated) || tail(original) !== tail(translated)) return "text was added around the page";
  const ratio = translated.length / Math.max(1, original.length);
  if (ratio < 0.3 || ratio > 4) return "the answer's length is far from the original";
  return null;
}

function mask(html: string): { masked: string; kept: string[] } {
  const kept: string[] = [];
  const masked = html.replace(KEEP_RE, (m) => {
    kept.push(m);
    return `<!--nk-keep:${kept.length - 1}-->`;
  });
  return { masked, kept };
}

const unmask = (html: string, kept: string[]) => html.replace(KEEP_TOKEN_RE, (_m, i: string) => kept[Number(i)] ?? "");

/** Whether there's any text a person reads (outside tags, scripts, styles and placeholders). */
function hasWords(html: string): boolean {
  const text = html.replace(KEEP_RE, " ").replace(/<[^>]*>/g, " ").replace(PLACEHOLDER_RE, " ");
  if (/\p{L}/u.test(decode(text))) return true;
  return /\b(?:title|alt|placeholder|aria-label)\s*=\s*["'][^"']*\p{L}/iu.test(html);
}

function htmlSystem(locale: string): string {
  const lang = languageLabel(locale);
  return `You translate the visible text of a web page into ${lang}. You receive HTML and return the very same HTML with only the words people read translated.

RULES:
- Translate the text between tags, and the values of these attributes: title, alt, placeholder, aria-label, label, data-nk-empty-text, data-nk-success-text, data-nk-pending-text, data-nk-confirm, data-help, and value on submit/button inputs.
- Keep EXACTLY as they are: every tag and the order and nesting of tags; every other attribute and its value (class, id, href, src, name, type, style, for, every data-nk-* attribute, and so on); every HTML comment such as <!--nk-keep:3--> or <!--nk:require-auth-->; anything in {curly braces} or {{double braces}} (placeholders filled in later, like {name} or {{config.appName}}); web addresses, email addresses, numbers, code, and brand or product names.
- Never add, remove, merge or move tags. Never add a note or an explanation.
- Use the natural, friendly wording people who speak ${lang} expect on websites and apps, about as short as the English.
- Reply with ONLY the translated HTML: no markdown fences, nothing before or after it.`;
}

const memo = new Map<string, string>();
const MEMO_MAX = 300;
const memoKey = (kind: string, locale: string, text: string) => createHash("sha1").update(`${kind}\n${locale}\n${text}`).digest("base64");
function remember(key: string, value: string) {
  if (memo.size >= MEMO_MAX) memo.delete(memo.keys().next().value!);
  memo.set(key, value);
}

function wanted(locale: string): boolean {
  return isLocale(locale) && locale !== DEFAULT_LOCALE;
}

export type LocalizeOutcome = { html: string; translated: boolean; problem?: string };

/**
 * One page's HTML with its visible text in `locale`, plus whether it was
 * translated and, if not, why. Structure, data-nk-* wiring, {placeholders},
 * URLs, scripts, styles, icons and comments are guaranteed unchanged; on any
 * doubt the original comes back.
 */
export async function localizeHtmlDetailed(html: string, locale: string, opts: { signal?: AbortSignal } = {}): Promise<LocalizeOutcome> {
  if (!wanted(locale) || !html || !hasWords(html)) return { html, translated: false, problem: "nothing to translate" };
  const key = memoKey("html", locale, html);
  const hit = memo.get(key);
  if (hit) return { html: hit, translated: true };
  try {
    if (!(await aiReady())) return { html, translated: false, problem: "no AI model is set up" };
    const { masked, kept } = mask(html);
    const raw = await providerComplete({
      systemPrompt: htmlSystem(locale),
      userMessage: masked,
      task: "edit",
      maxTokens: Math.min(16000, Math.ceil(estimateTokens(masked) * 2.5) + 600),
      signal: opts.signal,
    });
    let out = stripFences(stripThinking(raw)).trim();
    // Some models still say something first; the page itself starts at its first tag.
    if (/^\s*</.test(masked)) {
      const first = out.search(/</);
      if (first > 0) out = out.slice(first);
    }
    const problem = htmlTranslationProblem(masked, out);
    if (problem) {
      console.warn(`[i18n-content] kept the English page (${locale}): ${problem}`);
      return { html, translated: false, problem };
    }
    const result = unmask(out, kept);
    remember(key, result);
    return { html: result, translated: true };
  } catch (err) {
    const problem = err instanceof Error ? err.message : String(err);
    console.warn(`[i18n-content] kept the English page (${locale}): ${problem}`);
    return { html, translated: false, problem };
  }
}

/** One page's HTML with its visible text in `locale`; the original HTML whenever that can't be done safely. */
export async function localizeHtml(html: string, locale: string): Promise<string> {
  return (await localizeHtmlDetailed(html, locale)).html;
}

/**
 * Short texts (page titles, a flow's built-in error and success messages,
 * email subjects and bodies) in `locale`, in one AI call. Each text keeps
 * its {placeholders}; any text that comes back missing or changed in a
 * placeholder stays English.
 */
export async function localizeStrings(strings: Record<string, string>, locale: string): Promise<Record<string, string>> {
  const out = { ...strings };
  if (!wanted(locale)) return out;
  const todo = Object.fromEntries(Object.entries(strings).filter(([, v]) => typeof v === "string" && /\p{L}/u.test(v.replace(PLACEHOLDER_RE, " "))));
  const pending: Record<string, string> = {};
  for (const [k, v] of Object.entries(todo)) {
    const hit = memo.get(memoKey("text", locale, v));
    if (hit) out[k] = hit;
    else pending[k] = v;
  }
  if (!Object.keys(pending).length) return out;
  try {
    if (!(await aiReady())) return out;
    const lang = languageLabel(locale);
    const raw = await providerComplete({
      systemPrompt: `You translate short texts from a website or app (page titles, button and form messages, emails to the site's visitors) into ${lang}.
RULES:
- Reply with ONLY a JSON object with exactly the same keys; each value is the translation of that key's text.
- Keep anything in {curly braces} or {{double braces}} exactly as it is (placeholders filled in later), and keep web addresses, email addresses, numbers and brand names.
- Natural, friendly wording people who speak ${lang} expect, about as short as the English.`,
      userMessage: JSON.stringify(pending),
      task: "edit",
      json: true,
      maxTokens: Math.min(8000, Math.ceil(estimateTokens(JSON.stringify(pending)) * 2.5) + 400),
    });
    const parsed = JSON.parse(extractJson(raw)) as Record<string, unknown>;
    for (const [k, en] of Object.entries(pending)) {
      const v = parsed[k];
      if (typeof v !== "string" || !v.trim() || placeholders(v) !== placeholders(en)) continue;
      out[k] = v.trim();
      remember(memoKey("text", locale, en), out[k]);
    }
  } catch (err) {
    console.warn(`[i18n-content] kept the English texts (${locale}): ${err instanceof Error ? err.message : err}`);
  }
  return out;
}

/** Runs `fn` over `items`, at most `limit` at a time (AI servers, local ones especially, handle a few calls at once). */
export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}
