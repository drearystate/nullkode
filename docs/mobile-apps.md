# Mobile apps (Android and iOS)

Every published app can become a phone app. The phone app is a thin native
shell that shows the app's live published address, so publishing changes
updates it right away. A new build is only needed to change the app's name,
icon, colors, orientation or version.

Open an app, then **Mobile app**.

## App identity and white-label

Nothing in the phone apps or the downloaded project names this platform.

- **Bundle ID / Application ID.** New apps get `com.<brand>.<app>`, where
  `<brand>` is the owner's reseller's slug (for a reseller and its clients)
  or the operator's brand name (Admin → Brand) for everyone else. The owner
  can change it until the app is in a store.
- **It never changes by itself.** The first build or project download saves
  the ID into the app's settings, so renaming the brand or a reseller later
  doesn't change it (stores only accept updates with the same ID). Apps
  built before this existed keep the ID of their last build.
- The Android app's code lives in the app's own package
  (`<bundle ID>.MainActivity`), and the downloaded project's README names
  the owner's brand (reseller or operator).

## Android

The server builds Android apps itself, in two kinds:

| | Test on your phone (APK) | Publish on Google Play (AAB) |
|---|---|---|
| Files | one `.apk` | one `.aab` for Google Play, plus a signed `.apk` for other stores or a website |
| Signed with | the server's debug key | the app's own **upload key** |
| Google Play | refused | accepted |
| Build number (versionCode) | the "Build number" setting | goes up by itself on every build |

A phone can't update one kind with the other (different keys): remove the
test copy before installing the Google Play one.

### The upload key

- Made the first time someone builds for Google Play (RSA 4096, valid about
  27 years), or imported by the owner under **Your upload key → Use a key I
  already have** (for apps already on Google Play; `.jks`, `.keystore` or
  PKCS#12, with alias and passwords; the key password is checked before the
  key is saved).
- The keystore file is kept in private storage:
  `<NK_NATIVE_DIR>/.signing/<projectId>/` (default `uploads/.signing/…`,
  folder mode 700, file mode 600). That folder is never served over HTTP:
  Next.js only serves `public/`, and every documented proxy setup
  (`docs/deploy/*`, Plesk, Caddy) forwards all requests to the app.
- Its passwords are stored in the `AndroidSigningKey` table, encrypted with
  `encryptSecret` (AES-256-GCM, key derived from `AUTH_SECRET`). If
  `AUTH_SECRET` changes, the server can no longer unlock the key and asks
  the owner to import their backup.
- **Download key backup** gives the owner a zip with the keystore and a
  `KEEP-THIS-SAFE.txt` note holding the alias, both passwords and the
  certificate fingerprints. Only the app's owner can download or replace the
  key; an admin acting as the owner can't.
- A key is never replaced silently. Importing a new one needs an explicit
  "Replace my current key"; the old file stays in the same folder, renamed
  `replaced-<time>-…`, with its encrypted passwords next to it.
- `lastVersionCode` on the key record counts Google Play builds. The next
  build uses one more, or the app's "Build number" if that is higher, so
  every upload has a higher versionCode than the last.

Server backups (`scripts/backup.sh`) include the uploads volume, so they
include the keys. Keep backups private.

### Builds on disk

Builds live in `<NK_NATIVE_DIR>/<projectId>/native/<buildId>/`
(`status.json`, `build.log` and the output files). Only the newest 3 builds
of each kind are kept per app (plus the newest finished one, if the last 3
failed); older ones are deleted after each build. One build runs at a time
per server; others wait their turn. A build that was running when the server
restarted is reported as stopped.

### What the server needs

- Android SDK with `platforms;android-36`, `build-tools;36.0.0` and
  `platform-tools` (`ANDROID_HOME`, default `/opt/android-sdk`)
