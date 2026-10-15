#!/usr/bin/env bash
# capacitor-assets updates ic_launcher.png but leaves stale adaptive foregrounds.
# Also syncs Android 12+ splash_logo density bitmaps from mobile-assets/icon-only.png
# (density-specific splash_logo.png otherwise keep an old magenta "D").
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RES_DIR="$ROOT/android/app/src/main/res"
ICON_SRC="$ROOT/mobile-assets/icon-only.png"

for density in ldpi mdpi hdpi xhdpi xxhdpi xxxhdpi; do
  dir="$RES_DIR/mipmap-$density"
  if [[ -f "$dir/ic_launcher.png" ]]; then
    cp "$dir/ic_launcher.png" "$dir/ic_launcher_foreground.png"
  fi
done

BG_FILE="$RES_DIR/values/ic_launcher_background.xml"
if [[ -f "$BG_FILE" ]]; then
  sed -i 's/#FFFFFF/#0c0c0e/g' "$BG_FILE"
fi

# Re-assert monochrome layer (capacitor-assets may rewrite anydpi XMLs without it).
for name in ic_launcher ic_launcher_round; do
  xml="$RES_DIR/mipmap-anydpi-v26/${name}.xml"
  if [[ -f "$xml" ]] && ! grep -q 'ic_launcher_monochrome' "$xml"; then
    cat >"$xml" <<EOF
<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
    <monochrome android:drawable="@drawable/ic_launcher_monochrome"/>
</adaptive-icon>
EOF
  fi
done

# Refresh splash_logo at every density from the current brand icon.
# Android picks density folders over drawable/splash_logo.png — stale ones show the old D.
if [[ -f "$ICON_SRC" ]] && [[ -d "$ROOT/node_modules/sharp" ]]; then
  node <<EOF
const sharp = require("$ROOT/node_modules/sharp");
const fs = require("fs");
const path = require("path");
const src = "$ICON_SRC";
const resDir = "$RES_DIR";
const splashSizes = { mdpi: 288, hdpi: 432, xhdpi: 576, xxhdpi: 864, xxxhdpi: 1152 };

(async () => {
  async function writePadded(outPath, size) {
    const pad = Math.round(size * 0.18);
    const inner = size - pad * 2;
    const logo = await sharp(src).resize(inner, inner, { fit: "cover" }).png().toBuffer();
    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 12, g: 12, b: 14, alpha: 1 },
      },
    })
      .composite([{ input: logo, left: pad, top: pad }])
      .png()
      .toFile(outPath);
  }

  for (const [density, size] of Object.entries(splashSizes)) {
    const dir = path.join(resDir, \`drawable-\${density}\`);
    fs.mkdirSync(dir, { recursive: true });
    await writePadded(path.join(dir, "splash_logo.png"), size);
  }
  await writePadded(path.join(resDir, "drawable", "splash_logo.png"), 512);
  console.log("==> Synced splash_logo density bitmaps from mobile-assets/icon-only.png");
})();
EOF
fi

echo "==> Synced adaptive icon foregrounds + dark launcher background + monochrome"
