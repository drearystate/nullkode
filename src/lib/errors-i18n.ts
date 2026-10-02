import { createTranslator } from "next-intl";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/i18n/locales";
import { loadMessages } from "@/i18n/messages";

/**
 * Words for people from shared server libraries (plan limits, AI allowance,
 * email errors, health checks…), kept in messages/<locale>/errors.json.
 *
 * Library code often runs both inside a request and outside one (timers,
 * background builds), so it never calls getTranslations itself: it takes an
 * ErrT (or a locale) from its caller, or uses requestErrorsT(), which falls
 * back to the person's own language (or English) when there is no request.
 *
 * Text that is stored (build status files, email stats) is stored in English
 * with an ErrMsg next to it, and translated when it is shown.
 */
export type ErrT = (key: string, values?: Record<string, string | number | Date>) => string;
export type ErrValues = Record<string, string | number | Date | ErrMsg | ErrMsg[]>;
/** A message to translate later: a key in errors.json and its values (which may be messages too). */
export type ErrMsg = { key: string; values?: ErrValues };

const cache = new Map<string, ErrT>();

/** Translator for errors.json in one language, usable anywhere on the server. */
export function errorsT(locale: Locale = DEFAULT_LOCALE): ErrT {
  // loadMessages returns a new tree when the message files change; reuse the translator until then.
  const messages = loadMessages(locale);
  const hit = cache.get(locale);
  if (hit && (hit as ErrT & { tree?: unknown }).tree === messages) return hit;
  const t = createTranslator({
    locale,
    messages: messages as Parameters<typeof createTranslator>[0]["messages"],
    onError: () => {},
    getMessageFallback: ({ key, namespace }) => [namespace, key].filter(Boolean).join("."),
  }) as unknown as (key: string, values?: Record<string, string | number | Date>) => string;
  const wrapped = Object.assign((key: string, values?: Record<string, string | number | Date>) => t(`errors.${key}`, values), { tree: messages, locale });
  cache.set(locale, wrapped);
  return wrapped;
}

/** English, for text that is stored or logged as well as shown. */
export function enErrors(): ErrT {
  return errorsT(DEFAULT_LOCALE);
}

/** The locale an ErrT speaks (errorsT attaches it). */
export function localeOf(t: ErrT): Locale {
  const l = (t as ErrT & { locale?: unknown }).locale;
  return isLocale(l) ? l : DEFAULT_LOCALE;
}

/** The current request's language; outside a request, the given person's own language, else English. */
export async function currentLocale(person?: { prefs?: unknown; role?: string | null; id?: string; resellerId?: string | null } | null): Promise<Locale> {
  try {
    const { requestLocale } = await import("@/i18n/request");
    return await requestLocale();
  } catch (err) {
    // Next's own signals (a page turning dynamic while prerendering) must go through.
    const { unstable_rethrow } = await import("next/navigation");
    unstable_rethrow(err);
    if (!person) return DEFAULT_LOCALE;
    const { localeForUser } = await import("@/i18n/server-locale");
    return localeForUser(person).catch(() => DEFAULT_LOCALE);
  }
}

/** errorsT for the current request (see currentLocale). */
export async function requestErrorsT(person?: Parameters<typeof currentLocale>[0]): Promise<ErrT> {
  return errorsT(await currentLocale(person));
}

/** "a, b, c" in English (as the studio always wrote it), the language's own list style otherwise. */
export function joinList(parts: string[], locale: Locale): string {
  return locale === DEFAULT_LOCALE ? parts.join(", ") : new Intl.ListFormat(locale, { type: "conjunction" }).format(parts);
}

/** Separate sentences: with a space, except in languages written without spaces. */
export function joinSentences(parts: string[], locale: Locale): string {
  return parts.join(locale === "ja" || locale === "zh-Hans" ? "" : " ");
}

/**
 * A stored message in the given language; nested messages in its values are
 * translated too, and a list of messages becomes "a, b and c".
 */
export function renderMsg(msg: ErrMsg, t: ErrT): string {
  const values: Record<string, string | number | Date> = {};
  for (const [k, v] of Object.entries(msg.values ?? {})) {
    values[k] = Array.isArray(v) ? joinList(v.map((m) => renderMsg(m, t)), localeOf(t)) : v && typeof v === "object" && !(v instanceof Date) ? renderMsg(v, t) : v;
  }
  return t(msg.key, values);
}

export function isErrMsg(v: unknown): v is ErrMsg {
  return Boolean(v && typeof v === "object" && typeof (v as { key?: unknown }).key === "string");
}

/** An error whose message people read: English in `message` (logs), translatable through `msg`. */
export class LocalizedError extends Error {
  constructor(
    readonly msg: ErrMsg,
    readonly status = 400,
  ) {
    super(renderMsg(msg, enErrors()));
  }
}

/** The error's message in the given language when it carries one (LocalizedError and friends), else as it is. */
export function errorText(err: unknown, t: ErrT, fallback = ""): string {
  const msg = (err as { msg?: unknown } | null)?.msg;
  if (isErrMsg(msg)) return renderMsg(msg, t);
  return err instanceof Error ? err.message || fallback : fallback;
}

/**
 * A form problem from a zod schema whose own messages are written "@group.key"
 * (a key in errors.json): the message in `t`'s language. Zod's built-in
 * messages (technical English) become "Check the form and try again."
 */
export function issueText(message: string | undefined, t: ErrT): string {
  return message?.startsWith("@") ? t(message.slice(1)) : t("common.checkForm");
}
