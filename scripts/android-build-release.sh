#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

# shellcheck source=/dev/null
source "$PROJECT_DIR/scripts/android-env.sh"

# Must match src/lib/android-apk.ts (store name: DRIP CLIENT OFFICIAL)
APK_PUBLIC_NAME="${ANDROID_APK_PUBLIC_NAME:-DRIP-CLIENT-OFFICIAL.apk}"
# Keep APK outside public/ — Next static-serves public/ and Cloudflare caches it for hours.
RELEASES_DIR="$PROJECT_DIR/releases"
PUBLIC_DIR="$PROJECT_DIR/public/downloads"

echo "==> Syncing Capacitor Android project"
npm run cap:sync

KEYSTORE_PROPS="$PROJECT_DIR/android/keystore.properties"
if [[ ! -f "$KEYSTORE_PROPS" ]]; then
  echo "Error: android/keystore.properties not found."
  echo "Copy android/keystore.properties.example and configure your release keystore."
  echo "Generate a keystore with:"
  echo "  ./scripts/android-generate-keystore.sh"
  exit 1
fi

echo "==> Building signed release APK"
cd android
./gradlew assembleRelease

APK_PATH="app/build/outputs/apk/release/app-release.apk"
if [[ ! -f "$APK_PATH" ]]; then
  echo "Error: APK not found at android/$APK_PATH"
  exit 1
fi

VERSION_NAME="$(
  grep -E 'versionName[[:space:]]+"' "$PROJECT_DIR/android/app/build.gradle" \
    | head -1 \
    | sed -E 's/.*"([^"]+)".*/\1/'
)"
VERSIONED_NAME="${APK_PUBLIC_NAME%.apk}-v${VERSION_NAME}.apk"

mkdir -p "$RELEASES_DIR" "$PUBLIC_DIR"
# Canonical bytes for /downloads/[file] route
cp -f "$APK_PATH" "$RELEASES_DIR/$APK_PUBLIC_NAME"
cp -f "$APK_PATH" "$RELEASES_DIR/$VERSIONED_NAME"
# Ops handoff at repo root
ROOT_COPY="$PROJECT_DIR/$VERSIONED_NAME"
cp -f "$APK_PATH" "$ROOT_COPY"
# Do NOT leave .apk under public/downloads (static + Cloudflare long cache).

echo "==> Release APK ready:"
echo "    android/$APK_PATH"
echo "    releases/$APK_PUBLIC_NAME  (served by /downloads/[file])"
echo "    releases/$VERSIONED_NAME"
echo "    $ROOT_COPY"
ls -lh "$PROJECT_DIR/android/$APK_PATH" "$RELEASES_DIR/$APK_PUBLIC_NAME" "$RELEASES_DIR/$VERSIONED_NAME" "$ROOT_COPY"
