import { db } from "@/lib/db";
import { flushEmailStats, readStoredEmailSettings, refreshEmailConfig } from "@/lib/mailer";
import { setSetting, SETTING_KEYS } from "@/lib/settings";
import { json } from "@/lib/utils";
import { EmailSettingsBody, apiT, emailSettingsView, requireAdmin, validateEmailSettings } from "./_lib";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Email settings for Admin > Settings > Email (passwords and keys masked). */
export async function GET() {
  const a = await requireAdmin();
  if ("error" in a) return a.error;
  await flushEmailStats().catch(() => {});
  return json(await emailSettingsView(a.user.email));
}

/** Saves the email settings. Blank password or key fields keep the saved ones. */
export async function PUT(req: Request) {
  const a = await requireAdmin();
  if ("error" in a) return a.error;
  const parsed = EmailSettingsBody.safeParse(await req.json().catch(() => null));
  const t = await apiT();
  if (!parsed.success) return json({ error: t("checkEmailSettings") }, { status: 400 });
  const checked = validateEmailSettings(parsed.data, await readStoredEmailSettings(), t);
  if ("error" in checked) return json({ error: checked.error }, { status: 400 });
  for (const [key, value] of Object.entries(checked.values)) await setSetting(key, value);
  await refreshEmailConfig();
  return json({ ok: true, ...(await emailSettingsView(a.user.email)) });
}

/** Removes the saved email settings; the server's .env (if any) applies again. */
export async function DELETE() {
  const a = await requireAdmin();
  if ("error" in a) return a.error;
  await db.setting.deleteMany({ where: { key: { startsWith: "email." }, NOT: { key: SETTING_KEYS.EMAIL_STATS } } });
  await refreshEmailConfig();
  return json({ ok: true, ...(await emailSettingsView(a.user.email)) });
}
