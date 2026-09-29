# Mobile apps (Android and iOS)

Every published app can become a phone app. The phone app is a thin native
shell that shows the app's live published address, so publishing changes
updates it right away. A new build is needed to change the app's name,
icon, colors, orientation or version, and when the phone features it uses
change (see below).

Open an app, then **Mobile app**.

## Phone features (camera, microphone, location, files)

A phone only lets an app use what its build declared, so the builds ask for
exactly what the app uses. `src/lib/native-permissions.ts` works it out from:

- installed modules: their `provides: ["camera"]` or `["location"]` tags
  (QR Scanner), plus a built-in list for File Upload, Store Locator,
  Geofencer, Delivery Tracking and Delivery Zones;
- the app's pages, live and draft: `getUserMedia` and `data-nk-qr-scanner`
  (camera; microphone when audio is asked for), `SpeechRecognition`
  (microphone), `navigator.geolocation` (location) and file inputs (files).
  Pages written by AI use these without any module.

The **Mobile app** tab lists them under **Phone features this app uses**,
with what uses each one. Because the store apps load the live site, a
feature added after a build (installing a QR scanner later, say) needs a
new build and a store update: every Android build records what it declared
in its `status.json` (`features`, `permissions`, `shell`), and the tab shows
**Rebuild needed** when the app's features no longer match the last build.
The iPhone project download records the same (`iosDownload` in the app's
native settings), and the tab asks for a new download when location
support changes.

**Android.** `apk-build.ts` writes only the needed `<uses-permission>` lines
(`CAMERA`; `RECORD_AUDIO` and `MODIFY_AUDIO_SETTINGS`; `ACCESS_COARSE_LOCATION`
and `ACCESS_FINE_LOCATION`) into the manifest, and marks the camera,
microphone and location hardware `required="false"` so Google Play doesn't
hide the app from devices without them. The app shell:

- opens the phone's file picker for file inputs (honouring `accept` and
  `multiple`), with "take a photo" (and "take a video" for video inputs)
  through the camera app. The photo goes through the app's own file provider
  (`SharedFileProvider`, folders in `res/xml/file_paths.xml`), so a photo
  for an upload needs no camera permission. The page always gets an answer,
  also when the picker is cancelled, so the input keeps working;
- grants the camera, microphone and location only to pages on the app's
  own addresses (the `app_hosts` resource, from the app's domains and
  addresses), only for permissions the build declared, and only after the
  person allows them on the phone. A third-party page opened inside the app
  gets none of them;
- sends web downloads to the phone's Downloads folder (with the page's
  cookies, so signed-in downloads work), opens PDFs in the phone's viewer,
  and saves files a page makes itself (`blob:` and `data:` links, like a
  contact card) where the person picks, through a small bridge
  (`assets/save-file.js`) that only answers the app's own pages. No storage
  permission is needed;
- has an adaptive launcher icon (Android 8 and newer): the app's icon inside
  the 66 dp safe zone of a 108 dp foreground, on a background of the icon's
  own edge color (or the app's background color), plus 48 dp legacy and
  round icons.

**iPhone.** `Info.plist` always has the camera, microphone and photo library
purpose strings (a web page's file picker offers "Take Photo" and "Take
Video", and an app without them crashes when someone taps those and is
rejected by Apple), and the location one only when the app uses location.
The suggested wording names the app and what the feature is for (Apple
rejects vague wording under guideline 5.1.1); owners can change it under
**What the phone says when the app asks** (saved as `permissionText` in the
app's native settings).

**Store listings.** Both stores ask apps that let people sign up for a link
where people can delete their account, and for a privacy policy link. The
tab shows the app's deletion page, `<app address>/delete-account`, in the
Google Play and iPhone steps, with a reminder about the privacy policy.

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
- The desktop installers (Publish tab) name the owner's brand in their
  header, and the Mac one uses the bundle ID `<bundle ID>.desktop`, so it
  never clashes with the same app's iPhone build (iPhone apps also run on
  Apple Silicon Macs).

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
`nkOrientation`, `nkThemeColor`, `nkBackgroundColor`, `nkAppHosts`,
`nkIconBackground`), each build writes the app's permissions where the
manifest says `nk:phone-features`, and moves the Java classes
(`MainActivity`, `SharedFileProvider`) from the template's
`com.example.webapp` package into the app's own package; the release signing
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
