/**
 * The app's tables as the Alerts card shows them: every table in the app's
 * own database, with the owner's on/off choice and what it would be by
 * default (tables that look like form submissions alert; chat, votes,
 * counters and sign-ins don't).
 */
import { getTranslations } from "next-intl/server";
import { requestLocale } from "@/i18n/request";
import { db } from "@/lib/db";
import { getSetting } from "@/lib/settings";
import { alertSettingKey, looksLikeSubmissionTable, normalizeAlertSettings, type AlertMode, type AlertSettings } from "@/lib/owner-alerts";

export const MAX_EXTRA = 3;
const IDENT = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

export type AlertTable = { name: string; label: string; mode: AlertMode; defaultMode: AlertMode; columns: Array<{ name: string; type: string }> };

export function testSettingKey(projectId: string) {
  return `alerts-test:${projectId}`;
}

/** `signedUp` is the (translated) label for the app's sign-up table. */
export function tableLabel(name: string, signedUp = "People who signed up") {
  if (name === "auth_users") return signedUp;
  const parts = name
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((w) => w.toLowerCase());
  const s = parts.filter((w, i) => i === 0 || w !== parts[i - 1]).join(" ");
  return s ? s[0].toUpperCase() + s.slice(1) : name;
}

export async function alertSettings(projectId: string): Promise<AlertSettings> {
  return normalizeAlertSettings(await getSetting(alertSettingKey(projectId)));
}

/** The app's built-in tables with their columns, oldest first. */
export async function alertTables(projectId: string, settings?: AlertSettings): Promise<AlertTable[]> {
  const s = settings ?? (await alertSettings(projectId));
  const t = await getTranslations({ locale: await requestLocale(), namespace: "project.alertsApi" });
  const tables = await db.dataTable.findMany({
    where: { datasource: { projectId, kind: "POSTGRES_INTERNAL" } },
    orderBy: { createdAt: "asc" },
    select: { name: true, schema: true },
  });
  const names = [...new Set(tables.map((t) => t.name).filter((n) => IDENT.test(n)))];
  const schema = `proj_${projectId.replace(/[^a-zA-Z0-9_]/g, "")}`;
  const cols = names.length
    ? await db.$queryRaw<Array<{ table_name: string; column_name: string; data_type: string }>>`
        SELECT table_name, column_name, data_type FROM information_schema.columns
         WHERE table_schema = ${schema} AND table_name = ANY(${names}::text[])
         ORDER BY table_name, ordinal_position`
    : [];
  const byTable = new Map<string, Array<{ name: string; type: string }>>();
  for (const c of cols) {
    const list = byTable.get(c.table_name) ?? [];
    list.push({ name: c.column_name, type: c.data_type });
    byTable.set(c.table_name, list);
  }
  return names.map((name) => {
    const fromDb = byTable.get(name);
    const fields = ((tables.find((t) => t.name === name)?.schema as { fields?: Array<{ name?: unknown; type?: unknown }> } | null)?.fields ?? [])
      .filter((f) => typeof f?.name === "string")
      .map((f) => ({ name: f.name as string, type: String(f.type ?? "text") }));
    const columns = fromDb ?? fields;
    const defaultMode: AlertMode = looksLikeSubmissionTable(name, columns.map((c) => c.name)) ? "instant" : "off";
    return { name, label: tableLabel(name, t("signedUpTable")), mode: s.tables[name] ?? defaultMode, defaultMode, columns };
  });
}
