/**
 * One person's data in an app's built-in database: find it, download it,
 * erase it. One routine serves the app's own "Download my data" and "Delete
 * my account" (the person, signed in), the public delete-account page (by
 * email, after the emailed link or the owner's approval), and the owner's
 * privacy desk in the Data tab.
 *
 * How rows are tied to a person:
 *  - "linked": their account row (auth_users), and rows that point at the
 *    account: created_by (filled in when a flow read the session), user_id
 *    and the other session-filled columns modules use.
 *  - "contact": rows whose email column (or, for the owner, phone column)
 *    exactly matches: a booking, a message, an order made with their email.
 *  - "mentions" (owner searches only): other rows whose text contains the
 *    email or phone. Listed for the owner to check; never changed.
 *
 * Erasing deletes linked rows. Contact rows are other people's business
 * records too (a shop keeps its orders), so when the person erases their own
 * account those rows are kept with their personal details blanked; the owner
 * can choose, per table, to delete them or blank them. Workflow run logs that
 * mention the person's email have their saved input and output cleared.
 *
 * Only the platform's own database is read or changed. Google Sheets and
 * outside databases are listed for the owner to check by hand. Files people
 * uploaded (public/uploads) are shared between apps and are not deleted;
 * erasing clears the links to them.
 */
import JSZip from "jszip";
import { Pool, type PoolClient } from "pg";
import type { Project } from "@prisma/client";
import { db } from "./db";
import { projectSchemaName } from "./datasources/postgres";
import { columnLabel, tableLabel } from "./data-labels";
import { SENSITIVE_COLUMN } from "./sensitive";
import { appPublicUrl } from "./reseller";

const IDENT = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
/** Columns modules fill with the signed-in person's account id. */
const USER_REF = /^(created_by|user_id|owner_user_id|from_user_id|to_user_id|saver_user_id)$/i;
const EMAIL_COLUMN = /e-?mail/i;
const PHONE_COLUMN = /phone|mobile|(^|_)(tel|telephone|cell|whatsapp|sms)(_|$)/i;
/** Columns blanked when a row is kept but the person's details are removed. */
const PERSONAL_COLUMN =
  /(^|_)(e-?mail|email_address|phone|mobile|tel|telephone|cell|whatsapp|name|names|first_?name|last_?name|full_?name|surname|nickname|display_?name|username|address\d?|street|city|postcode|post_code|postal_code|zip|zipcode|dob|birthday|birth_?date|ip|ip_address|user_agent|avatar|avatar_url|photo|photo_url|picture|bio|about|message|body|notes?|comments?|signature|resume|cv|file|file_url|attachment|document|instagram|twitter|facebook|linkedin|website|company|job_title|location|lat|lng|latitude|longitude)(_|$)/i;
const KEEP_ALWAYS = new Set(["id", "created_at", "updated_at"]);
const ACCOUNT_TABLE = "auth_users";
const ROW_CAP = 10_000;
const SAMPLE_ROWS = 20;

export type EraseMode = "self" | "email" | "owner";
export type PersonQuery = { userId?: string | null; email?: string | null; phone?: string | null };

export class PersonError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
  }
}

const g = globalThis as unknown as { __nkPersonPool?: Pool };
function pool(): Pool {
  if (!g.__nkPersonPool) g.__nkPersonPool = new Pool({ connectionString: process.env.DATABASE_URL, max: 3 });
  return g.__nkPersonPool;
}

function q(name: string): string {
  if (!IDENT.test(name)) throw new PersonError("That table or column name isn't allowed.");
  return `"${name}"`;
}

export function normalizeEmail(raw: string | null | undefined): string | null {
  const s = (raw ?? "").trim().toLowerCase();
  return s.length >= 3 && s.length <= 320 && /^[^\s@]+@[^\s@]+$/.test(s) ? s : null;
}

export function phoneDigits(raw: string | null | undefined): string | null {
  const d = (raw ?? "").replace(/\D/g, "");
  return d.length >= 6 && d.length <= 20 ? d : null;
}

