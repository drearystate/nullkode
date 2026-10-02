import { getTranslations } from "next-intl/server";
import { requestLocale } from "@/i18n/request";
import { renderMsg, requestErrorsT } from "@/lib/errors-i18n";
import { ownedProject } from "@/lib/guard";
import { emailEnabled } from "@/lib/mailer";
import { notifyVisitorInsert } from "@/lib/owner-alerts";
import { hitLimit } from "@/lib/rate-limit";
import { SENSITIVE_COLUMN } from "@/lib/sensitive";
import { setSetting } from "@/lib/settings";
import { json } from "@/lib/utils";
import { alertSettings, alertTables, testSettingKey, type AlertTable } from "../_lib";

export const dynamic = "force-dynamic";

const AUTO = new Set(["id", "created_at", "updated_at", "created_by"]);

type T = Awaited<ReturnType<typeof getTranslations<"project.alertsApi">>>;

/** A made-up row shaped like the table, clearly marked as a test. Nothing is saved. */
function sampleRow(table: AlertTable, tr: T): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  for (const c of table.columns) {
    const n = c.name.toLowerCase();
    const t = c.type.toLowerCase();
    if (AUTO.has(n) || SENSITIVE_COLUMN.test(n)) continue;
    if (/e_?mail/.test(n)) row[c.name] = "test.person@example.com";
    else if (/phone|mobile|tel|whatsapp/.test(n)) row[c.name] = "+1 555 0100";
    else if (/name/.test(n)) row[c.name] = tr("samplePerson");
    else if (/message|body|note|comment|description|details|question|request/.test(n)) row[c.name] = tr("sampleMessage");
    else if (/subject|title|topic/.test(n)) row[c.name] = tr("sampleSubject");
    else if (/status/.test(n)) row[c.name] = "new";
    else if (t.startsWith("timestamp") || t === "date" || /(_at|date|time)$/.test(n)) row[c.name] = t === "date" ? new Date().toISOString().slice(0, 10) : new Date().toISOString();
    else if (t === "integer" || t === "bigint" || t === "smallint" || t === "numeric" || t === "double precision" || t === "real" || t === "int" || t === "float") row[c.name] = 1;
    else if (t === "boolean" || t === "bool") row[c.name] = true;
    else if (t === "json" || t === "jsonb") continue;
    else row[c.name] = tr("sampleText");
  }
  if (!Object.keys(row).length) row.message = tr("sampleMessage");
  return row;
}

/**
 * "Send a test submission": emails the owner (and extra recipients) an alert
 * marked "(test)" for one of the app's form tables, exactly as a visitor's
 * submission would, without adding anything to the app's data.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const r = await ownedProject(id);
  if ("error" in r) return r.error;
  const t = await getTranslations({ locale: await requestLocale(), namespace: "project.alertsApi" });
  if (!emailEnabled()) return json({ ok: false, error: t("emailOff") }, { status: 409 });
  if (!hitLimit(`alerts-test:${id}`, 5, 60 * 60_000).ok) {
    return json({ ok: false, error: t("testLimit", { count: 5 }) }, { status: 429 });
  }
  const body = (await req.json().catch(() => ({}))) as { table?: unknown } | null;
  const settings = await alertSettings(id);
  const tables = await alertTables(id, settings);
  const wanted = typeof body?.table === "string" ? tables.find((t) => t.name === body.table) : undefined;
  const table = wanted ?? tables.find((t) => t.mode === "instant") ?? tables.find((t) => t.defaultMode === "instant");
  if (!table) {
    return json(
      { ok: false, error: tables.length ? t("allOff") : t("noTables") },
      { status: 400 },
    );
  }

  const result = await notifyVisitorInsert({ projectId: id, table: table.name, row: sampleRow(table, t), source: "test-submission" });
  if (result.ok) {
    await setSetting(testSettingKey(id), { at: new Date().toISOString(), table: table.name });
    const to = [r.user.email, ...settings.extraRecipients];
    return json({ ok: true, table: table.label, to });
  }
  if (result.skipped === "email-off") return json({ ok: false, error: t("emailOff") }, { status: 409 });
  if (result.skipped === "throttled") {
    return json({ ok: false, error: t("throttled", { count: 20 }) }, { status: 429 });
  }
  return json({ ok: false, error: result.errorMsg ? renderMsg(result.errorMsg, await requestErrorsT()) : (result.error ?? t("testFailed")) }, { status: 502 });
}
