// pnpm native:web — builds the NullKode Native engine (native-runtime/, an
// Expo app with its own npm lockfile) for the browser and puts it in
// public/nk-native/web, where /nk-native/web?app=<app.json URL> serves it
// (the studio's phone preview and scripts/native-fidelity.ts use it).
// The build output is not committed (.gitignore).
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const engine = join(root, "native-runtime");
const run = (cmd, args) => execFileSync(cmd, args, { cwd: engine, stdio: "inherit", env: { ...process.env, CI: "1", EXPO_NO_TELEMETRY: "1" } });

// The engine keeps a copy of the spec contract; the server's is the source.
const spec = join(root, "src", "lib", "native", "spec.ts");
const copy = join(engine, "src", "spec.ts");
if (!existsSync(copy) || readFileSync(copy, "utf8") !== readFileSync(spec, "utf8")) {
  copyFileSync(spec, copy);
  console.log("native-runtime/src/spec.ts updated from src/lib/native/spec.ts");
}
if (!existsSync(join(engine, "node_modules", "expo"))) run("npm", ["ci", "--no-audit", "--no-fund"]);
run("npx", ["tsc", "--noEmit"]);
run("npx", ["expo", "export", "--platform", "web", "--output-dir", "dist-web", "--clear"]);
run("node", ["scripts/copy-web.mjs"]);