/* ── The app's tables ────────────────────────────────────────── */

type Col = { name: string; type: string };
type Table = { name: string; label: string; tableId: string | null; cols: Col[] };
type Tables = { schema: string; tables: Table[]; outside: OutsideTable[] };
export type OutsideTable = { table: string; label: string; source: string; kind: string };

const isText = (c: Col) => c.type === "text" || c.type.startsWith("character") || c.type === "citext";
const isEmailCol = (c: Col) => isText(c) && EMAIL_COLUMN.test(c.name) && !SENSITIVE_COLUMN.test(c.name);
const isPhoneCol = (c: Col) => isText(c) && PHONE_COLUMN.test(c.name) && !SENSITIVE_COLUMN.test(c.name);
const has = (t: Table, name: string) => t.cols.some((c) => c.name === name);

async function loadTables(projectId: string, client: PoolClient | Pool = pool()): Promise<Tables> {
  const schema = projectSchemaName(projectId);
  const [meta, cols] = await Promise.all([
    db.dataTable.findMany({
      where: { datasource: { projectId } },
      include: { datasource: { select: { kind: true, name: true } } },
      orderBy: { createdAt: "asc" },
    }),
    client.query<{ table_name: string; column_name: string; data_type: string; udt_name: string }>(
      `SELECT c.table_name, c.column_name, c.data_type, c.udt_name
         FROM information_schema.columns c
         JOIN information_schema.tables t ON t.table_schema = c.table_schema AND t.table_name = c.table_name
        WHERE c.table_schema = $1 AND t.table_type = 'BASE TABLE'
        ORDER BY c.table_name, c.ordinal_position`,
      [schema],
    ),
  ]);
  const byName = new Map<string, Table>();
  for (const r of cols.rows) {
    if (!IDENT.test(r.table_name) || !IDENT.test(r.column_name)) continue;
    let t = byName.get(r.table_name);
    if (!t) {
      t = { name: r.table_name, label: tableLabel(r.table_name), tableId: null, cols: [] };
      byName.set(r.table_name, t);
    }
    t.cols.push({ name: r.column_name, type: r.udt_name === "citext" ? "citext" : r.data_type });
  }
  const outside: OutsideTable[] = [];
  for (const m of meta) {
    if (m.datasource.kind === "POSTGRES_INTERNAL") {
      const t = byName.get(m.name);
      if (t && !t.tableId) t.tableId = m.id;
    } else {
      outside.push({ table: m.name, label: tableLabel(m.name), source: m.datasource.name, kind: m.datasource.kind });
    }
  }
  // Tables the app's own records know about first, in the order they were made.
  const order = new Map(meta.map((m, i) => [m.name, i]));
  const tables = [...byName.values()].sort((a, b) => (order.get(a.name) ?? 1e6) - (order.get(b.name) ?? 1e6) || a.name.localeCompare(b.name));
  return { schema, tables, outside };
}

/** Where sign-ups are kept: the auth module's table, or an app's own "users" table with passwords. */
function accountTable(tables: Table[]): Table | null {
  const auth = tables.find((t) => t.name === ACCOUNT_TABLE && has(t, "id"));
  if (auth) return auth;
  return tables.find((t) => t.name === "users" && has(t, "id") && has(t, "email") && t.cols.some((c) => /password/i.test(c.name))) ?? null;
}

/* ── Who we're looking for ───────────────────────────────────── */

type Identity = {
  accountIds: string[];
  emails: string[];
  phone: string | null;
  /** The phone number as typed, for searching free text. */
  phoneText: string | null;
  account: Record<string, unknown> | null;
};

