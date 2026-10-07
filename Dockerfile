# syntax=docker/dockerfile:1

# NullKode Native engine (native-runtime/, Expo SDK 57, needs Node >= 20.19.4):
# its browser build for the studio's phone preview (public/nk-native/web),
# always. With NULLKODE_NATIVE_ENGINE=1 (docker-compose passes it from .env),
# also Node 22 and the engine's packages for the runtime image: Expo Go
# previews on the owner's phone, and with NULLKODE_ANDROID=1 too, store builds
# (APK/AAB) of the native app. About 800 MB more; off by default.
FROM node:22-bookworm-slim AS engine
ARG NULLKODE_NATIVE_ENGINE=0
WORKDIR /engine
COPY native-runtime/package.json native-runtime/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY native-runtime/ ./
# The server's copy of the spec contract is the source (pnpm native:web does the same).
COPY src/lib/native/spec.ts ./src/spec.ts
RUN CI=1 EXPO_NO_TELEMETRY=1 npx expo export --platform web --output-dir dist-web
RUN set -eu; mkdir -p /out/app/native-runtime /out/opt; \
    if [ "$NULLKODE_NATIVE_ENGINE" = "1" ]; then \
      cp -a node_modules /out/app/native-runtime/; \
      mkdir -p /out/opt/node-22/bin; cp "$(command -v node)" /out/opt/node-22/bin/node; \
    fi

FROM node:20.19.2-bookworm-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 build-essential ca-certificates openssl \
    && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@10.33.4 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY prisma ./prisma
RUN pnpm install --frozen-lockfile
COPY . .
COPY --from=engine /engine/dist-web ./public/nk-native/web
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build
# Game Studio asset search (games/tools, see docs/games.md): its SQLite package,
# built for this image's Node. The asset library itself is mounted at run time.
RUN if [ -f games/tools/package-lock.json ]; then \
      cd games/tools && npm ci --omit=dev --no-audit --no-fund --loglevel=error; \
    fi

FROM node:20.19.2-bookworm-slim AS runtime
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends tini ca-certificates openssl \
    && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@10.33.4 --activate
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# Optional Android APK builder for the Mobile App tab. Off by default.
# The installer sets NULLKODE_ANDROID=1 only after the operator says yes, and
# saying yes accepts Google's Android SDK License:
#   https://developer.android.com/studio/terms
# It adds JDK 17 and the SDK packages the template needs, then builds the
# template once so Gradle and every dependency are already downloaded. APK
# builds then start fast and need no internet access.
# Keep in step with native-templates/android-webview/app/build.gradle
# (compileSdk 36, buildToolsVersion 36.0.0; AGP 8.9.3 on Gradle 8.11.1) and
# src/lib/apk-build.ts. These layers come before the app is copied, so app
# updates reuse them.
# cmdline-tools 12.0 (the version the hosted service uses) only installs the
# packages. Newer releases replace sdkmanager with a downloaded "Android CLI"
# that collects usage data and writes SDK metadata older AGP versions cannot read.
# With NULLKODE_NATIVE_ENGINE=1 as well, the NDK and CMake are added: store
# builds of the native app compile C++ (expo-modules-core, react-native-screens).
# Their Gradle dependencies download on the first store build (needs internet,
# ~2-7 min once, cached in /home/node/.gradle).
ARG NULLKODE_ANDROID=0
ARG NULLKODE_NATIVE_ENGINE=0
ARG ANDROID_CMDLINE_TOOLS=11076708
ARG ANDROID_CMDLINE_TOOLS_SHA256=2d2d50857e4eb553af5a6dc3ad507a17adf43d115264b1afc116f95c92e5e258
ARG ANDROID_PACKAGES="platforms;android-36 build-tools;36.0.0 platform-tools"
ENV ANDROID_HOME=/opt/android-sdk \
    GRADLE_USER_HOME=/home/node/.gradle
