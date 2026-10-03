// Copies the web export (dist-web) into NullKode's public/nk-native/web,
// where /nk-native/web/?app=<app.json URL> serves it (the studio preview).
import { cpSync, existsSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const from = join(here, "..", "dist-web");
const to = join(here, "..", "..", "public", "nk-native", "web");
if (!existsSync(join(from, "index.html"))) {
  console.error("No web export found in dist-web. Run: npx expo export --platform web --output-dir dist-web");
  process.exit(1);
}
rmSync(to, { recursive: true, force: true });
cpSync(from, to, { recursive: true });
console.log(`Copied the web build to ${to}`);
