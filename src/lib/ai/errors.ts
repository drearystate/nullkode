import type { Locale } from "@/i18n/locales";
import { translator } from "./i18n";

/**
 * The AI's own error messages are English (they are logged too). The ones
 * people see are shown in their language (errors.ai.*); anything else stays
 * as it was written. Values captured from the message (a page title, a
 * time) are kept as they are.
 */
const AI_TEXT: Array<[RegExp, string, string[]]> = [
  [/^The AI request was cancelled\.$/, "cancelled", []],
  [/^The AI request was cancelled or took too long\.$/, "cancelledOrSlow", []],
  [/^The AI stopped responding \(no output for (\d+)s\), so the request was stopped\. On slow hardware, raise (\w+) or use a smaller model\.$/, "stalledHint", ["seconds", "setting"]],
  [/^The AI stopped responding \(no output for (\d+)s\), so the request was stopped\.$/, "stalled", ["seconds"]],
  [/^The AI request failed\. Please try again; if it keeps failing, check the AI connection in Admin → Settings\.$/, "requestFailed", []],
  [/^The AI returned no answer after a retry\. Please try again or simplify the request\.$/, "noAnswer", []],
  [/^The AI has hit its usage limit for now\. It resets around (.+?)\. Please try again later\.$/, "usageLimitResets", ["time"]],
  [/^The AI has hit its usage limit for now\. Please try again later\.$/, "usageLimit", []],
  [/^AI authentication failed on the server — the site owner needs to re-connect the AI account\.$/, "authFailed", []],
  [/^This page is too large for the AI to process in one request\.$/, "pageTooLarge", []],
  [/^The AI ran out of room before finishing its answer\. Try a smaller request, or raise the output limit or context size in Admin → Settings\.$/, "outOfRoom", []],
  [/^The AI returned an empty answer\. Check the model name and its output limit in Admin → Settings\.$/, "emptyCheckModel", []],
  [/^The AI returned an empty answer\. Please try again\.$/, "empty", []],
  [/^The AI returned an unreadable answer for the plan step\. Please try again\.$/, "unreadablePlan", []],
  [/^The AI returned an unreadable answer for the design plan step\. Please try again\.$/, "unreadableDesignPlan", []],
  [/^The AI returned an unreadable answer for the flow "(.+)" step\. Please try again\.$/, "unreadableFlow", ["flow"]],
  [/^The AI returned an unreadable answer for the (.+) step\. Please try again\.$/, "unreadableStep", ["step"]],
  [/^The AI couldn't produce the "(.+)" page\. Please try again\.$/, "pageFailed", ["title"]],
  [/^The AI's answer couldn't be used \(it had no page HTML\)\. Please try again\.$/, "noPageHtml", []],
  [/^AI returned invalid JSON: ([\s\S]*)$/, "invalidJson", ["detail"]],
  [/^This request is too large for the AI model's context \((\d+)K tokens\)\. Use a model with a larger context, raise its context size, or ask for a smaller change\.$/, "contextTooSmall", ["size"]],
  [/^Add your AI API key in Admin → Settings, or connect a local AI server\.$/, "addApiKey", []],
  [/^Enter the exact model ID served by your AI endpoint in Admin → Settings\.$/, "enterModelId", []],
  [/^No content returned from AI$/, "noContent", []],
  [/^Scaffold produced no pages$/, "noPages", []],
];

/** An AI error message in the given language, when it is one of the AI's own messages; otherwise as it is. */
export function localizeAiText(text: string, locale: Locale | undefined): string {
  if (!locale || locale === "en") return text;
  for (const [re, key, names] of AI_TEXT) {
    const m = re.exec(text);
    if (m) return translator(locale, "errors")(`ai.${key}`, Object.fromEntries(names.map((n, i) => [n, m[i + 1]])));
  }
  return text;
}

/**
 * AI errors are written for the person who runs the server ("…in Admin →
 * Settings"). Everyone else gets a message they can act on themselves.
 */
export function aiErrorFor(
  user: { role?: string | null } | null | undefined,
  err: unknown,
  fallback = "Something went wrong. Please try again.",
  /** The two replacement messages in the person's language (ai.errors.tooBig / ai.errors.unavailable), and that language. */
  words: AiErrorWords = {
    tooBig: "That was a lot for the AI to do in one go. Try asking for a smaller change, like one section at a time.",
    unavailable: "The AI isn't available right now. Please try again later. If it keeps happening, let the people who run this site know.",
  },
): string {
  const message = err instanceof Error ? err.message : typeof err === "string" ? err : fallback;
  if (user?.role === "ADMIN") return localizeAiText(message, words.locale);
  if (/ran out of room/i.test(message)) return words.tooBig;
  if (/Admin\s*→\s*Settings|API key|model ID|output limit|context size/i.test(message)) {
    return words.unavailable;
  }
  return localizeAiText(message, words.locale);
}

export type AiErrorWords = { tooBig: string; unavailable: string; locale?: Locale };

/** aiErrorFor's replacement messages (and language) from a translator for the "ai" messages. */
export function aiErrorWords(t: ((key: string) => string) & { locale?: Locale }): AiErrorWords {
  return { tooBig: t("errors.tooBig"), unavailable: t("errors.unavailable"), locale: t.locale };
}

/**
 * The model answered, but the answer couldn't be used (unreadable JSON, no
 * usable HTML, an empty or cut-off reply). Kept apart from provider and
 * server failures because a person can provoke this kind on purpose, so its
 * refunds are capped (see refundFailedAi in lib/ai-quota.ts).
 */
export class UnusableOutputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnusableOutputError";
  }
}

/**
 * How a failed AI action is refunded:
 *  - "failed": the provider, the network or the server failed, or the
 *    request never reached the model. Always refunded.
 *  - "unusable": the model answered but the answer was unusable. Refunded
 *    a few times a day per person.
 */
export type AiFailureKind = "failed" | "unusable";

const UNUSABLE_MESSAGE =
  /couldn't be used|could not be used|unreadable answer|invalid JSON|not usable|invalid HTML|empty answer|ran out of room|couldn't produce|truncated too early|produced no pages|returned no scaffold|without producing any pages/i;

export function classifyAiFailure(err: unknown): AiFailureKind {
  if (err instanceof UnusableOutputError) return "unusable";
  if (err instanceof SyntaxError) return "unusable";
  if (err && typeof err === "object" && (err as { name?: unknown }).name === "ZodError") return "unusable";
  const message = err instanceof Error ? err.message : typeof err === "string" ? err : "";
  return UNUSABLE_MESSAGE.test(message) ? "unusable" : "failed";
}
