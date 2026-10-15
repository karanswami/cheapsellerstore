#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=/dev/null
source "$ROOT/scripts/android-env.sh"

KEYSTORE="$ROOT/android/release.keystore"
ALIAS="${KEYSTORE_ALIAS:-drip-client}"

if [[ -f "$KEYSTORE" ]]; then
  echo "Keystore already exists: $KEYSTORE"
  exit 1
fi

echo "Creating release keystore at android/release.keystore (alias: $ALIAS)"
keytool -genkey -v \
  -keystore "$KEYSTORE" \
  -alias "$ALIAS" \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000

echo ""
echo "Next: copy android/keystore.properties.example → android/keystore.properties"
echo "      and set storePassword / keyPassword to match what you entered above."
