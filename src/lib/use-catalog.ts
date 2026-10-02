import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { catalogText, type CatalogText, type CatalogTranslator } from "./catalog-i18n";

/** The built-in catalog's words in the studio's language (see ./catalog-i18n), for client components. */
export function useCatalog(): CatalogText {
  const t = useTranslations("catalog");
  const locale = useLocale();
  return useMemo(() => catalogText(t as unknown as CatalogTranslator, locale), [t, locale]);
}