async function resolveIdentity(client: PoolClient | Pool, data: Tables, who: PersonQuery, mode: EraseMode): Promise<Identity> {
  const acct = accountTable(data.tables);
  const ident: Identity = { accountIds: [], emails: [], phone: null, phoneText: null, account: null };
  if (mode === "self") {
    // The signed-in person's own account, and nobody else's.
    if (!acct || !who.userId) return ident;
    const r = await client.query(`SELECT * FROM ${q(data.schema)}.${q(acct.name)} WHERE ${q("id")}::text = $1 LIMIT 1`, [String(who.userId)]);
    const row = r.rows[0] as Record<string, unknown> | undefined;
    if (!row) return ident;
    ident.account = row;
    ident.accountIds = [String(who.userId)];
    const email = normalizeEmail(typeof row.email === "string" ? row.email : null);
    if (email) ident.emails = [email];
    return ident;
  }
  const email = normalizeEmail(who.email);
  if (email) {
    ident.emails = [email];
    if (acct && has(acct, "email")) {
      const r = await client.query<{ id: string }>(
        `SELECT ${q("id")}::text AS id FROM ${q(data.schema)}.${q(acct.name)} WHERE lower(btrim(${q("email")}::text)) = $1`,
        [email],
      );
      ident.accountIds = r.rows.map((x) => x.id);
    }
  }
  if (mode === "owner") {
    ident.phone = phoneDigits(who.phone);
    if (ident.phone) ident.phoneText = (who.phone ?? "").trim();
  }
  return ident;
}

/* ── Matching rows ───────────────────────────────────────────── */

/** Adds a query parameter and returns its placeholder ($1, $2…). */
type Param = (value: unknown) => string;
/** A WHERE condition; each query builds it with its own parameter list. */
type Cond = (p: Param) => string;

/** A fresh parameter list for one query. */
function params(): { p: Param; values: unknown[] } {
  const values: unknown[] = [];
  return {
    values,
    p: (v) => {
      values.push(v);
      return `$${values.length}`;
    },
  };
}

type Match = {
  /** Rows tied to the account (deleted on erase). */
  link: Cond | null;
  /** Rows with the email or phone number. */
  contact: Cond | null;
  /** Other rows whose text mentions them. */
  mention: Cond | null;
  isAccount: boolean;
  contactCols: string[];
};

const anyOf = (parts: string[]) => `(${parts.map((x) => `coalesce(${x}, false)`).join(" OR ")})`;

function matchFor(t: Table, ident: Identity, acct: Table | null, opts: { pushEndpoint?: string | null; mentions?: boolean }): Match {
  const isAccount = Boolean(acct && acct.name === t.name);
  const refCols = t.cols.filter((c) => USER_REF.test(c.name)).map((c) => c.name);
  const byId = ident.accountIds.length > 0 && (isAccount || refCols.length > 0);
  const bySubscription = Boolean(opts.pushEndpoint) && t.cols.some((c) => c.name === "subscription" && isText(c));
  // Account rows are matched by id only: other accounts that happen to use
  // the same email are someone else's to delete.
  const emailCols = !isAccount && ident.emails.length ? t.cols.filter(isEmailCol).map((c) => c.name) : [];
  const phoneCols = !isAccount && ident.phone ? t.cols.filter(isPhoneCol).map((c) => c.name) : [];
  const contactCols = [...emailCols, ...phoneCols];

  const link: Cond | null =
    byId || bySubscription
      ? (p) => {
          const parts: string[] = [];
          if (byId) {
            const ids = p(ident.accountIds);
            if (isAccount) parts.push(`${q("id")}::text = ANY(${ids}::text[])`);
            for (const c of refCols) parts.push(`${q(c)}::text = ANY(${ids}::text[])`);
          }
          if (bySubscription) parts.push(`position(${p(opts.pushEndpoint)} in coalesce(${q("subscription")}::text, '')) > 0`);
          return anyOf(parts);
        }
      : null;

  const contact: Cond | null = contactCols.length
    ? (p) => {
        const parts: string[] = [];
        if (emailCols.length) {
          const emails = p(ident.emails);
          for (const c of emailCols) parts.push(`lower(btrim(${q(c)}::text)) = ANY(${emails}::text[])`);
        }
        if (phoneCols.length && ident.phone) {
          const digits = p(ident.phone);
          const last9 = ident.phone.length >= 9 ? p(ident.phone.slice(-9)) : null;
          for (const c of phoneCols) {
            const clean = `regexp_replace(${q(c)}::text, '[^0-9]', '', 'g')`;
            // The same number written with or without a country code or leading 0.
            parts.push(last9 ? `(${clean} = ${digits} OR (length(${clean}) >= 9 AND right(${clean}, 9) = ${last9}))` : `${clean} = ${digits}`);
          }
        }
        return anyOf(parts);
      }
    : null;

  let mention: Cond | null = null;
  if (opts.mentions) {
    const needles = [...ident.emails, ...(ident.phoneText && ident.phoneText.length >= 6 ? [ident.phoneText.toLowerCase()] : [])];
    const textCols = t.cols.filter((c) => isText(c) && !SENSITIVE_COLUMN.test(c.name) && !contactCols.includes(c.name)).map((c) => c.name);
    if (needles.length && textCols.length) {
      mention = (p) => {
        const n = p(needles);
        return `(${textCols.map((c) => `EXISTS (SELECT 1 FROM unnest(${n}::text[]) AS nk(v) WHERE position(nk.v in lower(coalesce(${q(c)}::text, ''))) > 0)`).join(" OR ")})`;
      };
    }
  }
  return { link, contact, mention, isAccount, contactCols };
}

