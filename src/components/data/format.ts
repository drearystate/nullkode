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

/** How a value reads in the grid (plain words, no raw ISO strings). */
export function formatCell(value: unknown, type: ColType): string {
  if (value === null || value === undefined || value === "") return "";
  switch (type) {
    case "bool":
      return value === true || value === "true" ? "Yes" : value === false || value === "false" ? "No" : String(value);
    case "timestamp": {
      const d = new Date(String(value));
      return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
    }
    case "date": {
      const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value));
      return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).toLocaleDateString(undefined, { dateStyle: "medium" }) : String(value);
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

/** Checks a draft; returns a plain-words problem, or null when it's fine. */
export function draftProblem(draft: string, col: Column): string | null {
  const s = draft.trim();
  if (!s) return null;
  if (col.type === "json") {
    try {
      JSON.parse(s);
    } catch {
      return "This isn't valid JSON yet.";
    }
  }
  if (col.type === "int" && !/^-?\d+$/.test(s)) return "Use a whole number.";
  if (col.type === "float" && !Number.isFinite(Number(s))) return "Use a number.";
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
