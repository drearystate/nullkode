import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";
import { getCurrentUser } from "@/lib/auth";
import { DEFAULT_LOCALE, LOCALE_COOKIE, fromAcceptLanguage, isLocale, type Locale } from "./locales";
import { loadMessages } from "./messages";
import { TZ_COOKIE, validTimeZone } from "./time-zone";

/**
 * The studio's language for this request: the signed-in person's choice
 * (Profile), else this device's choice (cookie, so sign-in pages remember it),
 * else their reseller's default (a reseller's client, or anyone on a
 * reseller's domain; Reseller · Branding), else the platform's default
 * (Admin · Settings), else the browser's language, else English.
 */
export async function requestLocale(): Promise<Locale> {
  const user = await getCurrentUser().catch(() => null);
  const fromUser = (user?.prefs as { locale?: unknown } | null | undefined)?.locale;
  if (isLocale(fromUser)) return fromUser;
  const fromCookie = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(fromCookie)) return fromCookie;
  const [{ getRequestBrand }, { resellerDefaultLocale }] = await Promise.all([import("@/lib/reseller"), import("./server-locale")]);
  const reseller = await getRequestBrand(user).then((b) => b.reseller).catch(() => null);
  const fromReseller = resellerDefaultLocale(reseller);
  if (fromReseller) return fromReseller;
  const { getSetting } = await import("@/lib/settings");
  const platform = await getSetting("i18n.defaultLocale").catch(() => null);
  if (isLocale(platform)) return platform;
  return fromAcceptLanguage((await headers()).get("accept-language")) ?? DEFAULT_LOCALE;
}

export default getRequestConfig(async ({ locale: asked }) => {
  // getTranslations({ locale }) asks for a given language (e.g. an email to
  // someone else); everything else gets this request's language.
  const locale = isLocale(asked) ? asked : await requestLocale();
  return {
    locale,
    messages: loadMessages(locale),
    timeZone: validTimeZone((await cookies().catch(() => null))?.get(TZ_COOKIE)?.value) ?? "UTC",
    // A missing key never breaks a page: show the English text if there is one.
    onError: () => {},
    getMessageFallback: ({ key, namespace }) => [namespace, key].filter(Boolean).join("."),
  };
});
