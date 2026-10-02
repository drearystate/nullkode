import { getBrand } from "@/lib/brand";
import { configFromSettings, flushEmailStats, loadEmailConfig, readStoredEmailSettings, sendEmailWith } from "@/lib/mailer";
import { hitLimit } from "@/lib/rate-limit";
import { json } from "@/lib/utils";
import { EmailSettingsBody, apiT, requireAdmin, validateEmailSettings } from "../_lib";
import { localeForUser } from "@/i18n/server-locale";
import { testEmail } from "@/lib/emails/studio";
import { renderMsg, requestErrorsT } from "@/lib/errors-i18n";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * "Send a test email to me": sends to the signed-in admin's own address and
 * answers with the real error in plain words. With `settings` in the body it
 * tests what is on screen before it is saved; without, the saved settings.
 */
export async function POST(req: Request) {
  const a = await requireAdmin();
  if ("error" in a) return a.error;
  const t = await apiT();
  const limit = hitLimit(`email-test:${a.user.id}`, 5, 60 * 60_000);
  if (!limit.ok) {
    return json(
      { ok: false, error: t("emailTestLimit", { minutes: Math.max(1, Math.ceil(limit.retryAfterSec / 60)) }) },
      { status: 429, headers: { "retry-after": String(limit.retryAfterSec) } },
    );
  }
  const body = (await req.json().catch(() => ({}))) as { settings?: unknown } | null;

  let cfg;
  const onScreen = body && body.settings !== undefined && body.settings !== null;
  if (onScreen) {
    const parsed = EmailSettingsBody.safeParse(body.settings);
    if (!parsed.success) return json({ ok: false, error: t("checkEmailSettings") }, { status: 400 });
    const saved = await readStoredEmailSettings();
    const checked = validateEmailSettings(parsed.data, saved, t);
    if ("error" in checked) return json({ ok: false, error: checked.error }, { status: 400 });
    cfg = configFromSettings({ ...saved, ...checked.values });
  } else {
    cfg = await loadEmailConfig(true);
  }
  if (!cfg.ready) return json({ ok: false, error: cfg.problemCode ? t(`emailProblem.${cfg.problemCode}`) : t("emailNotSetUp") }, { status: 400 });

  const brand = await getBrand();
  const mail = testEmail(await localeForUser(a.user), { app: brand.appName, from: cfg.from });
  const result = await sendEmailWith(
    cfg,
    {
      to: a.user.email,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
      fromName: cfg.fromName || brand.appName,
    },
    // Only tests of the saved settings count towards the sent/failed numbers.
    !onScreen,
  );
  if (!onScreen) await flushEmailStats().catch(() => {});
  if (!result.ok) return json({ ok: false, error: result.errorMsg ? renderMsg(result.errorMsg, await requestErrorsT()) : (result.error ?? t("emailNotSent")) });
  return json({ ok: true, to: a.user.email });
}
