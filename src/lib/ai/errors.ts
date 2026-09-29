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
