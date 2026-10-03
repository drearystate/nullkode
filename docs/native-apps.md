# Native apps (NullKode Native)

Besides the classic phone apps (a thin shell around the published web app, see
[mobile-apps.md](mobile-apps.md)), every published app can run as a real native
iOS and Android app. This page is for people who run their own NullKode server.

## How it works

- **One engine for every app.** `native-runtime/` is an Expo / React Native app
  (Expo SDK 57). It draws any NullKode app from that app's compiled *native
  spec*, which it downloads from the app's own address
  (`<app>/nk-native/app.json` and `<app>/nk-native/pages/<page>.json`).
  Publishing updates phones right away; no new store version is needed.
- **The compiler** (`src/lib/native/compile.ts`) opens each published page in a
  headless Chromium at phone width and turns what the browser laid out into
  native views. Parts it can't express natively stay small embedded web views.
  Specs are made on first request and cached per published version in
  `<NK_NATIVE_DIR>/<projectId>/native/` (default `uploads/`).
- **Previews.** The Mobile app tab shows the native app in a phone frame (the
  engine built for the browser), on the owner's own phone through Expo Go
  (QR code), and optionally in a real Android emulator streamed into the
  browser.
- **Builds.** Android APK/AAB are built on your server from one prebuilt engine
  (about 15 s per app once warm). For iPhone the owner downloads an Xcode
  project and builds it on a Mac (or with the included GitHub Actions workflow
  for TestFlight). NullKode never signs or submits iPhone apps.

## What each part needs

| Part | Needs | Without it |
|---|---|---|
| Compiler, "looks the same" check | Chromium from Playwright (`pnpm exec playwright install --with-deps chromium`) | Phone screens can't be made |
| Phone preview in the studio | `pnpm native:web` (engine web build in `public/nk-native/web`) | The tab says the preview isn't built |
| Expo Go on your phone | Node.js 22, the engine's packages (`native-runtime/node_modules`), `rsync` | The QR code waits for a preview that never comes |
| Android store builds | the above, JDK 17, Android SDK incl. NDK and CMake | The Store builds card explains what's missing |
| iPhone project download | Node.js 22, the engine's packages | Download refused with a reason |
| Android in the browser | KVM, the Android emulator service (optional, below) | The section is hidden |
| Phone notifications | `NK_EXPO_PROJECT_ID` and Expo push credentials | Owners see "Phone notifications aren't switched on for this server yet" |

### Bare-metal (systemd) install

```bash
# Node 22 for the engine's tools (the server itself stays on Node 20).
# Put it at /opt/node-22 or point NK_NATIVE_NODE at its node binary.
cd native-runtime && PATH=/opt/node-22/bin:$PATH npm ci && cd ..
PATH=/opt/node-22/bin:$PATH pnpm native:web     # engine web build → public/nk-native/web
pnpm exec playwright install --with-deps chromium
```

Run `pnpm native:web` again after every update (it also type-checks the engine
and copies `src/lib/native/spec.ts` into it).

Expo Go bundles are made on first use (about 15 s) and kept in
`<NK_ENGINE_CACHE>` (default `uploads/.engine`). The first Android store build
prepares the engine workspace there (2-7 minutes; `uploads/.engine` grows to
about 3.4 GB). To do that ahead of time: `pnpm native:engine prepare`.
`uploads/.engine` can always be deleted; leave it out of backups.

### Docker

The image always contains the engine's web build (an extra build stage with
Node 22) and Chromium (about 450 MB, also used by website import). Two
switches in `.env`, applied with `docker compose up -d --build`:

- `NULLKODE_NATIVE_ENGINE=1` adds Node 22, `rsync` and the engine's packages
  (about 800 MB): Expo Go previews and iPhone project downloads.
