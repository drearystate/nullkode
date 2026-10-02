import { createTranslator } from "next-intl";
import { DEFAULT_LOCALE, type Locale } from "@/i18n/locales";
import { loadMessages } from "@/i18n/messages";
import { catalogText, type CatalogText, type CatalogTranslator } from "./catalog-i18n";

const cache = new Map<string, { tree: unknown; text: CatalogText }>();

/**
 * The built-in catalog's words (./catalog-i18n) in one language, for server
 * code that has a locale but no request scope (route helpers, libraries).
 * Pages and route handlers can also use
 * `catalogText(await getTranslations("catalog"), await getLocale())`.
 */
export function catalogFor(locale: Locale = DEFAULT_LOCALE): CatalogText {
  const messages = loadMessages(locale);
  const hit = cache.get(locale);
  if (hit && hit.tree === messages) return hit.text;
  const t = createTranslator({
    locale,
    messages: messages as Parameters<typeof createTranslator>[0]["messages"],
    namespace: "catalog",
    onError: () => {},
  }) as unknown as CatalogTranslator;
  const text = catalogText(t, locale);
  cache.set(locale, { tree: messages, text });
  return text;
}
