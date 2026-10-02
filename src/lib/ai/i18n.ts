import { createTranslator } from "next-intl";
import { DEFAULT_LOCALE, LOCALES, type Locale } from "@/i18n/locales";
import { loadMessages } from "@/i18n/messages";

/**
 * Words for the person, from server code that may keep running after the
 * request ended (AI builds run in the background). Capture the language with
 * personLocale() while the request is alive, then translate with translator().
 */
export type Tr = ((key: string, values?: Record<string, string | number | Date>) => string) & {
  /** The language this translator speaks. */
  locale?: Locale;
};

/** The person's studio language for this request; English outside a request. */
export async function personLocale(): Promise<Locale> {
  try {
    const { requestLocale } = await import("@/i18n/request");
    return await requestLocale();
  } catch {
    return DEFAULT_LOCALE;
  }
}

export function translator(locale: Locale, namespace: "ai" | "designer" | "errors"): Tr {
  const t = createTranslator({ locale, messages: loadMessages(locale), onError: () => {} }) as unknown as (key: string, values?: Record<string, string | number | Date>) => string;
  return Object.assign((key: string, values?: Record<string, string | number | Date>) => t(`${namespace}.${key}`, values), { locale });
}

/** Translator for the current request's language. */
export async function requestTranslator(namespace: "ai" | "designer" | "errors"): Promise<Tr> {
  return translator(await personLocale(), namespace);
}

/** The language's English name ("Spanish"), for telling the AI which language to reply in. */
export function languageName(locale: Locale): string {
  return LOCALES.find((l) => l.code === locale)?.english ?? "English";
}

/**
 * One prompt line telling the AI which language its words to the person
 * (chat replies, questions, summaries) are in. Empty for English, so English
 * prompts stay exactly as they were.
 */
export function replyLanguageRule(locale: Locale, what: string): string {
  if (locale === DEFAULT_LOCALE) return "";
  return `LANGUAGE: Write ${what} in ${languageName(locale)}. This only sets the language of your words to the person; it does not change the language of the website or app itself.`;
}
