# Capacitor iOS template (Swift Package Manager)

`src/lib/native-ios.ts` copies `ios/` and `.github/` from here into every
downloaded mobile project, so the iOS app opens in Xcode right away: no
CocoaPods and no `npx cap add ios` step.

`ios/` is the output of Capacitor CLI 8.5.2 (`npx cap add ios --packagemanager SPM`,
run on Linux with Node 22) with these changes:

- Files that `npx cap sync ios` writes (`App/App/public/`,
  `App/App/capacitor.config.json`, `App/App/config.xml`) are left out. They
  would be ignored by git here (see `ios/.gitignore`), so `native-ios.ts`
  writes them for each download instead.
- Capacitor's sample icon and splash images are left out. `native-ios.ts`
  draws the app's own icon (1024 x 1024, no transparency, as the App Store
  requires) and a splash screen in the app's background color.
- Placeholders filled in per app:
  - `App/App.xcodeproj/project.pbxproj`: `__NK_APP_ID__`, `__NK_VERSION__`,
    `__NK_BUILD__`
  - `App/App/Info.plist`: `__NK_APP_NAME__`, `__NK_STATUS_BAR_STYLE__`,
    `__NK_IPHONE_ORIENTATIONS__`, and `__NK_PRIVACY_KEYS__` (the camera,
    microphone and photo library purpose strings, plus location when the app
    uses it; see `src/lib/native-permissions.ts`)
- `Info.plist` also sets `ITSAppUsesNonExemptEncryption` to false (the app
  only uses HTTPS), so TestFlight doesn't ask about encryption for every build.

`App/CapApp-SPM/Package.swift` pins `capacitor-swift-pm` to the exact version
of `@capacitor/ios` in the generated `package.json` (`CAP_VERSION` in
`src/lib/native.ts`). Change both together.

## Updating to a newer Capacitor

1. In an empty folder with Node 22 or newer:
   `npm i @capacitor/cli@X @capacitor/core@X @capacitor/ios@X`, write a
   `capacitor.config.json` with `appId` `com.nkplaceholder.app`, `appName`
   `NK Placeholder App` and `webDir` `www`, create `www/index.html`, then run
   `npx cap add ios --packagemanager SPM`.
2. Copy the new `ios/` here without the files listed above, and put the
   placeholders back (compare with `git diff`).
3. Set `CAP_VERSION` in `src/lib/native.ts` to X.
4. Download a project from the Mobile App tab and check that
   `ios/App/CapApp-SPM/Package.swift` and the placeholders are right.

`.github/workflows/ios.yml` is the optional GitHub Actions workflow that builds
the app on a Mac runner and uploads it to TestFlight. The downloaded
project's README explains how to set it up.
