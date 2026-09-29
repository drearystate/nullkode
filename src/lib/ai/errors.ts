/**
 * AI errors are written for the person who runs the server ("…in Admin →
 * Settings"). Everyone else gets a message they can act on themselves.
 */
export function aiErrorFor(user: { role?: string | null } | null | undefined, err: unknown, fallback = "Something went wrong. Please try again."): string {
  const message = err instanceof Error ? err.message : typeof err === "string" ? err : fallback;
  if (user?.role === "ADMIN") return message;
  if (/ran out of room/i.test(message)) return "That was a lot for the AI to do in one go. Try asking for a smaller change, like one section at a time.";
  if (/Admin\s*→\s*Settings|API key|model ID|output limit|context size/i.test(message)) {
    return "The AI isn't available right now. Please try again later. If it keeps happening, let the people who run this site know.";
  }
  return message;
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