/** A condition's SQL, or "false" when the table can't match that way. */
const sqlOf = (cond: Cond | null, p: Param) => (cond ? cond(p) : "(false)");

/** Values safe to send as JSON: dates as ISO text, big numbers as text. */
function clean(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if (SENSITIVE_COLUMN.test(k) || k.startsWith("__nk")) continue;
    out[k] = v instanceof Date ? v.toISOString() : typeof v === "bigint" ? v.toString() : Buffer.isBuffer(v) ? v.toString("base64") : v;
  }
  return out;
}

function visibleSelect(t: Table): { sql: string; cols: Col[] } {
  const cols = t.cols.filter((c) => !SENSITIVE_COLUMN.test(c.name));
  return { sql: cols.length ? cols.map((c) => q(c.name)).join(", ") : "1 AS __nk_none", cols };
}

/* ── Find ────────────────────────────────────────────────────── */

export type FoundTable = {
  table: string;
  label: string;
  tableId: string | null;
  /** Tied to their account: deleted on erase. */
  linked: number;
  /** Carry their email or phone: blanked (or, for the owner, deleted) on erase. */
  contact: number;
  isAccount: boolean;
  columns: Array<{ name: string; label: string }>;
  rows: Array<Record<string, unknown>>;
};

export type PersonFindings = {
  email: string | null;
  phone: string | null;
  accounts: number;
  tables: FoundTable[];
  /** Other rows whose text mentions them: for the owner to check, never changed. */
  mentions: Array<{ table: string; label: string; tableId: string | null; count: number }>;
  /** Google Sheets and outside databases: check these by hand. */
  outside: OutsideTable[];
  /** Workflow run logs that mention their email. */
  runLogs: number;
  summary: string;
};

function noun(label: string, n: number, isAccount: boolean): string {
  if (isAccount) return `${n} ${n === 1 ? "account" : "accounts"}`;
  let s = label.toLowerCase();
  if (n === 1) {
    if (/ies$/.test(s)) s = s.replace(/ies$/, "y");
    else if (/[^s]s$/.test(s) && !/(us|is)$/.test(s)) s = s.slice(0, -1);
  }
  return `${n} ${s}`;
}

export function summarize(tables: Array<Pick<FoundTable, "label" | "linked" | "contact" | "isAccount">>): string {
  const parts = tables.filter((t) => t.linked + t.contact > 0).map((t) => noun(t.label, t.linked + t.contact, t.isAccount));
  return parts.length ? parts.join(", ") : "Nothing found";
}

function runLogNeedles(ident: Identity): string[] {
  return [...ident.emails, ...(ident.phoneText && ident.phoneText.length >= 6 ? [ident.phoneText.toLowerCase()] : [])].filter((n) => n.length >= 5);
}

