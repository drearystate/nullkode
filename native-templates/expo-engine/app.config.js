/**
 * NullKode build wrapper around the engine's own config (copied into each
 * build workspace and into the iOS project download as app.config.js; the
 * engine's own app.config.ts, if any, is copied next to it as
 * app.config.engine.ts).
 *
 * Per-app values come from a JSON file written by the NullKode server: the
 * file named by NK_APP_CONFIG, else ./nk-app.json when it exists. It holds a
 * partial Expo config ({ name, slug, version, ios, android, extra: { nk } }).
 * Without it, this is the plain engine.
 *
 * `extra.nk` is what the engine reads at run time
 * (Constants.expoConfig.extra.nk): { v, base, spec, projectId, slug, hosts };
 * `extra.appUrl` (= extra.nk.spec) is the same address in the key the engine
 * read first.
 * The same value reaches the engine in all three ways it runs: an Android
 * build (expo-constants embeds this config at build time), the iOS project
 * (same, during the Xcode build) and Expo Go (the server's manifest carries it
 * in extra.expoClient).
 */
const fs = require("fs");
const path = require("path");

function appOverride() {
  const file = process.env.NK_APP_CONFIG || path.join(__dirname, "nk-app.json");
  if (!fs.existsSync(file)) return {};
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function merge(base, over) {
  const out = { ...base };
  for (const [k, v] of Object.entries(over)) {
    out[k] = v && typeof v === "object" && !Array.isArray(v) && base[k] && typeof base[k] === "object" && !Array.isArray(base[k]) ? merge(base[k], v) : v;
  }
  return out;
}

/**
 * The engine's own config: app.json (given as `config`), then its dynamic
 * config if it has one (copied into the workspace as app.config.engine.*,
 * evaluated the way Expo evaluates app.config.ts).
 */
function engineConfig(config) {
  for (const ext of ["ts", "js", "mjs", "cjs"]) {
    const file = path.join(__dirname, `app.config.engine.${ext}`);
    if (!fs.existsSync(file)) continue;
    const { evalConfig } = require("@expo/config/build/evalConfig");
    return evalConfig(file, { config, projectRoot: __dirname, staticConfigPath: null, packageJsonPath: path.join(__dirname, "package.json") }).config;
  }
  return config;
}

// Words Java doesn't allow in a package name (the Android namespace).
const JAVA_RESERVED = new Set(
  ("abstract assert boolean break byte case catch char class const continue default do double else enum extends " +
    "final finally float for goto if implements import instanceof int interface long native new package private " +
    "protected public return short static strictfp super switch synchronized this throw throws transient try void " +
    "volatile while true false null var yield record sealed permits when").split(" "),
);
const javaSafe = (id) => id.split(".").map((p) => (JAVA_RESERVED.has(p) ? `${p}_` : p)).join(".");

module.exports = ({ config }) => {
  const merged = merge(engineConfig(config), appOverride());
  const plugins = [...(merged.plugins || [])];
  if (!plugins.includes("./plugins/with-nk-build")) plugins.push("./plugins/with-nk-build");
  // android.package becomes the Java namespace at prebuild ("com.x.native" would not compile).
  const android = merged.android && merged.android.package ? { ...merged.android, package: javaSafe(merged.android.package) } : merged.android;
  return { ...merged, ...(android ? { android } : {}), plugins };
};
