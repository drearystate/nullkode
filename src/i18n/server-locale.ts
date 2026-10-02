import { createFormatter, createTranslator } from "next-intl";
import { db } from "@/lib/db";
import { getSetting } from "@/lib/settings";
import { DEFAULT_LOCALE, isLocale, localeDir, type Locale } from "./locales";
import { loadMessages } from "./messages";

/**
 * Languages for messages that go to one specific person rather than to the
 * current request (emails, background jobs): that person's own choice
 * (Profile), else their reseller's default for its clients, else the
 * platform's default (Admin · Settings · Language), else English.
 */

type Person = { prefs?: unknown; role?: string | null; id?: string; resellerId?: string | null } | null | undefined;

/** A reseller's default language for its clients and its domain's visitors, if it set one (saved in its brand as "defaultLocale"). */
export function resellerDefaultLocale(reseller: { brand?: unknown } | null | undefined): Locale | null {
  const v = (reseller?.brand as { defaultLocale?: unknown } | null | undefined)?.defaultLocale;
  return isLocale(v) ? v : null;
}

/** The platform's default language (Admin · Settings · Language), if one is set. */
export async function platformDefaultLocale(): Promise<Locale | null> {
  const v = await getSetting("i18n.defaultLocale").catch(() => null);
  return isLocale(v) ? v : null;
}

export async function localeForUser(user: Person): Promise<Locale> {
  const own = (user?.prefs as { locale?: unknown } | null | undefined)?.locale;
  if (isLocale(own)) return own;
  if (user && (user.resellerId || (user.role === "RESELLER" && user.id))) {
    const reseller = await db.reseller
      .findFirst({ where: user.resellerId ? { id: user.resellerId } : { ownerId: user.id }, select: { brand: true } })
      .catch(() => null);
    const fromReseller = resellerDefaultLocale(reseller);
    if (fromReseller) return fromReseller;
  }
  return (await platformDefaultLocale()) ?? DEFAULT_LOCALE;
}

/**
 * Translator and formatter for one language, usable anywhere on the server
 * (also in timers and background work that run outside a request, where the
 * request-bound getTranslations can't read cookies or headers).
 */
export function translatorFor<N extends string>(locale: Locale, namespace: N) {
  const messages = loadMessages(locale);
  const t = createTranslator({
    locale,
    messages: messages as Parameters<typeof createTranslator>[0]["messages"],
    namespace: namespace as never,
    onError: () => {},
    getMessageFallback: ({ key, namespace: ns }) => [ns, key].filter(Boolean).join("."),
  }) as unknown as EmailT;
  const format = createFormatter({ locale, timeZone: "UTC" });
  return { t, format, locale, dir: localeDir(locale) };
}

type Values = Record<string, string | number | Date>;
export type EmailT = (key: string, values?: Values) => string;