async function countRunLogs(projectId: string, needles: string[]): Promise<number> {
  if (!needles.length) return 0;
  const r = await db.$queryRaw<Array<{ n: bigint }>>`
    SELECT count(*)::bigint AS n FROM "FlowRun"
     WHERE "flowId" IN (SELECT "id" FROM "Flow" WHERE "projectId" = ${projectId})
       AND ("input" IS NOT NULL OR "output" IS NOT NULL)
       AND EXISTS (SELECT 1 FROM unnest(${needles}::text[]) AS nk(v)
                    WHERE position(nk.v in lower(coalesce("input"::text, '') || ' ' || coalesce("output"::text, ''))) > 0)`;
  return Number(r[0]?.n ?? 0);
}

/**
 * Everything the app's database holds about one person, grouped by table
 * ("3 bookings, 1 message, 1 account"), with up to 20 rows from each.
 */
export async function findUserRows(
  projectId: string,
  who: PersonQuery,
  opts: { mode?: EraseMode; mentions?: boolean; rowsPerTable?: number } = {},
): Promise<PersonFindings> {
  const mode = opts.mode ?? (who.userId ? "self" : "owner");
  const data = await loadTables(projectId);
  const ident = await resolveIdentity(pool(), data, who, mode);
  const acct = accountTable(data.tables);
  const found: FoundTable[] = [];
  const mentions: PersonFindings["mentions"] = [];
  const limit = Math.max(0, Math.min(ROW_CAP, opts.rowsPerTable ?? SAMPLE_ROWS));
  for (const t of data.tables) {
    const m = matchFor(t, ident, acct, { mentions: opts.mentions });
    const from = `${q(data.schema)}.${q(t.name)}`;
    if (m.link || m.contact) {
      const c = params();
      const counts = await pool().query<{ linked: string; contact: string }>(
        `SELECT count(*) FILTER (WHERE ${sqlOf(m.link, c.p)})::bigint AS linked,
                count(*) FILTER (WHERE NOT ${sqlOf(m.link, c.p)} AND ${sqlOf(m.contact, c.p)})::bigint AS contact
           FROM ${from} WHERE ${sqlOf(m.link, c.p)} OR ${sqlOf(m.contact, c.p)}`,
        c.values,
      );
      const linked = Number(counts.rows[0]?.linked ?? 0);
      const contact = Number(counts.rows[0]?.contact ?? 0);
      if (linked + contact > 0) {
        const { sql, cols } = visibleSelect(t);
        const order = has(t, "id") ? ` ORDER BY ${q("id")}` : "";
        const s = params();
        const rows = limit
          ? (await pool().query(`SELECT ${sql} FROM ${from} WHERE ${sqlOf(m.link, s.p)} OR ${sqlOf(m.contact, s.p)}${order} LIMIT ${limit}`, s.values)).rows
          : [];
        found.push({
          table: t.name,
          label: t.label,
          tableId: t.tableId,
          linked,
          contact,
          isAccount: m.isAccount,
          columns: cols.map((c) => ({ name: c.name, label: columnLabel(c.name) })),
          rows: rows.map(clean),
        });
      }
    }
    if (m.mention) {
      const x = params();
      const r = await pool().query<{ n: string }>(
        `SELECT count(*)::bigint AS n FROM ${from} WHERE NOT (${sqlOf(m.link, x.p)} OR ${sqlOf(m.contact, x.p)}) AND ${m.mention(x.p)}`,
        x.values,
      );
      const n = Number(r.rows[0]?.n ?? 0);
      if (n > 0) mentions.push({ table: t.name, label: t.label, tableId: t.tableId, count: n });
    }
  }
  // The account first, then the rest in table order.
  found.sort((a, b) => Number(b.isAccount) - Number(a.isAccount));
  return {
    email: ident.emails[0] ?? null,
    phone: ident.phone,
    accounts: found.find((t) => t.isAccount)?.linked ?? 0,
    tables: found,
    mentions,
    outside: data.outside,
    runLogs: await countRunLogs(projectId, runLogNeedles(ident)),
    summary: summarize(found),
  };
}

