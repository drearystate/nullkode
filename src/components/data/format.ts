export type ColType = "text" | "int" | "float" | "bool" | "timestamp" | "date" | "json" | "other";
export type Column = { name: string; label: string; type: ColType; readOnly: boolean };
export type Row = Record<string, unknown>;

export type TableSummary = {
  id: string;
  name: string;
  label: string;
  sourceName: string;
  sourceKind: string;
  rows: number | null;
  editable: boolean;
  missing: boolean;
};

/**
 * The viewer's own time zone. Undefined on the server, so the request's zone
 * (the nk-tz cookie, else UTC) applies there and the server's HTML matches the
 * browser's once that cookie exists.
 */
export function viewerTimeZone(): string | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
  } catch {
    return undefined;
  }
}

/** What formatCell needs from the page's language: words for yes/no and a date formatter. */
export type CellWords = {
  yes: string;
  no: string;
  dateTime: (d: Date, opts: { dateStyle: "medium"; timeStyle?: "short"; timeZone?: string }) => string;
};

/** How a value reads in the grid (plain words, no raw ISO strings). */
export function formatCell(value: unknown, type: ColType, words: CellWords): string {
  if (value === null || value === undefined || value === "") return "";
  switch (type) {
    case "bool":
      return value === true || value === "true" ? words.yes : value === false || value === "false" ? words.no : String(value);
    case "timestamp": {
      const d = new Date(String(value));
      return Number.isNaN(d.getTime()) ? String(value) : words.dateTime(d, { dateStyle: "medium", timeStyle: "short", timeZone: viewerTimeZone() });
    }
    case "date": {
      const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value));
      return m ? words.dateTime(new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))), { dateStyle: "medium", timeZone: "UTC" }) : String(value);
    }
    case "json":
      return typeof value === "string" ? value : JSON.stringify(value);
    default:
      return typeof value === "object" ? JSON.stringify(value) : String(value);
  }
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** A value as the text an editor field starts with. */
export function toDraft(value: unknown, type: ColType): string {
  if (value === null || value === undefined) return "";
  if (type === "json") return JSON.stringify(value, null, 2);
  if (type === "bool") return value === true ? "true" : value === false ? "false" : String(value);
  if (type === "timestamp") {
    const d = new Date(String(value));
    if (Number.isNaN(d.getTime())) return "";
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  if (type === "date") return String(value).slice(0, 10);
  return typeof value === "object" ? JSON.stringify(value) : String(value);
}

/** Checks a draft; returns the problem's message key (data.table.*), or null when it's fine. */
export type DraftProblem = "invalidJson" | "wholeNumber" | "number";
export function draftProblem(draft: string, col: Column): DraftProblem | null {
  const s = draft.trim();
  if (!s) return null;
  if (col.type === "json") {
    try {
      JSON.parse(s);
    } catch {
      return "invalidJson";
    }
  }
  if (col.type === "int" && !/^-?\d+$/.test(s)) return "wholeNumber";
  if (col.type === "float" && !Number.isFinite(Number(s))) return "number";
  return null;
}

/** A draft as the value sent to the server. */
export function fromDraft(draft: string, type: ColType): unknown {
  if (type === "text") return draft;
  const s = draft.trim();
  if (!s) return null;
  if (type === "timestamp") {
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? s : d.toISOString();
  }
  return s;
}
