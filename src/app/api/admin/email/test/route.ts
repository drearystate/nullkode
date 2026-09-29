import { getBrand } from "@/lib/brand";
import { configFromSettings, flushEmailStats, loadEmailConfig, readStoredEmailSettings, sendEmailWith } from "@/lib/mailer";
import { hitLimit } from "@/lib/rate-limit";
import { json } from "@/lib/utils";
import { EmailSettingsBody, requireAdmin, validateEmailSettings } from "../_lib";

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
  const limit = hitLimit(`email-test:${a.user.id}`, 5, 60 * 60_000);
  if (!limit.ok) {
    return json(
      { ok: false, error: `That's 5 test emails in the last hour. Please try again in ${Math.max(1, Math.ceil(limit.retryAfterSec / 60))} minutes.` },
      { status: 429, headers: { "retry-after": String(limit.retryAfterSec) } },
    );
  }
  const body = (await req.json().catch(() => ({}))) as { settings?: unknown } | null;

  let cfg;
  const onScreen = body && body.settings !== undefined && body.settings !== null;
  if (onScreen) {
    const parsed = EmailSettingsBody.safeParse(body.settings);
    if (!parsed.success) return json({ ok: false, error: "Please check the email settings and try again." }, { status: 400 });
    const saved = await readStoredEmailSettings();
    const checked = validateEmailSettings(parsed.data, saved);
    if ("error" in checked) return json({ ok: false, error: checked.error }, { status: 400 });
    cfg = configFromSettings({ ...saved, ...checked.values });
  } else {
    cfg = await loadEmailConfig(true);
  }
  if (!cfg.ready) return json({ ok: false, error: cfg.problem ?? "Email isn't set up yet." }, { status: 400 });

  const brand = await getBrand();
  const result = await sendEmailWith(
    cfg,
    {
      to: a.user.email,
      subject: `Test email from ${brand.appName}`,
      text: `Hello,\n\nThis is a test email from ${brand.appName}. If you can read it, email works: invitations, password links and app alerts will be sent from ${cfg.from}.\n\nYou don't need to reply.\n`,
      fromName: cfg.fromName || brand.appName,
    },
    // Only tests of the saved settings count towards the sent/failed numbers.
    !onScreen,
  );
  if (!onScreen) await flushEmailStats().catch(() => {});
  if (!result.ok) return json({ ok: false, error: result.error ?? "The email couldn't be sent." });
  return json({ ok: true, to: a.user.email });
}
