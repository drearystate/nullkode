/**
 * Writes messages/en/guides.json from the Help guides (src/lib/help/guides.ts),
 * so the guides can be translated like the rest of the studio
 * (scripts/i18n-translate.ts, area "guides"). Run it after changing a guide;
 * scripts/check-guides.ts fails while the file is out of date.
 *
 * Run: pnpm guides:messages   (or: npx tsx scripts/build-guide-messages.ts)
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { allGuideMessages, nest } from "../src/lib/help/guide-messages";

const file = path.join(process.cwd(), "messages", "en", "guides.json");
const messages = allGuideMessages();
const next = JSON.stringify(nest(messages), null, 2) + "\n";
let prev = "";
try {
  prev = readFileSync(file, "utf8");
} catch {
  /* first run */
}
const where = path.relative(process.cwd(), file);
if (prev === next) console.log(`guides:messages: ${where} is up to date (${Object.keys(messages).length} messages).`);
else {
  writeFileSync(file, next);
  console.log(`guides:messages: wrote ${Object.keys(messages).length} messages to ${where}.`);
}