- `NULLKODE_ANDROID=1` (accepts Google's Android SDK License) adds JDK 17 and
  the Android SDK for classic APKs (about 1.1 GB). With both switches on, the
  NDK and CMake are added too (about 1.5 GB more) for store builds of the native
  app; their Gradle dependencies download on the first build.

## The phone preview and app addresses

With `APPS_DOMAIN` set, each app has its own origin
(`https://<label>.<APPS_DOMAIN>`). The studio's preview then opens the engine
on that origin, `https://<label>.<APPS_DOMAIN>/nk-native/web?app=…`, so sign-in,
forms and lists talk to the app's own `/api/run` exactly as a phone does.
Without an apps domain it uses `/app/<slug>/nk-native/web` on the studio's
address. The engine page:

- may only be framed by the studio (`Content-Security-Policy: frame-ancestors`
  with `PUBLIC_BASE_URL`, its aliases and the owner's reseller domain);
- only shows the app that address serves (a different `?app=` is sent back to
  the app's own spec), so nobody can make an app's origin show another app;
- keeps the visitor's session in the tab only and never sees studio cookies.

Behind a proxy that doesn't send `X-Forwarded-Proto` for app hosts, specs on
app hosts use `https` whenever `PUBLIC_BASE_URL` does.

## Expo Go

The Mobile app tab shows a QR code (`exps://<studio>/nk-native/expo-go/<id>/<token>`).
The owner installs Expo Go (SDK 57) and scans it. The token is an HMAC of the
app ID with `AUTH_SECRET`; the app must be published. Expo Go shows its own
developer menu the first time; that's Expo Go, not your app. Remote
notifications don't work in Expo Go on Android (an Expo Go limit).

## Android store builds

SDK packages: `platforms;android-36`, `build-tools;36.0.0`, `platform-tools`,
`ndk;27.1.12297006`, `cmake;3.22.1` (AGP installs the last two on the first
build if the SDK folder is writable and the licenses are accepted). JDK 17.
Test APKs are signed with the server's debug key (`ANDROID_USER_HOME`), store
builds with the app's own upload key, the same keys the classic builds use.
Operator tool: `pnpm native:engine status | prepare | build <projectId> [debug|release]`.

## iPhone

The owner downloads an Xcode project (`ios/App.xcworkspace`, scheme App) with
`README-IOS.md` and a GitHub Actions workflow (`.github/workflows/ios-testflight.yml`)
that builds and uploads to TestFlight with their own Apple certificates.
Universal links need the owner's Team ID (Mobile app tab) and Associated
Domains turned on in Xcode.

## Android in the browser (optional)

`services/native-emulator/server.mjs` (Node 20+, no dependencies) runs Android
emulators on the server and streams them into the studio (scrcpy over adb,
H.264 decoded in the browser). Needs: Linux with KVM, the Android emulator and
a system image (`emulator`, `system-images;android-36;google_apis;x86_64`), an
AVD named `nk-base`, scrcpy-server 4.1, and a snapshot made once with
`node services/native-emulator/server.mjs prepare-snapshot <Expo-Go.apk>`.

Each emulator uses about 4.2 GB of memory and up to 10 CPU cores while the
screen scrolls (software graphics). Set `NK_EMU_MAX` to what the server can
spare; one emulator per owner at a time.

Settings (service): `NK_EMU_SECRET` (required, shared with the NullKode server),
`NK_EMU_PORT` (8795), `NK_EMU_MAX`, `NK_EMU_IDLE_MS`, `NK_EMU_MAX_AGE_MS`,
`ANDROID_HOME`, `ANDROID_AVD_HOME`, `NK_EMU_SCRCPY_SERVER`, `NK_EMU_APK_ROOT`
(your `uploads/` folder), `NK_EMU_FRAME_ANCESTORS` (the studio's origin). The
NullKode server needs the same `NK_EMU_SECRET` (or `NK_EMU_SECRET_FILE`), and
`NK_EMU_URL` if the service isn't on `127.0.0.1:8795`.

Run it as a service, e.g. `pnpm native:emulator` under systemd with the
settings in an `EnvironmentFile`. The service listens on 127.0.0.1 only; put
the viewer behind your reverse proxy **with WebSocket upgrade**:

```nginx
location ^~ /nk-native/emulator/ {
    proxy_pass http://127.0.0.1:8795;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_buffering off;
    proxy_read_timeout 3600;
}
```

With Caddy: `handle /nk-native/emulator/* { reverse_proxy 127.0.0.1:8795 }`
(Caddy upgrades WebSockets on its own). Only the viewer paths are public; the
service's control API is reachable from the server itself only.

## Phone notifications

Native apps receive notifications through Expo's push service. Once per server:

1. Create a project at expo.dev (free) and copy its project ID.
2. Android: create a Firebase project, add an Android app, and upload its FCM
   (v1) service account key to the Expo project's credentials. The Android
   build also needs that Firebase app's `google-services.json`.
3. iPhone: add an Apple push key (APNs `.p8`) to the Expo project's credentials
   for the app's bundle ID.
4. Set `NK_EXPO_PROJECT_ID` in `.env` (and `NK_EXPO_ACCESS_TOKEN` if your Expo
   account requires access tokens for sending), then restart.

The studio's Notifications page and flows' `send_push` step then reach
phones as well as browsers. Until it's set, owners read that phone
notifications aren't switched on for this server yet, and administrators see
which setting is missing. Android builds made on the server don't include a
`google-services.json` yet; until they do, Android phones only get
notifications in builds made with one.

## Tests

`scripts/e2e-native.ts`, `e2e-native-studio.ts` (includes the preview on an
app's own address in a real browser), `e2e-native-behaviours.ts`,
`e2e-native-device.ts`, and `pnpm native:fidelity` (how close each page looks
to the website).
