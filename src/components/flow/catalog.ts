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

/** Plain headings for the step groups in the "Add step" list. */
export const CATEGORY_LABELS: Record<CatalogEntry["category"], string> = {
  Trigger: "Start",
  Data: "Saved data",
  Logic: "Decisions and values",
  Integration: "Send and connect",
  AI: "AI",
  Auth: "Accounts",
  Response: "Finish",
};

export type CatalogEntry = {
  type: string;
  label: string;
  icon: LucideIcon;
  iconColor: string;
  category: "Trigger" | "Data" | "Logic" | "Integration" | "AI" | "Auth" | "Response";
  defaults: Record<string, unknown>;
  summary: (data: Record<string, unknown>) => string;
};

export const NODE_CATALOG: CatalogEntry[] = [
  {
    type: "trigger",
    label: "When the app calls this",
    icon: Zap,
    iconColor: "text-amber-400",
    category: "Trigger",
    defaults: { label: "When the app calls this" },
    summary: () => "Starts here",
  },
  {
    type: "query",
    label: "Find records",
    icon: Search,
    iconColor: "text-sky-400",
    category: "Data",
    defaults: { label: "Find records", limit: 100 },
    summary: (d) => (d.table ? `From ${friendlyTable(d.table)}` : "No table selected"),
  },
  {
    type: "insert",
    label: "Add a record",
    icon: Plus,
    iconColor: "text-emerald-400",
    category: "Data",
    defaults: { label: "Add a record" },
    summary: (d) => (d.table ? `Into ${friendlyTable(d.table)}` : "No table selected"),
  },
  {
    type: "update",
    label: "Change records",
    icon: Pencil,
    iconColor: "text-amber-300",
    category: "Data",
    defaults: { label: "Change records" },
    summary: (d) => (d.table ? `In ${friendlyTable(d.table)}` : "No table selected"),
  },
  {
    type: "delete",
    label: "Delete records",
    icon: Trash2,
    iconColor: "text-red-400",
    category: "Data",
    defaults: { label: "Delete records" },
    summary: (d) => (d.table ? `From ${friendlyTable(d.table)}` : "No table selected"),
  },
  {
    type: "sheets_read",
    label: "Read a Google Sheet",
    icon: FileSpreadsheet,
    iconColor: "text-green-400",
    category: "Data",
    defaults: { label: "Read a Google Sheet" },
    summary: (d) => (d.sheet ? `Sheet ${d.sheet}` : "No sheet"),
  },
  {
    type: "sheets_append",
    label: "Add a row to a Google Sheet",
    icon: FileSpreadsheet,
    iconColor: "text-green-300",
    category: "Data",
    defaults: { label: "Add a row to a Google Sheet" },
    summary: (d) => (d.sheet ? `Sheet ${d.sheet}` : "No sheet"),
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
    summary: (d) => (d.name ? `${d.name} = ${String(d.value ?? "")}` : "Unnamed"),
  },
  {
    type: "parse_json",
    label: "Read data from text",
    icon: Braces,
    iconColor: "text-indigo-300",
    category: "Logic",
    defaults: { label: "Read data from text" },
    summary: (d) => (d.output ? `→ ${d.output}` : "Turn text into data"),
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
    summary: (d) => `${d.seconds ?? 0}s`,
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
    summary: (d) => (d.output ? `→ ${d.output}` : "Run your own code"),
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
    summary: (d) => (d.to ? `To ${d.to}` : "No recipient"),
  },
  {
    type: "send_push",
    label: "Send a notification",
    icon: Bell,
    iconColor: "text-amber-300",
    category: "Integration",
    defaults: { label: "Send notification", title: "", body: "", url: "" },
    summary: (d) => (d.title ? `“${String(d.title).slice(0, 40)}”` : "To everyone subscribed"),
  },
  {
    type: "ai_prompt",
    label: "Ask AI",
    icon: Sparkles,
    iconColor: "text-brand-300",
    category: "AI",
    defaults: { label: "Ask AI" },
    summary: (d) => (d.output ? `→ ${d.output}` : "Ask AI a question"),
  },
  {
    type: "hash_password",
    label: "Protect a password",
    icon: Lock,
    iconColor: "text-rose-400",
    category: "Auth",
    defaults: { label: "Protect a password", output: "hash" },
    summary: (d) => (d.input ? `${d.input} → ${d.output ?? "hash"}` : "Protect a password before saving it"),
  },
  {
    type: "verify_password",
    label: "Check a password",
    icon: ShieldCheck,
    iconColor: "text-emerald-400",
    category: "Auth",
    defaults: { label: "Check a password", output: "verified" },
    summary: (d) =>
      d.plain ? `${d.plain} vs ${d.hash ?? "?"} → ${d.output ?? "verified"}` : "Check a password",
  },
  {
    type: "set_session",
    label: "Sign the person in",
    icon: LogIn,
    iconColor: "text-sky-300",
    category: "Auth",
    defaults: { label: "Sign the person in" },
    summary: (d) => (d.userId ? `Sign in ${d.userId}` : "Sign user in"),
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
    summary: () => "Sign user out",
  },
  {
    type: "lookup",
    label: "Look up a related record",
    icon: Link2,
    iconColor: "text-violet-400",
    category: "Data",
    defaults: { label: "Look up a related record", lookupField: "id", as: "related" },
    summary: (d) => d.lookupTable ? `From ${friendlyTable(d.lookupTable)}` : "Add details from another list",
  },
  {
    type: "aggregate",
    label: "Count or add up records",
    icon: BarChart3,
    iconColor: "text-orange-400",
    category: "Data",
    defaults: { label: "Count or add up records", aggregate: "COUNT(*)", limit: 100 },
    summary: (d) => d.table ? `From ${friendlyTable(d.table)}` : "Count or add up records",
  },
  {
    type: "bulk_insert",
    label: "Add many rows",
    icon: CopyPlus,
    iconColor: "text-emerald-300",
    category: "Data",
    defaults: { label: "Add many rows" },
    summary: (d) => d.table ? `Into ${friendlyTable(d.table)}` : "Add many rows at once",
  },
  {
    type: "bulk_update",
    label: "Change many rows",
    icon: Pencil,
    iconColor: "text-amber-200",
    category: "Data",
    defaults: { label: "Change many rows" },
    summary: (d) => d.table ? `In ${friendlyTable(d.table)}` : "Update many rows at once",
  },
  {
    type: "bulk_delete",
    label: "Delete many rows",
    icon: CopyMinus,
    iconColor: "text-red-300",
    category: "Data",
    defaults: { label: "Delete many rows" },
    summary: (d) => d.table ? `From ${friendlyTable(d.table)}` : "Delete many rows at once",
  },
  {
    type: "check_role",
    label: "Check what the person may do",
    icon: Shield,
    iconColor: "text-amber-400",
    category: "Auth",
    defaults: { label: "Check what the person may do", output: "roleOk" },
    summary: (d) => d.role ? `Needs: ${d.role}` : "Check what the person may do",
  },
  {
    type: "response",
    label: "Reply",
    icon: Reply,
    iconColor: "text-teal-400",
    category: "Response",
    defaults: { label: "Reply", status: 200, body: "{}", bodyFields: {} },
    summary: (d) => {
      const fields = (d.bodyFields as Record<string, unknown> | undefined) ?? {};
      const count = Object.keys(fields).length;
      return count === 0 ? "Sends a reply" : `Replies with ${count} value${count === 1 ? "" : "s"}`;
    },
  },
];
