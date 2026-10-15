#!/usr/bin/env bash
# Source before Gradle / keytool:  source scripts/android-env.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TOOLS="$ROOT/.tools"

find_jdk_home() {
  local dir
  for dir in "$TOOLS"/jdk-* "$HOME/.local/jdk-"*; do
    if [[ -x "$dir/bin/java" ]]; then
      echo "$dir"
      return 0
    fi
  done
  if [[ -n "${JAVA_HOME:-}" && -x "${JAVA_HOME}/bin/java" ]]; then
    echo "$JAVA_HOME"
    return 0
  fi
  if command -v java >/dev/null 2>&1; then
    local java_bin
    java_bin="$(readlink -f "$(command -v java)" 2>/dev/null || command -v java)"
    dirname "$(dirname "$java_bin")"
    return 0
  fi
  return 1
}

JDK_HOME="$(find_jdk_home || true)"
if [[ -z "$JDK_HOME" ]]; then
  echo "Error: Java JDK not found."
  echo "Run: ./scripts/setup-android-build.sh"
  return 1 2>/dev/null || exit 1
fi

export JAVA_HOME="$JDK_HOME"
export PATH="$JAVA_HOME/bin:$PATH"

ANDROID_SDK="${ANDROID_HOME:-$TOOLS/android-sdk}"
if [[ -d "$ANDROID_SDK" ]]; then
  export ANDROID_HOME="$ANDROID_SDK"
  export ANDROID_SDK_ROOT="$ANDROID_SDK"
  export PATH="$ANDROID_SDK/platform-tools:$ANDROID_SDK/cmdline-tools/latest/bin:$PATH"

  LOCAL_PROPS="$ROOT/android/local.properties"
  SDK_DIR_LINE="sdk.dir=$ANDROID_SDK"
  if [[ ! -f "$LOCAL_PROPS" ]] || ! grep -qF "$SDK_DIR_LINE" "$LOCAL_PROPS" 2>/dev/null; then
    mkdir -p "$(dirname "$LOCAL_PROPS")"
    printf '%s\n' "$SDK_DIR_LINE" >"$LOCAL_PROPS"
  fi
fi
