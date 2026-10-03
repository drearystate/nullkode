/**
 * NullKode build config plugin for the NullKode Native engine.
 *
 * The engine (native-runtime/) is ONE Expo app for every NullKode app. The
 * server copies it into a build workspace, adds this plugin through
 * app.config.js (native-templates/expo-engine/app.config.js) and runs
 * `expo prebuild` once per engine version. This plugin makes the generated
 * android/ project buildable for ANY app without editing it again:
 *
 *   - app identity and signing come from Gradle properties
 *     (-PnkAppId, -PnkVersionCode, -PnkVersionName, -PnkKeystoreFile,
 *     -PnkKeystorePassword, -PnkKeyAlias, -PnkKeyPassword, -PnkDebugKeystore;
 *     passwords are passed as ORG_GRADLE_PROJECT_* environment variables);
 *   - per-app resources and manifest entries come from an overlay folder
 *     (-PnkOverlay=<dir>) that becomes the *release* build type's source set:
 *     it has a higher priority than src/main, so its strings, colours, icons,
 *     splash logo and manifest entries win without touching src/main.
 *
 * Every NullKode build is a "release" build type (JS bundle embedded, not
 * debuggable); a test APK is the same build signed with the server's debug
 * key. The namespace (Java/Kotlin package) never changes, so library and app
 * classes are identical for every app and Gradle reuses them between builds.
 *
 * iOS needs nothing here: the iOS project is prebuilt per app (it is cheap
 * and is compiled on the owner's Mac or a GitHub runner).
 */
const { withAppBuildGradle, withGradleProperties } = require("expo/config-plugins");

const MARK = "// nk-build:";

/** Rewrites app/build.gradle; throws when the template changed shape. */
function patchAppGradle(src) {
  if (src.includes(`${MARK} applied`)) return src;
  let out = src;
  const must = (re, to, what) => {
    if (!re.test(out)) throw new Error(`with-nk-build: could not find ${what} in android/app/build.gradle`);
    out = out.replace(re, to);
  };
  must(/applicationId ['"][^'"]+['"]/, "applicationId(findProperty('nkAppId') ?: android.namespace)", "applicationId");
  must(/versionCode \d+/, "versionCode((findProperty('nkVersionCode') ?: '1').toInteger())", "versionCode");
  must(/versionName ["'][^"']*["']/, "versionName(findProperty('nkVersionName') ?: '1.0.0')", "versionName");
  must(
    /signingConfigs \{\n(\s*)debug \{\n\s*storeFile file\('debug\.keystore'\)/,
    (_m, ind) =>
      [
        "signingConfigs {",
        `${ind}if (findProperty('nkKeystoreFile')) {`,
        `${ind}    nk {`,
        `${ind}        storeFile file(findProperty('nkKeystoreFile'))`,
        `${ind}        storePassword findProperty('nkKeystorePassword')`,
        `${ind}        keyAlias findProperty('nkKeyAlias')`,
        `${ind}        keyPassword(findProperty('nkKeyPassword') ?: findProperty('nkKeystorePassword'))`,
        `${ind}    }`,
        `${ind}}`,
        `${ind}debug {`,
        `${ind}    storeFile file(findProperty('nkDebugKeystore') ?: 'debug.keystore')`,
      ].join("\n"),
    "signingConfigs.debug",
  );
  must(
    /(release \{[^}]*?)signingConfig signingConfigs\.debug/,
    "$1signingConfig(findProperty('nkKeystoreFile') ? signingConfigs.nk : signingConfigs.debug)",
    "the release signingConfig",
  );
  out += `
${MARK} applied
// Per-app overlay (strings, colours, icons, splash, manifest) for release builds.
def nkOverlay = findProperty('nkOverlay')
if (nkOverlay) {
    android.sourceSets.release.res.srcDirs = [new File(nkOverlay, 'res')]
    android.sourceSets.release.assets.srcDirs = [new File(nkOverlay, 'assets')]
    android.sourceSets.release.manifest.srcFile new File(nkOverlay, 'AndroidManifest.xml')
}
// Lint of release builds adds ~7 s to every app build and checks engine code
// that is the same for every app; it runs in the engine's own CI instead.
android.lint.checkReleaseBuilds = false
`;
  return out;
}

const withNkBuild = (config) => {
  config = withAppBuildGradle(config, (c) => {
    c.modResults.contents = patchAppGradle(c.modResults.contents);
    return c;
  });
  config = withGradleProperties(config, (c) => {
    const set = (key, value) => {
      const item = c.modResults.find((i) => i.type === "property" && i.key === key);
      if (item) item.value = value;
      else c.modResults.push({ type: "property", key, value });
    };
    set("org.gradle.caching", "true");
    set("org.gradle.jvmargs", "-Xmx4096m -XX:MaxMetaspaceSize=1024m");
    // A daemon left by a build stops after 15 idle minutes.
    set("org.gradle.daemon.idletimeout", "900000");
    set("EX_DEV_CLIENT_NETWORK_INSPECTOR", "false");
    return c;
  });
  return config;
};

module.exports = withNkBuild;
module.exports.patchAppGradle = patchAppGradle;
