import type { SubscriptionStatus } from "@prisma/client";

/**
 * Labels, flags and the CSV format for a reseller's client list. No database
 * access, so the client list component can use it too (the loaders are in
 * src/lib/reseller-clients.ts).
 */

/** Subscriptions that count as paying clients. PAST_DUE is shown separately. */
export const PAYING_STATUSES: SubscriptionStatus[] = ["ACTIVE", "TRIALING"];

export function isPaying(status: SubscriptionStatus): boolean {
  return PAYING_STATUSES.includes(status);
}

export type AttentionFlag = "never-signed-in" | "no-app" | "ai-used-up" | "inactive" | "past-due";

export const ATTENTION: Record<AttentionFlag, { label: string; hint: string }> = {
  "never-signed-in": { label: "Invited, never signed in", hint: "Send them a new invitation link." },
  "no-app": { label: "No app after a day", hint: "They signed in but haven't made an app yet." },
  "ai-used-up": { label: "AI used up", hint: "They've used all the AI actions in their plan this month." },
  inactive: { label: "Not seen in 30 days", hint: "They haven't signed in for a month." },
  "past-due": { label: "Payment past due", hint: "Their last payment didn't go through." },
};

export const ATTENTION_ORDER: AttentionFlag[] = ["past-due", "never-signed-in", "no-app", "ai-used-up", "inactive"];

export type ClientRow = {
  id: string;
  name: string | null;
  email: string;
  plan: string;
  subscriptionStatus: SubscriptionStatus;
  paying: boolean;
  /** Invited (or signed up) but never signed in. */
  invited: boolean;
  suspended: boolean;
  apps: number;
  liveApps: number;
  aiUsed: number;
  /** Monthly AI actions the client's plan includes; null when unlimited. */
  aiLimit: number | null;
  createdAt: string;
  /** Last time they used the site: lastSeenAt, else their newest sign-in. */
  lastActiveAt: string | null;
  renewsAt: string | null;
  flags: AttentionFlag[];
};

export function statusLabel(row: Pick<ClientRow, "suspended" | "invited">): string {
  return row.suspended ? "Suspended" : row.invited ? "Invitation pending" : "Active";
}

export function paymentLabel(status: SubscriptionStatus): string {
  switch (status) {
    case "ACTIVE":
      return "Paying";
    case "TRIALING":
      return "Trial";
    case "PAST_DUE":
      return "Past due";
    case "CANCELED":
      return "Canceled";
    case "UNPAID":
      return "Unpaid";
    default:
      return "Not paying";
  }
}

export function planLabel(plan: string): string {
  return plan ? plan[0] + plan.slice(1).toLowerCase() : "";
}

/** One CSV cell. Cells that a spreadsheet would run as a formula get a leading quote. */
function csvCell(value: string | number | null | undefined): string {
  let text = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** The client list as CSV for Excel, Numbers or Google Sheets (UTF-8 with a BOM, Windows line endings). */
export function clientsCsv(rows: ClientRow[]): string {
  const header = [
    "Name", "Email", "Status", "Plan", "Payment", "Apps", "Live apps", "AI actions this month",
    "AI actions included", "Last active (UTC)", "Joined (UTC)", "Renews (UTC)", "Needs attention",
  ];
  const day = (iso: string | null) => (iso ? iso.slice(0, 10) : "");
  const moment = (iso: string | null) => (iso ? iso.slice(0, 16).replace("T", " ") : "");
  const lines = rows.map((r) =>
    [
      r.name ?? "",
      r.email,
      statusLabel(r),
      planLabel(r.plan),
      paymentLabel(r.subscriptionStatus),
      r.apps,
      r.liveApps,
      r.aiUsed,
      r.aiLimit === null ? "Unlimited" : r.aiLimit,
      moment(r.lastActiveAt),
      day(r.createdAt),
      day(r.renewsAt),
      r.flags.map((f) => ATTENTION[f].label).join("; "),
    ]
      .map(csvCell)
      .join(","),
  );
  return "\uFEFF" + [header.map(csvCell).join(","), ...lines].join("\r\n") + "\r\n";
}
