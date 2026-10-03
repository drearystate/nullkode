import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import type { NativeNode } from "../spec";
import type { Behaviour } from "../render/behaviours";
import { followHref } from "../render/behaviours";
import type { RenderContext } from "../render/context";
import { toStyle } from "../render/style";
import { dataChanged } from "./bus";
import { fillAll, intlLocale, rowsOf, runFlow, safeUrl, themeOf, tr, uiFont } from "./kit";

/**
 * data-nk-calendar: the native twin of the web runtime's calendar
 * (RUNTIME_JS "Calendar primitive"): a month grid of the rows its flows
 * return, with the same attributes:
 *   data-nk-calendar="month" | "week" (week: the seven days of one week, one row each)
 *   data-nk-flow / data-nk-bind-flow (from data-nk-calendar-flow-ref), data-nk-date-field
 *   (default "date"), data-nk-end-field, data-nk-title-field (default "title"),
 *   data-nk-color (a source's colour), data-nk-color-field (a field hashed to a palette colour),
 *   data-nk-label (legend), data-nk-href-template ("/events?id={id}"), data-nk-refresh (ms)
 * and several sources (children with data-nk-calendar-source), which the
 * compiler keeps as JSON in data-nk-cal-sources (the web runtime replaces
 * them with the grid). Navigation: previous / today / next (data-nk-cal-nav
 * on the web). Calendars load again after any form on the page is sent.
 */

const CAL_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#06b6d4", "#8b5cf6", "#ec4899", "#84cc16", "#f97316", "#14b8a6"];