/* ── Download ────────────────────────────────────────────────── */

function csvCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  let s = typeof v === "object" ? JSON.stringify(v) : String(v);
  // Keep spreadsheet apps from running what someone typed as a formula.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(columns: Array<{ name: string; label: string }>, rows: Array<Record<string, unknown>>): string {
  const lines = [columns.map((c) => csvCell(c.label)).join(",")];
  for (const row of rows) lines.push(columns.map((c) => csvCell(row[c.name])).join(","));
  return "﻿" + lines.join("\r\n") + "\r\n";
}

const fileName = (s: string) => s.replace(/[^a-zA-Z0-9_.-]/g, "_").slice(0, 80) || "table";

/**
 * A .zip with a copy of one person's records: for each kind of record a
 * .json file and a .csv file (opens in a spreadsheet), plus a short note.
 * Password hashes and other secrets are never included.
 */
export async function exportUserData(
  projectId: string,
  who: PersonQuery,
  opts: { mode?: EraseMode; appName: string },
): Promise<{ zip: Buffer; findings: PersonFindings }> {
  const findings = await findUserRows(projectId, who, { mode: opts.mode, rowsPerTable: ROW_CAP });
  const zip = new JSZip();
  const when = new Date();
  const own = (opts.mode ?? (who.userId ? "self" : "owner")) === "self";
  const lines = [
    `${own ? "Your data" : "Data"} from ${opts.appName}`,
    "",
    `${own ? "This is a copy of the information the app keeps about you" : `This is a copy of the information the app keeps about ${findings.email ?? findings.phone ?? "this person"}`}, made on ${when.toUTCString()}.`,
    "Each kind of record has a .json file (for computers) and a .csv file (opens in a spreadsheet).",
    "",
    findings.tables.length ? "What's included:" : "Nothing was found.",
    ...findings.tables.map((t) => `- ${t.label}: ${t.linked + t.contact} ${t.linked + t.contact === 1 ? "record" : "records"} (${fileName(t.table)}.json, ${fileName(t.table)}.csv)`),
    "",
    "Passwords are never included.",
  ];
  zip.file("README.txt", lines.join("\n") + "\n");
  for (const t of findings.tables) {
    zip.file(`${fileName(t.table)}.json`, JSON.stringify(t.rows, null, 2));
    zip.file(`${fileName(t.table)}.csv`, toCsv(t.columns, t.rows));
  }
  const buf = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  return { zip: buf, findings };
}

/* ── Erase ───────────────────────────────────────────────────── */

export type EraseResult = {
  tables: Array<{ table: string; label: string; deleted: number; blanked: number; isAccount: boolean }>;
  accountsDeleted: number;
  runLogsCleared: number;
  summary: string;
};

/**
 * Erases one person from the app's database, all in one transaction:
 *  - mode "self": the signed-in person. Their account and linked rows are
 *    deleted; rows with their email are kept with personal details blanked.
 *    `pushEndpoint` also removes this device's push subscription.
 *  - mode "email": someone who proved the email is theirs (the emailed link)
 *    or whose request the owner approved. Every account with that email and
 *    its linked rows are deleted; email rows are blanked.
 *  - mode "owner": the owner's privacy desk. Linked and contact rows are
 *    deleted, except in `keep` tables, where contact rows are blanked.
 */
