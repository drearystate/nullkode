import type { NativeApp } from "../spec";
import { intlLocale } from "./kit";

/**
 * Date and time field values as the web form sends them: "YYYY-MM-DD"
 * (date), "HH:MM" (time), "YYYY-MM-DDTHH:MM" (datetime-local), in the
 * phone's own time zone, like a browser's <input type=date|time|datetime-local>.
 */

export type DateKind = "date" | "time" | "datetime-local";

const pad = (n: number) => String(n).padStart(2, "0");

export function toFieldValue(kind: DateKind, d: Date): string {
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return kind === "date" ? date : kind === "time" ? time : `${date}T${time}`;
}

/** The field's value as a date (time-only values on today's date); null when empty or unreadable. */
export function fromFieldValue(kind: DateKind, v: string | undefined | null): Date | null {
  if (!v) return null;
  let m: RegExpExecArray | null;
  if (kind === "time" && (m = /^(\d{1,2}):(\d{2})/.exec(v))) {
    const d = new Date();
    d.setHours(Number(m[1]), Number(m[2]), 0, 0);
    return d;
  }
  if ((m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/.exec(v))) {
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4] ?? 0), Number(m[5] ?? 0));
  }
  return null;
}

/** How the field shows its value, in the app's language. */
export function displayValue(app: Pick<NativeApp, "locale">, kind: DateKind, v: string): string {
  const d = fromFieldValue(kind, v);
  if (!d) return v;
  const loc = intlLocale(app);
  try {
    if (kind === "date") return d.toLocaleDateString(loc, { dateStyle: "medium" });
    if (kind === "time") return d.toLocaleTimeString(loc, { timeStyle: "short" });
    return d.toLocaleString(loc, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return v;
  }
}
