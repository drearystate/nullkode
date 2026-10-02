import { Bell,
  Zap,
  Search,
  Plus,
  Pencil,
  Trash2,
  FileSpreadsheet,
  GitBranch,
  Variable,
  Globe,
  Reply,
  Mail,
  Sparkles,
  Clock,
  Braces,
  Calculator,
  Code2,
  Lock,
  ShieldCheck,
  KeyRound,
  LogIn,
  LogOut,
  Link2,
  Shield,
  CopyPlus,
  CopyMinus,
  BarChart3,
  type LucideIcon,
} from "lucide-react";

/**
 * Shows an app table's name in plain words: "bookings_bookings" → "Bookings",
 * "contact_form_submissions" → "Contact form submissions". Features prefix
 * their tables with the feature's id, which often repeats the table name.
 */
export function friendlyTable(name: unknown): string {
  const raw = String(name ?? "").trim();
  if (!raw || raw.includes("{{")) return raw;
  let words = raw.split(/[_\s-]+/).filter(Boolean).map((w) => w.toLowerCase());
  words = words.filter((w, i) => i === 0 || w !== words[i - 1]);
  if (words.length > 1 && words[0] === "auth") words = words.slice(1);
  const text = words.join(" ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Message keys (flows.categories.*) for the step groups in the "Add step" list. */
export const CATEGORY_LABELS: Record<CatalogEntry["category"], string> = {
  Trigger: "trigger",
  Data: "data",
  Logic: "logic",
  Integration: "integration",
  AI: "ai",
  Auth: "auth",
  Response: "response",
};

/** A translator for the "flows" messages (useTranslations("flows")). */
export type FlowsT = (key: string, values?: Record<string, string | number>) => string;

export type CatalogEntry = {
  type: string;
  /**
   * The step's English name, saved as a new step's name. Shown in the
   * studio's language via flows.catalog.<type>.label (with .help as its
   * hover tip); see stepLabel().
   */
  label: string;
  icon: LucideIcon;
  iconColor: string;
  category: "Trigger" | "Data" | "Logic" | "Integration" | "AI" | "Auth" | "Response";
  defaults: Record<string, unknown>;
  summary: (data: Record<string, unknown>, t: FlowsT) => string;
};

export const NODE_CATALOG: CatalogEntry[] = [
  {
    type: "trigger",
    label: "When the app calls this",
    icon: Zap,
    iconColor: "text-amber-400",
    category: "Trigger",
    defaults: { label: "When the app calls this" },
    summary: (_d, t) => t("summary.startsHere"),
  },
  {
    type: "query",
    label: "Find records",
    icon: Search,
    iconColor: "text-sky-400",
    category: "Data",
    defaults: { label: "Find records", limit: 100 },
    summary: (d, t) => (d.table ? t("summary.from", { table: friendlyTable(d.table) }) : t("summary.noTable")),
  },
  {
    type: "insert",
    label: "Add a record",
    icon: Plus,
    iconColor: "text-emerald-400",
    category: "Data",
    defaults: { label: "Add a record" },
    summary: (d, t) => (d.table ? t("summary.into", { table: friendlyTable(d.table) }) : t("summary.noTable")),
  },
  {
    type: "update",
    label: "Change records",
    icon: Pencil,
    iconColor: "text-amber-300",
    category: "Data",
    defaults: { label: "Change records" },
    summary: (d, t) => (d.table ? t("summary.in", { table: friendlyTable(d.table) }) : t("summary.noTable")),
  },
  {
    type: "delete",
    label: "Delete records",
    icon: Trash2,
    iconColor: "text-red-400",
    category: "Data",
    defaults: { label: "Delete records" },
    summary: (d, t) => (d.table ? t("summary.from", { table: friendlyTable(d.table) }) : t("summary.noTable")),
  },
  {
    type: "sheets_read",
    label: "Read a Google Sheet",
    icon: FileSpreadsheet,
    iconColor: "text-green-400",
    category: "Data",
    defaults: { label: "Read a Google Sheet" },
    summary: (d, t) => (d.sheet ? t("summary.sheet", { sheet: String(d.sheet) }) : t("summary.noSheet")),
  },
  {
    type: "sheets_append",
    label: "Add a row to a Google Sheet",
    icon: FileSpreadsheet,
    iconColor: "text-green-300",
    category: "Data",
    defaults: { label: "Add a row to a Google Sheet" },
    summary: (d, t) => (d.sheet ? t("summary.sheet", { sheet: String(d.sheet) }) : t("summary.noSheet")),
  },
  {
    type: "branch",
    label: "If this, otherwise that",
    icon: GitBranch,
    iconColor: "text-fuchsia-400",
    category: "Logic",
    defaults: { label: "If this, otherwise that", op: "==" },
    summary: (d) => `${d.left ?? "?"} ${d.op ?? "=="} ${d.right ?? "?"}`,
  },
  {
    type: "set",
    label: "Remember a value",
    icon: Variable,
    iconColor: "text-brand-300",
    category: "Logic",
    defaults: { label: "Remember a value" },
    summary: (d, t) => (d.name ? `${d.name} = ${String(d.value ?? "")}` : t("summary.unnamed")),
  },
  {
    type: "parse_json",
    label: "Read data from text",
    icon: Braces,
    iconColor: "text-indigo-300",
    category: "Logic",
    defaults: { label: "Read data from text" },
    summary: (d, t) => (d.output ? `→ ${d.output}` : t("summary.parseJson")),
  },
  {
    type: "math",
    label: "Do a sum",
    icon: Calculator,
    iconColor: "text-cyan-300",
    category: "Logic",
    defaults: { label: "Do a sum", op: "+" },
    summary: (d) => `${d.left ?? "?"} ${d.op ?? "+"} ${d.right ?? "?"}`,
  },
  {
    type: "delay",
    label: "Wait",
    icon: Clock,
    iconColor: "text-slate-300",
    category: "Logic",
    defaults: { label: "Wait", seconds: 2 },
    summary: (d, t) => t("summary.seconds", { seconds: Number(d.seconds ?? 0) }),
  },
  {
    type: "custom_js",
    label: "Custom code",
    icon: Code2,
    iconColor: "text-lime-300",
    category: "Logic",
    defaults: {
      label: "Custom code",
      code: "// Write JavaScript here. You have access to:\n//   vars    — object of all flow variables (read/write)\n//   trigger — the incoming payload (read-only)\n// Whatever you `return` is stored in the output variable below.\nreturn { hello: 'world' };",
      output: "result",
    },
    summary: (d, t) => (d.output ? `→ ${d.output}` : t("summary.customJs")),
  },
  {
    type: "http_request",
    label: "Call another website",
    icon: Globe,
    iconColor: "text-blue-400",
    category: "Integration",
    defaults: { label: "Call another website", method: "GET" },
    summary: (d) => `${d.method ?? "GET"} ${d.url ?? ""}`,
  },
  {
    type: "email",
    label: "Send an email",
    icon: Mail,
    iconColor: "text-pink-400",
    category: "Integration",
    defaults: { label: "Send an email" },
    summary: (d, t) => (d.to ? t("summary.to", { to: String(d.to) }) : t("summary.noRecipient")),
  },
  {
    type: "send_push",
    label: "Send a notification",
    icon: Bell,
    iconColor: "text-amber-300",
    category: "Integration",
    defaults: { label: "Send notification", title: "", body: "", url: "" },
    summary: (d, t) => (d.title ? t("summary.pushTitle", { title: String(d.title).slice(0, 40) }) : t("summary.pushEveryone")),
  },
  {
    type: "ai_prompt",
    label: "Ask AI",
    icon: Sparkles,
    iconColor: "text-brand-300",
    category: "AI",
    defaults: { label: "Ask AI" },
    summary: (d, t) => (d.output ? `→ ${d.output}` : t("summary.askAi")),
  },
  {
    type: "hash_password",
    label: "Protect a password",
    icon: Lock,
    iconColor: "text-rose-400",
    category: "Auth",
    defaults: { label: "Protect a password", output: "hash" },
    summary: (d, t) => (d.input ? `${d.input} → ${d.output ?? "hash"}` : t("summary.protectPassword")),
  },
  {
    type: "verify_password",
    label: "Check a password",
    icon: ShieldCheck,
    iconColor: "text-emerald-400",
    category: "Auth",
    defaults: { label: "Check a password", output: "verified" },
    summary: (d, t) =>
      d.plain ? t("summary.verifyVs", { plain: String(d.plain), hash: String(d.hash ?? "?"), output: String(d.output ?? "verified") }) : t("summary.checkPassword"),
  },
  {
    type: "set_session",
    label: "Sign the person in",
    icon: LogIn,
    iconColor: "text-sky-300",
    category: "Auth",
    defaults: { label: "Sign the person in" },
    summary: (d, t) => (d.userId ? t("summary.signIn", { user: String(d.userId) }) : t("summary.signUserIn")),
  },
  {
    type: "get_session",
    label: "Who is signed in",
    icon: KeyRound,
    iconColor: "text-amber-300",
    category: "Auth",
    defaults: { label: "Who is signed in", output: "session" },
    summary: (d) => `→ ${d.output ?? "session"}`,
  },
  {
    type: "clear_session",
    label: "Sign the person out",
    icon: LogOut,
    iconColor: "text-slate-400",
    category: "Auth",
    defaults: { label: "Sign the person out" },
    summary: (_d, t) => t("summary.signUserOut"),
  },
  {
    type: "lookup",
    label: "Look up a related record",
    icon: Link2,
    iconColor: "text-violet-400",
    category: "Data",
    defaults: { label: "Look up a related record", lookupField: "id", as: "related" },
    summary: (d, t) => d.lookupTable ? t("summary.from", { table: friendlyTable(d.lookupTable) }) : t("summary.lookupFallback"),
  },
  {
    type: "aggregate",
    label: "Count or add up records",
    icon: BarChart3,
    iconColor: "text-orange-400",
    category: "Data",
    defaults: { label: "Count or add up records", aggregate: "COUNT(*)", limit: 100 },
    summary: (d, t) => d.table ? t("summary.from", { table: friendlyTable(d.table) }) : t("summary.aggregateFallback"),
  },
  {
    type: "bulk_insert",
    label: "Add many rows",
    icon: CopyPlus,
    iconColor: "text-emerald-300",
    category: "Data",
    defaults: { label: "Add many rows" },
    summary: (d, t) => d.table ? t("summary.into", { table: friendlyTable(d.table) }) : t("summary.bulkInsertFallback"),
  },
  {
    type: "bulk_update",
    label: "Change many rows",
    icon: Pencil,
    iconColor: "text-amber-200",
    category: "Data",
    defaults: { label: "Change many rows" },
    summary: (d, t) => d.table ? t("summary.in", { table: friendlyTable(d.table) }) : t("summary.bulkUpdateFallback"),
  },
  {
    type: "bulk_delete",
    label: "Delete many rows",
    icon: CopyMinus,
    iconColor: "text-red-300",
    category: "Data",
    defaults: { label: "Delete many rows" },
    summary: (d, t) => d.table ? t("summary.from", { table: friendlyTable(d.table) }) : t("summary.bulkDeleteFallback"),
  },
  {
    type: "check_role",
    label: "Check what the person may do",
    icon: Shield,
    iconColor: "text-amber-400",
    category: "Auth",
    defaults: { label: "Check what the person may do", output: "roleOk" },
    summary: (d, t) => d.role ? t("summary.needsRole", { role: String(d.role) }) : t("summary.checkRoleFallback"),
  },
  {
    type: "response",
    label: "Reply",
    icon: Reply,
    iconColor: "text-teal-400",
    category: "Response",
    defaults: { label: "Reply", status: 200, body: "{}", bodyFields: {} },
    summary: (d, t) => {
      const fields = (d.bodyFields as Record<string, unknown> | undefined) ?? {};
      const count = Object.keys(fields).length;
      return count === 0 ? t("summary.reply") : t("summary.repliesWith", { count });
    },
  },
];

/**
 * A step's name in the studio's language: a name the owner chose stays as
 * they wrote it; a default name (saved in English) shows translated.
 */
export function stepLabel(type: string, label: unknown, t: FlowsT): string {
  const entry = NODE_CATALOG.find((c) => c.type === type);
  const name = typeof label === "string" ? label : "";
  if (entry && (!name || name === entry.label || name === entry.defaults.label)) return t(`catalog.${entry.type}.label`);
  return name || type;
}