export async function eraseUser(
  projectId: string,
  who: PersonQuery,
  opts: { mode: EraseMode; keep?: string[]; pushEndpoint?: string | null },
): Promise<EraseResult> {
  const keep = new Set(opts.keep ?? []);
  const client = await pool().connect();
  const out: EraseResult["tables"] = [];
  let ident: Identity;
  try {
    await client.query("BEGIN");
    const data = await loadTables(projectId, client);
    ident = await resolveIdentity(client, data, who, opts.mode);
    const acct = accountTable(data.tables);
    for (const t of data.tables) {
      const m = matchFor(t, ident, acct, { pushEndpoint: opts.mode === "self" ? opts.pushEndpoint : null });
      if (!m.link && !m.contact) continue;
      const from = `${q(data.schema)}.${q(t.name)}`;
      const deleteContact = opts.mode === "owner" && !keep.has(t.name);
      let deleted = 0;
      if (m.link || (deleteContact && m.contact)) {
        const d = params();
        const where = [m.link ? m.link(d.p) : null, deleteContact && m.contact ? m.contact(d.p) : null].filter(Boolean).join(" OR ");
        deleted = (await client.query(`DELETE FROM ${from} WHERE ${where}`, d.values)).rowCount ?? 0;
      }
      let blanked = 0;
      if (!deleteContact && m.contact) {
        // Who added the row (a member of staff, say) isn't this person's to remove.
        const personal = t.cols.filter(
          (c) => !KEEP_ALWAYS.has(c.name) && !USER_REF.test(c.name) && (m.contactCols.includes(c.name) || PERSONAL_COLUMN.test(c.name) || SENSITIVE_COLUMN.test(c.name)),
        );
        if (personal.length) {
          const u = params();
          const upd = await client.query(`UPDATE ${from} SET ${personal.map((c) => `${q(c.name)} = NULL`).join(", ")} WHERE ${m.contact(u.p)}`, u.values);
          blanked = upd.rowCount ?? 0;
        }
      }
      if (deleted || blanked) out.push({ table: t.name, label: t.label, deleted, blanked, isAccount: m.isAccount });
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
  const runLogsCleared = await clearRunLogs(projectId, runLogNeedles(ident));
  const accountsDeleted = out.filter((t) => t.isAccount).reduce((n, t) => n + t.deleted, 0);
  return {
    tables: out,
    accountsDeleted,
    runLogsCleared,
    summary: summarize(out.map((t) => ({ label: t.label, linked: t.deleted, contact: t.blanked, isAccount: t.isAccount }))),
  };
}

async function clearRunLogs(projectId: string, needles: string[]): Promise<number> {
  if (!needles.length) return 0;
  // The row stays (schedules read the newest run); what was sent goes.
  return db.$executeRaw`
    UPDATE "FlowRun" SET "input" = NULL, "output" = NULL
     WHERE "flowId" IN (SELECT "id" FROM "Flow" WHERE "projectId" = ${projectId})
       AND ("input" IS NOT NULL OR "output" IS NOT NULL)
       AND EXISTS (SELECT 1 FROM unnest(${needles}::text[]) AS nk(v)
                    WHERE position(nk.v in lower(coalesce("input"::text, '') || ' ' || coalesce("output"::text, ''))) > 0)`;
}

/* ── Accounts ────────────────────────────────────────────────── */

/** The signed-in person's account row (secrets included, for checking the password), or null. */
export async function findAccount(projectId: string, userId: string): Promise<Record<string, unknown> | null> {
  const data = await loadTables(projectId);
  const acct = accountTable(data.tables);
  if (!acct) return null;
  const r = await pool().query(`SELECT * FROM ${q(data.schema)}.${q(acct.name)} WHERE ${q("id")}::text = $1 LIMIT 1`, [userId]);
  return (r.rows[0] as Record<string, unknown> | undefined) ?? null;
}

/** Whether anything in the app's database is tied to this email address. */
export async function hasDataFor(projectId: string, email: string): Promise<boolean> {
  const found = await findUserRows(projectId, { email }, { mode: "email", rowsPerTable: 0 });
  return found.tables.length > 0;
}

/**
 * The app's public "delete your account" page, e.g. for store listings:
 * `<app address>/delete-account` (a custom domain, the app's own subdomain,
 * or `<studio>/app/<slug>`).
 */
export async function deleteAccountUrl(project: Pick<Project, "id" | "slug" | "ownerId" | "hostLabel">): Promise<string> {
  return `${(await appPublicUrl(project)).replace(/\/$/, "")}/delete-account`;
}
