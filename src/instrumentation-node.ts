import { removeSampleLogins } from "./lib/app-admin";
import { backfillHostLabels } from "./lib/app-hosts";

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