RUN set -eu; \
    if [ "$NULLKODE_ANDROID" != "1" ]; then echo "Android APK builder: off (NULLKODE_ANDROID=$NULLKODE_ANDROID)."; exit 0; fi; \
    arch="$(dpkg --print-architecture)"; \
    if [ "$arch" != "amd64" ]; then \
      echo "Android APK building needs an Intel or AMD (x86-64) computer. This Docker host is $arch." >&2; \
      echo "Set NULLKODE_ANDROID=0 in .env, then run the installer again." >&2; \
      exit 1; \
    fi; \
    echo "Android APK builder: on. NULLKODE_ANDROID=1 means the operator accepted Google's Android SDK License (https://developer.android.com/studio/terms)."; \
    apt-get update; \
    apt-get install -y --no-install-recommends openjdk-17-jdk-headless curl unzip; \
    curl -fsSL --retry 3 -o /tmp/cmdline-tools.zip \
      "https://dl.google.com/android/repository/commandlinetools-linux-${ANDROID_CMDLINE_TOOLS}_latest.zip"; \
    echo "${ANDROID_CMDLINE_TOOLS_SHA256}  /tmp/cmdline-tools.zip" | sha256sum -c -; \
    unzip -q /tmp/cmdline-tools.zip -d /tmp; \
    packages="$ANDROID_PACKAGES"; \
    if [ "$NULLKODE_NATIVE_ENGINE" = "1" ]; then packages="$packages ndk;27.1.12297006 cmake;3.22.1"; fi; \
    yes | /tmp/cmdline-tools/bin/sdkmanager --sdk_root="$ANDROID_HOME" $packages; \
    apt-get purge -y --auto-remove curl unzip; \
    rm -rf /var/lib/apt/lists/* /tmp/cmdline-tools /tmp/cmdline-tools.zip /root/.android /root/.java; \
    ls "$ANDROID_HOME/licenses"; \
    java -version
COPY --chown=node:node native-templates/android-webview /tmp/nk-android-warmup
USER node
# Build the template once, both kinds: the test APK (assembleDebug) and the
# Google Play build (bundleRelease + assembleRelease, signed with a throwaway
# key made here and deleted afterwards). Then every dependency is in the
# Gradle cache and real builds work offline. Fail if the Android Gradle plugin
# wants an SDK package that is missing, because at runtime it would try to
# download it. The debug key is made in the warm-up folder, so no key is
# baked into the image.
RUN set -eu; \
    if [ "$NULLKODE_ANDROID" = "1" ]; then \
      cd /tmp/nk-android-warmup; \
      printf 'sdk.dir=%s\n' "$ANDROID_HOME" > local.properties; \
      keytool -genkeypair -noprompt -keystore warmup.jks -storetype PKCS12 -alias upload \
        -keyalg RSA -keysize 2048 -validity 2 -dname CN=warmup -storepass warmup-only -keypass warmup-only > /dev/null 2>&1; \
      ANDROID_USER_HOME=/tmp/nk-android-warmup/.android \
      ORG_GRADLE_PROJECT_nkKeystoreFile=/tmp/nk-android-warmup/warmup.jks \
      ORG_GRADLE_PROJECT_nkKeystorePassword=warmup-only \
      ORG_GRADLE_PROJECT_nkKeyAlias=upload \
        sh ./gradlew assembleDebug bundleRelease assembleRelease --no-daemon --console=plain > build.log 2>&1 || { cat build.log; exit 1; }; \
      cat build.log; \
      if grep -q "is not installed" build.log; then echo "The Android SDK is missing a package the template needs." >&2; exit 1; fi; \
      test -s app/build/outputs/apk/debug/app-debug.apk; \
      test -s app/build/outputs/bundle/release/app-release.aab; \
      test -s app/build/outputs/apk/release/app-release.apk; \
      rm -rf "$GRADLE_USER_HOME/daemon" "$GRADLE_USER_HOME/.tmp" /home/node/.android /home/node/.java; \
      rm -f "$GRADLE_USER_HOME"/wrapper/dists/*/*/*.zip; \
    fi; \
    rm -rf /tmp/nk-android-warmup
USER root
# The key that signs every test APK lives in the uploads volume, so it
# survives updates and is included in backups. Phones only install an update
# over an older build when both are signed with the same key. Each app's
# Google Play upload key is kept there too (/app/uploads/.signing), and the
# uploads volume is never served over HTTP.
ENV ANDROID_USER_HOME=/app/uploads/.android

COPY --from=build --chown=node:node /app /app
# The native engine's packages and Node 22 (only with NULLKODE_NATIVE_ENGINE=1;
# otherwise this copies two empty folders). Engine workspaces are copied with
# rsync into /app/uploads/.engine on first use.
COPY --from=engine --chown=node:node /out/ /
RUN if [ "$NULLKODE_NATIVE_ENGINE" = "1" ]; then \
      apt-get update && apt-get install -y --no-install-recommends rsync && rm -rf /var/lib/apt/lists/*; \
    fi
# Website import and the native compiler (published pages measured at phone
# width, lib/native/compile.ts) need Chromium. Install it with its OS
# dependencies (about 450 MB of the image).
RUN pnpm exec playwright install --with-deps chromium \
    && mkdir -p /app/uploads /app/public/uploads /app/public/assets/cloned \
    && chown -R node:node /app/uploads /app/public/uploads /app/public/assets/cloned /ms-playwright
USER node
EXPOSE 3001
ENTRYPOINT ["tini", "--"]
CMD ["sh", "scripts/container-start.sh"]
