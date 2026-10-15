#!/usr/bin/env bash
# Install JDK 21 + Android SDK into .tools/ (no sudo required).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TOOLS="$ROOT/.tools"
JDK_DIR="$TOOLS/jdk-21"
SDK_DIR="$TOOLS/android-sdk"

mkdir -p "$TOOLS"

install_jdk() {
  if [[ -x "$JDK_DIR/bin/java" ]]; then
    echo "==> JDK already installed at $JDK_DIR"
    return 0
  fi

  echo "==> Downloading Eclipse Temurin JDK 21 (linux x64)…"
  TMP_JDK="$(mktemp -d)"
  trap 'rm -rf "$TMP_JDK"' EXIT

  curl -fsSL \
    "https://api.adoptium.net/v3/binary/latest/21/ga/linux/x64/jdk/hotspot/normal/eclipse?project=jdk" \
    -o "$TMP_JDK/jdk.tar.gz"

  echo "==> Extracting JDK…"
  mkdir -p "$JDK_DIR"
  tar -xzf "$TMP_JDK/jdk.tar.gz" -C "$JDK_DIR" --strip-components=1
  echo "==> JDK installed: $JDK_DIR"
}

install_android_sdk() {
  if [[ -x "$SDK_DIR/cmdline-tools/latest/bin/sdkmanager" ]]; then
    echo "==> Android SDK cmdline-tools already present"
  else
    echo "==> Downloading Android command-line tools…"
    TMP_SDK="$(mktemp -d)"
    trap 'rm -rf "$TMP_SDK"' EXIT

    curl -fsSL \
      "https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip" \
      -o "$TMP_SDK/cmdline-tools.zip"

    mkdir -p "$SDK_DIR/cmdline-tools"
    unzip -q "$TMP_SDK/cmdline-tools.zip" -d "$TMP_SDK/extract"
    rm -rf "$SDK_DIR/cmdline-tools/latest"
    mv "$TMP_SDK/extract/cmdline-tools" "$SDK_DIR/cmdline-tools/latest"
    echo "==> Android cmdline-tools installed"
  fi

  # shellcheck source=/dev/null
  source "$ROOT/scripts/android-env.sh"

  echo "==> Accepting Android SDK licenses…"
  yes | sdkmanager --licenses >/dev/null || true

  echo "==> Installing platform-tools, Android 35 platform, build-tools…"
  sdkmanager \
    "platform-tools" \
    "platforms;android-35" \
    "build-tools;35.0.0"

  mkdir -p "$ROOT/android"
  printf 'sdk.dir=%s\n' "$SDK_DIR" >"$ROOT/android/local.properties"
  echo "==> Android SDK ready: $SDK_DIR"
}

install_jdk
install_android_sdk

echo ""
echo "Done. Build with:"
echo "  source scripts/android-env.sh"
echo "  npm run android:build:debug"
echo ""
echo "Or: ./scripts/android-build-release.sh (after configuring android/keystore.properties)"
