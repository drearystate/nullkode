# __NK_APP_NAME__ for iPhone and iPad

This folder is the complete iOS app: the __NK_BRAND__ app engine (a React
Native / Expo app) set up for __NK_APP_NAME__ (bundle ID `__NK_APP_ID__`).
The app loads its screens from __NK_BASE__, so publishing a change on
__NK_BRAND__ updates the app on people's phones without a new App Store version.

Apple only lets apps be built on a Mac, so you build it yourself, either on
your own Mac or on a Mac that GitHub lends you (section "Build on GitHub").

## Build on your Mac

You need: a Mac with the newest Xcode (from the Mac App Store), Node.js 22 or
newer (nodejs.org), CocoaPods (`sudo gem install cocoapods` or
`brew install cocoapods`) and an Apple Developer account.

1. Unzip this folder and open Terminal in it.
2. `npm ci` (installs the app's packages, a few minutes).
3. `cd ios && pod install && cd ..` (installs the native libraries).
4. `open ios/App.xcworkspace` (the .xcworkspace, not the .xcodeproj).
5. In Xcode, click "App" in the left column, then the "App" target >
   "Signing & Capabilities": tick "Automatically manage signing" and choose
   your Team. Xcode creates the certificate and profile for `__NK_APP_ID__`.
6. To try it on your iPhone: plug it in, choose it at the top of the window
   and press Run (the triangle).
7. To send it to the App Store: choose "Any iOS Device (arm64)" at the top,
   then Product > Archive. When the Organizer opens, click "Distribute App" >
   "App Store Connect" > "Upload". The build shows up in TestFlight after
   Apple has processed it (usually within 30 minutes).

Each upload needs a higher build number: in Xcode, target "App" > General >
Identity > Build (for example 2, 3, ...).

## Build on GitHub (no Mac needed)

`.github/workflows/ios-testflight.yml` builds the app on a GitHub Mac and
uploads it to TestFlight.

1. Put this folder in a new private GitHub repository.
2. In App Store Connect create the app with bundle ID `__NK_APP_ID__`.
3. Add these repository secrets (Settings > Secrets and variables > Actions):
   - `IOS_CERTIFICATE_P12`: your Apple Distribution certificate with its
     private key, exported as .p12 and encoded as base64
     (`base64 -i cert.p12 | pbcopy` on a Mac).
   - `IOS_CERTIFICATE_PASSWORD`: the password of that .p12 file.
   - `IOS_PROVISIONING_PROFILE`: an "App Store Connect" provisioning profile
     for `__NK_APP_ID__`, encoded as base64.
   - `APP_STORE_CONNECT_KEY_ID`, `APP_STORE_CONNECT_ISSUER_ID`,
     `APP_STORE_CONNECT_KEY`: an App Store Connect API key (Users and Access >
     Integrations > App Store Connect API, role "App Manager"); the key is
     the text of the .p8 file.
4. Actions tab > "iOS (TestFlight)" > Run workflow.

## What's inside

- `ios/`: the Xcode project, made by `expo prebuild` for this app (name, bundle
  ID, version, icon, colours and URL scheme are already set).
- `nk-app.json`: this app's settings, read when the app is built
  (`app.config.js`). Change the name or address there only if you know why.
- The rest is the engine's source code (React Native).

Questions: see the Mobile app tab of your app in __NK_BRAND__.
