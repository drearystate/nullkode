/**
 * The Help guides in the reader's language (server only: reads
 * messages/<locale>/guides.json from disk).
 *
 * Every piece of text is replaced by its translation when there is a good one,
 * else the English from guides.ts stays (per string). A translation is skipped
 * when its English has changed since it was made (messages/.i18n-cache.json),
 * when its {placeholders} or <b> tags don't match the English, or when it is
 * empty. Each section also gets `anchor`, made from the English heading, so
 * links like /help/billing#your-plan work in every language.
 *
 *   const guide = getLocalizedGuide(slug, await getLocale());
 */
import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import { DEFAULT_LOCALE, isLocale } from "@/i18n/locales";
import { GROUPS, allGuides, getGuide, sectionAnchor, type Guide, type GuideGroup } from "./guides";
import { flatten, fromMessage, toMessage } from "./guide-messages";

const ROOT = path.join(process.cwd(), "messages");
const CACHE_FILE = path.join(ROOT, ".i18n-cache.json");

type Json = { [k: string]: string | Json };
const files = new Map<string, { at: number; value: unknown }>();

/** A JSON file, re-read only when it changes. Null when missing or broken. */
function readJson(file: string): unknown {
  let at = 0;
  try {
    at = statSync(file).mtimeMs;
  } catch {
    files.delete(file);
    return null;
  }
  const hit = files.get(file);
  if (hit && hit.at === at) return hit.value;
  let value: unknown = null;
  try {
    value = JSON.parse(readFileSync(file, "utf8"));
  } catch {
    /* a broken file must not take Help down; English covers it */
  }
  files.set(file, { at, value });
  return value;
}

const hash = (s: string) => createHash("sha1").update(s).digest("hex").slice(0, 12);

/** Same comparison the translation script and check-i18n use. */
function shape(s: string): string {
  const args = [...s.matchAll(/\{\s*([A-Za-z_][\w]*)/g)].map((m) => m[1]).sort();
  const tags = [...s.matchAll(/<\/?([A-Za-z][\w-]*)>/g)].map((m) => m[1]).sort();
  return JSON.stringify([args, tags]);
}

/** Looks up translations for one language; returns English text when there's no good one. */
function translator(locale: string): (key: string, english: string) => string {
  if (!isLocale(locale) || locale === DEFAULT_LOCALE) return (_k, english) => english;
  const raw = readJson(path.join(ROOT, locale, "guides.json"));
  const messages = raw && typeof raw === "object" ? flatten(raw as Json) : {};
  const cache = (readJson(CACHE_FILE) ?? {}) as Record<string, string>;
  return (key, english) => {
    const tr = messages[key];
    if (typeof tr !== "string" || !tr.trim()) return english;
    const source = toMessage(english);
    const made = cache[`${locale}|guides|${key}`];
    if (made && made !== hash(source)) return english; // the English changed since
    if (shape(tr) !== shape(source)) return english;
    return fromMessage(tr) ?? english;
  };
}

function localize(guide: Guide, t: (key: string, english: string) => string): Guide {
  const at = (k: string, english: string) => t(`${guide.slug}.${k}`, english);
  return {
    ...guide,
    title: at("title", guide.title),
    summary: at("summary", guide.summary),
    sections: guide.sections.map((s, n) => {
      const p = `sections.${n}`;
      return {
        ...s,
        anchor: sectionAnchor(s),
        heading: at(`${p}.heading`, s.heading),
        body: s.body.map((x, i) => at(`${p}.body.${i}`, x)),
        steps: s.steps?.map((x, i) => at(`${p}.steps.${i}`, x)),
        bullets: s.bullets?.map((x, i) => at(`${p}.bullets.${i}`, x)),
        screenshot: s.screenshot
          ? { ...s.screenshot, alt: at(`${p}.shot.alt`, s.screenshot.alt), caption: at(`${p}.shot.caption`, s.screenshot.caption) }
          : undefined,
      };
    }),
  };
}

/** Every guide (GUIDE_SLUGS order) in this language, English where untranslated. Still has {app}: pass through brandGuide(). */
export function getLocalizedGuides(locale: string): Guide[] {
  const t = translator(locale);
  return allGuides().map((g) => localize(g, t));
}

/** One guide in this language, or null if there's no such guide. Still has {app}: pass through brandGuide(). */
export function getLocalizedGuide(slug: string, locale: string): Guide | null {
  const guide = getGuide(slug);
  return guide ? localize(guide, translator(locale)) : null;
}

/** The guide groups (GROUPS) with their titles in this language. */
export function getLocalizedGroups(locale: string): Array<{ id: GuideGroup; title: string }> {
  const t = translator(locale);
  return GROUPS.map((g) => ({ ...g, title: t(`groups.${g.id}`, g.title) }));
}
