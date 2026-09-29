#!/bin/sh
set -eu
if [ "${NULLKODE_ANDROID:-0}" = "1" ] && [ ! -d "${ANDROID_HOME:-/opt/android-sdk}/platforms" ]; then
  echo "NULLKODE_ANDROID=1, but this image was built without the Android tools. Run the installer again, or: docker compose up -d --build" >&2
fi
# Never accept destructive schema changes automatically on restart.
node node_modules/prisma/build/index.js db push --skip-generate
exec node node_modules/next/dist/bin/next start -p 3001 -H 0.0.0.0
