/**
 * Where to send someone after they sign in or sign up. The target comes from
 * the URL (?next=…), so anyone can craft it: only a path on this same site is
 * allowed, never another site ("//evil.com", "/\evil.com", "https://…"),
 * a script URL, or anything with control characters (browsers drop tabs and
 * newlines from URLs, which turns "/\t/evil.com" into "//evil.com").
 *
 * Shared by the server (login and signup pages) and the browser (the form).
 */

export const DEFAULT_NEXT = "/dashboard";

/** Longest target we keep; an idea handed over from the home page fits well inside it. */
export const MAX_NEXT_LENGTH = 4000;

export function safeNext(raw: unknown, fallback: string = DEFAULT_NEXT): string {
  if (typeof raw !== "string") return fallback;
  const next = raw.trim();
  if (!next || next.length > MAX_NEXT_LENGTH) return fallback;
  // A single leading slash: a path on this site.
  if (next[0] !== "/") return fallback;
  // "//host" and "/\host" are addresses on another site.
  if (next[1] === "/" || next[1] === "\\") return fallback;
  // Control characters (including tab, CR and LF) and backslashes anywhere.
  if (/[\u0000-\u001f\u007f\\]/.test(next)) return fallback;
  // Belt and braces: resolved against a placeholder origin, it must stay there.
  try {
    const base = "http://same-site.invalid";
    const url = new URL(next, base);
    if (url.origin !== base) return fallback;
  } catch {
    return fallback;
  }
  return next;
}

/** "/login?next=…" (or the bare path when there's nothing to carry over). */
export function withNext(path: string, next: string | null | undefined): string {
  const safe = next ? safeNext(next, "") : "";
  if (!safe || safe === DEFAULT_NEXT) return path;
  return `${path}${path.includes("?") ? "&" : "?"}next=${encodeURIComponent(safe)}`;
}

/** The idea carried in a "/new?idea=…" target, if there is one. */
export function ideaFromNext(next: string | null | undefined): string | null {
  if (!next) return null;
  try {
    const url = new URL(next, "http://same-site.invalid");
    if (url.pathname !== "/new") return null;
    const idea = url.searchParams.get("idea")?.trim();
    return idea ? idea : null;
  } catch {
    return null;
  }
}
