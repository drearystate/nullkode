/**
 * The built-in catalog's words (template names and taglines; features'
 * names, summaries, details and setup questions) in the studio's language.
 *
 * The code stays the English source: templates in src/lib/templates/**,
 * features in src/lib/modules/** plus their plain names and one-liners in
 * src/components/modules/friendly.ts. scripts/build-catalog-messages.ts
 * (`pnpm catalog:messages`) writes them to messages/en/catalog.json, the
 * translation script translates that file like any other area, and these
 * helpers look the translations up by id. A key that isn't there (a feature
 * or template added since the file was built) shows the English from code,
 * never "catalog.modules.x.name". English always shows the code's text.
 *
 * Not translated: ids, config keys, option values, default values (they are
 * stored and go into the app, which gets its own language at install time),
 * and the pages a template or feature adds.
 *
 * Client components: `const cat = useCatalog()` (./use-catalog). Server code:
 * `catalogText(await getTranslations("catalog"), await getLocale())`.
 */
import { friendlyName, friendlySummary } from "@/components/modules/friendly";
import type { ModuleConfigField } from "@/lib/modules/types";

/** The bits of a next-intl translator for the "catalog" area these helpers use. */
export type CatalogTranslator = {
  (key: string): string;
  has(key: string): boolean;
};

type ModuleLike = { id: string; name: string; tagline: string; description?: string; config?: ModuleConfigField[] };
type TemplateLike = { id: string; name: string; tagline: string };

/** An option value as a message key (values like "en,es" can't be keys as they are). */
export function optionKey(value: string): string {
  return value.replace(/[^\w-]/g, "_") || "_";
}

/** Whether a field's placeholder is words to translate (not a URL, key or number example). */
export function translatablePlaceholder(placeholder: string | undefined): placeholder is string {
  return !!placeholder && /\s/.test(placeholder) && /[A-Za-z]{3}/.test(placeholder) && !/:\/\//.test(placeholder);
}

/**
 * Plain text → an ICU message that formats back to exactly the same text.
 * Text without {, }, < or > is left as it is (so the English file reads
 * naturally); otherwise apostrophes are doubled and those characters quoted.
 */
export function toCatalogMessage(text: string): string {
  if (!/[{}<>]/.test(text)) return text;
  return text.replace(/'/g, "''").replace(/[{}<>]+/g, (m) => `'${m}'`);
}

/** Every catalog message for one feature, flat ("name", "fields.title.label", …), in English. */
export function moduleMessages(m: ModuleLike): Record<string, string> {
  const out: Record<string, string> = {
    name: friendlyName(m),
    summary: friendlySummary(m),
  };
  if (m.description) out.description = m.description;
  for (const f of m.config ?? []) {
    out[`fields.${f.key}.label`] = f.label;
    if (f.help) out[`fields.${f.key}.help`] = f.help;
    if (translatablePlaceholder(f.placeholder)) out[`fields.${f.key}.placeholder`] = f.placeholder;
    for (const o of f.options ?? []) out[`fields.${f.key}.options.${optionKey(o.value)}`] = o.label;
  }
  return out;
}

/**
 * Every catalog message for one template, flat, in English. Our own
 * ("original") templates are named like a made-up business ("Alder & Ash",
 * "Clara Holt"): names, so they stay as they are; only their tagline is
 * translated.
 */
export function templateMessages(t: TemplateLike & { source?: string }): Record<string, string> {
  return t.source === "original" ? { tagline: t.tagline } : { name: t.name, tagline: t.tagline };
}

/** Lookups for one language; `t` is getTranslations/useTranslations("catalog"). */
export function catalogText(t: CatalogTranslator, locale: string) {
  const english = locale === "en";
  const pick = (key: string, fallback: string): string => {
    if (english || !fallback) return fallback;
    try {
      return t.has(key) ? t(key) : fallback;
    } catch {
      return fallback;
    }
  };
  const mod = (m: { id: string }, key: string, fallback: string) => pick(`modules.${m.id}.${key}`, fallback);

  return {
    /** A feature's plain name, e.g. "Sign-in and accounts". */
    moduleName: (m: Pick<ModuleLike, "id" | "name">) => mod(m, "name", friendlyName(m)),
    /** A feature's one line, e.g. "Let people create an account and sign in to your app." */
    moduleSummary: (m: Pick<ModuleLike, "id" | "tagline">) => mod(m, "summary", friendlySummary(m)),
    /** A feature's longer description (the card's "Details"). */
    moduleDescription: (m: Pick<ModuleLike, "id" | "description">) => mod(m, "description", m.description ?? ""),
    /** A feature's setup questions with their words translated (keys, values and defaults as they are). */
    moduleFields: (m: Pick<ModuleLike, "id" | "config">): ModuleConfigField[] =>
      (m.config ?? []).map((f) => {
        const at = `fields.${f.key}`;
        return {
          ...f,
          label: mod(m, `${at}.label`, f.label),
          ...(f.help ? { help: mod(m, `${at}.help`, f.help) } : {}),
          ...(translatablePlaceholder(f.placeholder) ? { placeholder: mod(m, `${at}.placeholder`, f.placeholder) } : {}),
          ...(f.options ? { options: f.options.map((o) => ({ ...o, label: mod(m, `${at}.options.${optionKey(o.value)}`, o.label) })) } : {}),
        };
      }),
    /** A template's name, e.g. "Pizza Parlor". */
    templateName: (tpl: TemplateLike) => pick(`templates.${tpl.id}.name`, tpl.name),
    /** A template's one line. */
    templateTagline: (tpl: TemplateLike) => pick(`templates.${tpl.id}.tagline`, tpl.tagline),
  };
}

export type CatalogText = ReturnType<typeof catalogText>;
