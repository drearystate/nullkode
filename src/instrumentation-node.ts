import { installConsoleCapture } from "./lib/diagnostics";
import { removeSampleLogins } from "./lib/app-admin";
import { backfillHostLabels } from "./lib/app-hosts";
import { runBootSchemaCheck } from "./lib/schema-check";
import { startScheduler } from "./lib/flow/scheduler";

// Keep the latest warnings and errors (redacted) for Admin > System. First,
// so problems found below are captured too.
installConsoleCapture();

// Does the database have every column this version needs? A missing one
// (the database wasn't updated with the code) is logged loudly here, turns
// /api/health red and shows a banner on the admin page.
runBootSchemaCheck().catch((err) => console.error("[schema] startup check failed:", err instanceof Error ? err.message : err));

// Apps made before sample accounts were removed still have them; they share
// one published password, so take them out on every start (cheap, and a
// no-op once they're gone).
removeSampleLogins()
  .then((n) => { if (n) console.log(`[security] removed ${n} sample app login${n === 1 ? "" : "s"}`); })
  .catch((err) => console.error("[security] sample login clean-up failed:", err instanceof Error ? err.message : err));

// Every app gets a DNS-safe name for its own address under APPS_DOMAIN.
backfillHostLabels()
  .then((n) => { if (n) console.log(`[apps] gave ${n} app${n === 1 ? "" : "s"} a web address name`); })
  .catch((err) => console.error("[apps] address names failed:", err instanceof Error ? err.message : err));

// Scheduled flows and the nightly clean-up: a tick every minute, unless an
// outside timer calls /api/cron instead (NK_EXTERNAL_SCHEDULER=1).
startScheduler();

// Read the email settings (Admin > Settings > Email) now: emailEnabled()
// answers from this cache, so the first email after a restart isn't skipped.
import("./lib/mailer")
  .then((m) => m.loadEmailConfig())
  .catch((err) => console.error("[mailer] couldn't load email settings at startup:", err instanceof Error ? err.message : err));