function calHash(s: unknown): number {
  let h = 0;
  const str = String(s ?? "");
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function colorFor(val: unknown, primary: string): string {
  if (val == null || val === "") return primary;
  return CAL_COLORS[calHash(val) % CAL_COLORS.length];
}

type Source = { flowId: string; color: string; label: string; dateField: string; titleField: string; endField: string; hrefTpl: string };
type Item = { row: Record<string, unknown>; src: Source; date: Date };

export function calendarSources(nk: Record<string, string>): Source[] {
  const rootDate = nk["data-nk-date-field"] || "date";
  const rootTitle = nk["data-nk-title-field"] || "title";
  const rootEnd = nk["data-nk-end-field"] || "";
  const out: Source[] = [];
  const selfFlow = nk["data-nk-bind-flow"] || nk["data-nk-flow"] || nk["data-nk-calendar-flow-ref"] || nk["data-nk-bind-flow-ref"];
  if (selfFlow) {
    out.push({ flowId: selfFlow, color: nk["data-nk-color"] || "", label: nk["data-nk-label"] || "", dateField: rootDate, titleField: rootTitle, endField: rootEnd, hrefTpl: nk["data-nk-href-template"] || "" });
  }
  try {
    const extra = JSON.parse(nk["data-nk-cal-sources"] || "[]") as Array<Partial<Source>>;
    for (const s of extra) {
      if (!s.flowId) continue;
      out.push({
        flowId: s.flowId,
        color: s.color || "",
        label: s.label || "",
        dateField: s.dateField || rootDate,
        titleField: s.titleField || rootTitle,
        endField: s.endField || rootEnd,
        hrefTpl: s.hrefTpl || nk["data-nk-href-template"] || "",
      });
    }
  } catch {
    /* no extra sources */
  }
  return out;
}

function parseDate(v: unknown): Date | null {
  if (v == null || v === "") return null;
  const d = new Date(v as string);
  return isNaN(d.getTime()) ? null : d;
}

const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

function Calendar({ node, ctx }: { node: NativeNode; ctx: RenderContext }) {
  const nk = node.nk ?? {};
  const week = nk["data-nk-calendar"] === "week";
  const sources = useMemo(() => calendarSources(nk), [nk]);
  const [items, setItems] = useState<Item[] | null>(null);
  const [cursor, setCursor] = useState(() => new Date());
  const th = themeOf(ctx.app);
  const loc = intlLocale(ctx.app);
  const font = uiFont(ctx);
  const bold = uiFont(ctx, 700);

  const load = useCallback(async () => {
    const lists = await Promise.all(
      sources.map((s) =>
        runFlow(ctx, s.flowId)
          .then((r) => rowsOf(r.body))
          .catch(() => []),
      ),
    );
    const all: Item[] = [];
    lists.forEach((rows, i) => {
      for (const row of rows) {
        const d = parseDate(row[sources[i].dateField]);
        if (d) all.push({ row, src: sources[i], date: d });
      }
    });
    setItems(all);
  }, [ctx, sources]);

  useEffect(() => {
    void load();
    const off = dataChanged.on(() => void load());
    const every = parseInt(nk["data-nk-refresh"] || "0", 10);
    const t = every > 0 ? setInterval(() => void load(), Math.max(every, 2000)) : null;
    return () => {
      off();
      if (t) clearInterval(t);
    };
  }, [load, nk]);

  const buckets = useMemo(() => {
    const b = new Map<string, Item[]>();
    for (const it of items ?? []) {
      const k = dayKey(it.date);
      b.set(k, [...(b.get(k) ?? []), it]);
    }
    return b;
  }, [items]);

  const colorOf = (it: Item) => it.src.color || (nk["data-nk-color-field"] ? colorFor(it.row[nk["data-nk-color-field"]], th.primary) : "") || colorFor(it.src.label || it.src.flowId, th.primary);
  const open = (it: Item) => {
    if (!it.src.hrefTpl) return;
    const href = safeUrl(fillAll(it.src.hrefTpl, it.row));
    if (href && href !== "#") followHref(href, ctx);
  };
  const titleOf = (it: Item) => String(it.row[it.src.titleField] ?? "") || tr(ctx.app, "untitled", "(untitled)");

  const move = (dir: "prev" | "next" | "today") => {
    if (dir === "today") return setCursor(new Date());
    const c = cursor;
    const step = dir === "prev" ? -1 : 1;
    setCursor(week ? new Date(c.getFullYear(), c.getMonth(), c.getDate() + 7 * step) : new Date(c.getFullYear(), c.getMonth() + step, 1));
  };

  const dow = useMemo(() => {
    const en = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    if (!loc) return en;
    try {
      // 1 Jan 2023 was a Sunday.
      return en.map((_, i) => new Date(2023, 0, 1 + i).toLocaleDateString(loc, { weekday: "short" }));
    } catch {
      return en;
    }
  }, [loc]);

  const today = new Date();
  const weekStart = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() - cursor.getDay());
  let title: string;
  try {
    title = week
      ? `${weekStart.toLocaleDateString(loc, { day: "numeric", month: "short" })} – ${new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 6).toLocaleDateString(loc, { day: "numeric", month: "short", year: "numeric" })}`
      : cursor.toLocaleDateString(loc, { month: "long", year: "numeric" });
  } catch {
    title = `${cursor.getFullYear()}-${cursor.getMonth() + 1}`;
  }

  const legend = sources.filter((s) => s.label);
  const btn = { borderWidth: 1, borderColor: th.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 } as const;
  const btnText = { color: th.text, fontSize: 13.5, ...font };
  const outer = toStyle(node.style, node.vh, ctx);
  // The compiled grid's height was the web's; the native grid sizes itself.
  delete outer.height;
  delete outer.minHeight;

  const header = (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderColor: th.border, gap: 8 }}>
      <Text testID="nk-cal-title" style={{ color: th.text, fontSize: 16.5, flexShrink: 1, ...bold }} numberOfLines={1}>
        {title}
      </Text>
      <View style={{ flexDirection: "row", gap: 6 }}>
        <Pressable testID="nk-cal-prev" accessibilityRole="button" accessibilityLabel={week ? tr(ctx.app, "native.previousWeek", "Previous week") : tr(ctx.app, "previousMonth", "Previous month")} onPress={() => move("prev")} style={btn}>
          <Text style={btnText}>{ctx.page.dir === "rtl" ? "›" : "‹"}</Text>
        </Pressable>
        <Pressable testID="nk-cal-today" accessibilityRole="button" onPress={() => move("today")} style={btn}>
          <Text style={btnText}>{tr(ctx.app, "today", "Today")}</Text>
        </Pressable>
        <Pressable testID="nk-cal-next" accessibilityRole="button" accessibilityLabel={week ? tr(ctx.app, "native.nextWeek", "Next week") : tr(ctx.app, "nextMonth", "Next month")} onPress={() => move("next")} style={btn}>
          <Text style={btnText}>{ctx.page.dir === "rtl" ? "‹" : "›"}</Text>
        </Pressable>
      </View>
    </View>
  );

  const legendRow = legend.length ? (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, paddingHorizontal: 14, paddingVertical: 8, borderBottomWidth: 1, borderColor: th.border }}>
      {legend.map((s, i) => (
        <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
          <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: s.color || colorFor(s.label, th.primary) }} />
          <Text style={{ color: th.muted, fontSize: 12.5, ...font }}>{s.label}</Text>
        </View>
      ))}
    </View>
  ) : null;

  const chip = (it: Item, i: number, big = false) => (
    <Pressable key={i} onPress={it.src.hrefTpl ? () => open(it) : undefined} accessibilityRole={it.src.hrefTpl ? "link" : undefined} style={{ backgroundColor: colorOf(it), borderRadius: 5, paddingHorizontal: big ? 8 : 3, paddingVertical: big ? 5 : 1.5 }}>
      <Text numberOfLines={1} style={{ color: "#fff", fontSize: big ? 14 : 9.5, ...font }}>
        {big ? `${timeOf(it, loc)}${titleOf(it)}` : titleOf(it)}
      </Text>
    </Pressable>
  );

  let body;
  if (week) {
    body = (
      <View>
        {Array.from({ length: 7 }, (_, d) => {
          const day = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + d);
          const list = (buckets.get(dayKey(day)) ?? []).slice().sort((a, b) => a.date.getTime() - b.date.getTime());
          const isToday = sameDay(day, today);
          return (
            <View key={d} style={{ flexDirection: "row", gap: 10, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: d < 6 ? 1 : 0, borderColor: th.border }}>
              <View style={{ width: 46, alignItems: "center" }}>
                <Text style={{ color: th.muted, fontSize: 11, textTransform: "uppercase", ...font }}>{dow[d]}</Text>
                <View style={isToday ? { backgroundColor: th.primary, borderRadius: 999, width: 28, height: 28, alignItems: "center", justifyContent: "center" } : { height: 28, justifyContent: "center" }}>
                  <Text style={{ color: isToday ? "#fff" : th.text, fontSize: 15, ...bold }}>{day.getDate()}</Text>
                </View>
              </View>
              <View style={{ flex: 1, gap: 4, justifyContent: "center" }}>{list.map((it, i) => chip(it, i, true))}</View>
            </View>
          );
        })}
      </View>
    );
  } else {
    const y = cursor.getFullYear();
    const m = cursor.getMonth();
    const gridStart = new Date(y, m, 1 - new Date(y, m, 1).getDay());
    body = (
      <View>
        <View style={{ flexDirection: "row" }}>
          {dow.map((d, i) => (
            <View key={i} style={{ width: `${100 / 7}%`, paddingVertical: 7, borderBottomWidth: 1, borderColor: th.border, backgroundColor: th.bg, alignItems: "center" }}>
              <Text style={{ color: th.muted, fontSize: 10, letterSpacing: 0.8, textTransform: "uppercase", ...font }}>{d}</Text>
            </View>
          ))}
        </View>
        {Array.from({ length: 6 }, (_, w) => (
          <View key={w} style={{ flexDirection: "row" }}>
            {Array.from({ length: 7 }, (_, d) => {
              const cell = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + w * 7 + d);
              const list = buckets.get(dayKey(cell)) ?? [];
              const isToday = sameDay(cell, today);
              return (
                <View
                  key={d}
                  testID={isToday ? "nk-cal-today-cell" : undefined}
                  style={{ width: `${100 / 7}%`, minHeight: 70, padding: 3, gap: 3, borderBottomWidth: 1, borderEndWidth: d < 6 ? 1 : 0, borderColor: th.border, backgroundColor: th.surface, opacity: cell.getMonth() === m ? 1 : 0.45 }}
                >
                  <View style={isToday ? { backgroundColor: th.primary, borderRadius: 999, width: 22, height: 22, alignItems: "center", justifyContent: "center" } : null}>
                    <Text style={{ color: isToday ? "#fff" : th.muted, fontSize: 11.5, ...font }}>{cell.getDate()}</Text>
                  </View>
                  {list.slice(0, 3).map((it, i) => chip(it, i))}
                  {list.length > 3 ? <Text style={{ color: th.muted, fontSize: 10, ...font }}>{tr(ctx.app, "moreCount", "+{count} more", { count: list.length - 3 })}</Text> : null}
                </View>
              );
            })}
          </View>
        ))}
      </View>
    );
  }

  return (
    <View
      testID="nk-calendar"
      style={[
        outer as never,
        { backgroundColor: th.surface, borderWidth: 1, borderColor: th.border, borderRadius: Math.min(th.radius, 16), overflow: "hidden" },
      ]}
    >
      {header}
      {legendRow}
      {body}
      {items && items.length === 0 ? (
        <Text style={{ padding: 24, textAlign: "center", color: th.muted, fontSize: 14, ...font }}>{tr(ctx.app, "nothingScheduled", "Nothing scheduled yet. Add an item to see it on the calendar.")}</Text>
      ) : null}
    </View>
  );
}

function timeOf(it: Item, loc: string | undefined): string {
  const v = it.row[it.src.dateField];
  // Dates without a time ("2026-10-03") show no time.
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) return "";
  try {
    return `${it.date.toLocaleTimeString(loc, { timeStyle: "short" })}  `;
  } catch {
    return "";
  }
}

export const CALENDAR_BEHAVIOURS: Behaviour[] = [
  {
    attr: "data-nk-calendar",
    phase: 2,
    // Before bound lists: a calendar also carries data-nk-bind-flow.
    priority: 20,
    render: (_v, node, ctx) => <Calendar node={node} ctx={ctx} />,
  },
];
