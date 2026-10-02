"use client";
import { useEffect, useRef } from "react";
import { useFormatter, type DateTimeFormatOptions } from "next-intl";

type Unit = "second" | "minute" | "hour" | "day" | "week" | "month" | "quarter" | "year";

type Props = {
  value: Date | string | number;
  /** "dateTime" (default) formats with `options`; "relative" reads "5 minutes ago". */
  kind?: "dateTime" | "relative";
  options?: DateTimeFormatOptions;
  /** relative only: the moment to count from (default: now) and an optional fixed unit. */
  now?: Date | number;
  unit?: Unit;
  /** relative only: past this many milliseconds, show the date with `options` instead. */
  relativeWithin?: number;
  /** Text to show instead of a relative time when it is less than a minute ago. */
  justNow?: string;
  /** Tooltip: a fixed string, or formatting options for the same moment. */
  title?: string | DateTimeFormatOptions;
  className?: string;
};

/**
 * A date or time formatted in the studio's language. Node and the browser can
 * format the same date slightly differently (different ICU/CLDR data, a
 * different clock for "5 minutes ago", a different time zone before the
 * nk-tz cookie exists), so the server's text is accepted during hydration and
 * the browser's text replaces it right after.
 */
export function LocalTime({ value, kind = "dateTime", options, now, unit, relativeWithin, justNow, title, className }: Props) {
  const format = useFormatter();
  const ref = useRef<HTMLTimeElement>(null);
  const date = value instanceof Date ? value : new Date(value);
  const valid = !Number.isNaN(date.getTime());

  let text = valid ? "" : String(value);
  if (valid) {
    const from = now === undefined ? new Date() : new Date(now);
    const age = from.getTime() - date.getTime();
    if (kind === "relative" && (relativeWithin === undefined || age < relativeWithin)) {
      text = justNow && age < 60_000 ? justNow : format.relativeTime(date, { now: from, ...(unit ? { unit } : {}) });
    } else {
      text = format.dateTime(date, options ?? {});
    }
  }
  const tip = !valid || title === undefined ? undefined : typeof title === "string" ? title : format.dateTime(date, title);

  // After hydration, show what this browser would have rendered.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (el.textContent !== text) el.textContent = text;
    if (tip !== undefined && el.title !== tip) el.title = tip;
  }, [text, tip]);

  return (
    <time ref={ref} dateTime={valid ? date.toISOString() : undefined} title={tip} className={className} suppressHydrationWarning>
      {text}
    </time>
  );
}