- JDK 17 (`JAVA_HOME`, or `javac` on `PATH`)
- Internet access for the first build (Gradle 8.11.1 and the Android Gradle
  plugin 8.9.3 are downloaded into `GRADLE_USER_HOME`). The Docker image
  downloads everything while it's built, so builds there work offline.

The Mobile app page shows the exact reason when something is missing.

**Docker installs:** run the installer again and answer yes to the Android
question, or run `NULLKODE_ANDROID=1 bash install.sh`. See START-HERE.md.

**Manual installs** (for example with systemd):

```bash
yes | "$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager" "platforms;android-36" "build-tools;36.0.0" "platform-tools"
```

Settings (environment variables, all optional):

| Variable | Default | What it is |
|---|---|---|
| `ANDROID_HOME` | `/opt/android-sdk` | Android SDK |
| `JAVA_HOME` | JDK of `javac` on `PATH` | JDK 17 |
| `GRADLE_USER_HOME` | `~/.gradle` | Gradle's download cache |
| `ANDROID_USER_HOME` | `~/.android` | holds `debug.keystore`, which signs test APKs; keep it, or phones won't install updates of test APKs |
| `NK_NATIVE_DIR` | `<app folder>/uploads` | builds and upload keys; must not be inside `public/` |
| `NK_APK_WORK_DIR` | `<tmp>/nk-apk` | scratch space during builds |

### The Android template

`native-templates/android-webview` is a small WebView app (no extra
libraries). App details come in as Gradle properties (`nkAppId`,
`nkNamespace`, `nkAppName`, `nkStartUrl`, `nkVersionName`, `nkVersionCode`,
`nkOrientation`, `nkThemeColor`, `nkBackgroundColor`), and each build moves
`MainActivity` from the template's `com.example.webapp` package into the
app's own package; the release signing
details come in as `ORG_GRADLE_PROJECT_nkKeystore*` environment variables,
so passwords never appear on a command line. It targets API 36 (required
by Google Play from 31 August 2026).

- Every web address stays inside the app, including the redirect from
  `/app/<slug>` to the app's own domain or `<label>.<APPS_DOMAIN>` address.
  Other links (`tel:`, `mailto:`, maps, other apps) open the app that
  handles them.
- When the site can't be reached, the app shows `assets/offline.html` in
  the app's own colors (readable on dark and light backgrounds) with a "Try
  again" button; it also retries by itself when the connection comes back.

## iOS

The **Download iPhone project** button gives a folder with:

- `ios/` — an Xcode project that opens as is. It is Capacitor 8's iOS app
  (iOS 15 and newer) using Swift Package Manager (no CocoaPods, no
  `npx cap add ios`), made
  from `native-templates/capacitor-ios` with the app's name, bundle ID,
  version, build number, orientation, status bar style, icon (1024 x 1024,
  no transparency) and launch screen filled in.
- `.github/workflows/ios.yml` — an optional GitHub Actions workflow that
  builds the app on a GitHub macOS runner and uploads it to TestFlight,
  using the owner's App Store Connect API key, distribution certificate and
  App Store provisioning profile (stored as repository secrets).
- `README.md` — step-by-step instructions for both ways (with a Mac, and
  without one through GitHub).

What it can't change: Apple requires a paid Apple Developer Program
membership to publish, only macOS can build iOS apps, and since 28 April
2026 App Store Connect only accepts builds made with Xcode 26 or newer. So
owners need either a Mac with Xcode 26+ or the GitHub macOS runner (the
workflow picks the newest stable Xcode on the runner). The project and workflow
are generated and checked on Linux; they have not been built with Xcode on
this server.

To update the iOS template to a newer Capacitor, follow
`native-templates/capacitor-ios/README.md`.

## Store review

Both stores review apps. Apps that only show a website can be refused
(Google Play's and Apple's minimum-functionality rules), so apps should work
well as apps: sign-in, useful screens, no broken links. New personal Google
Play developer accounts must test with at least 12 people for 14 days before
they can publish to everyone.
