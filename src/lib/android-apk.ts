/**
 * Public Android APK download (store-named file under public/downloads/).
 * Built by scripts/android-build-release.sh → public/downloads/CHEAP-SELLER.apk
 *
 * Use a versioned path so Cloudflare / browser caches cannot keep serving an old APK
 * after icon/splash rebuilds.
 */
export const ANDROID_APK_VERSION = "1.0.8";
export const ANDROID_APK_FILENAME = "CHEAP-SELLER.apk";
/** Versioned file — preferred download target (cache-bust). */
export const ANDROID_APK_VERSIONED_FILENAME = `CHEAP-SELLER-v${ANDROID_APK_VERSION}.apk`;
export const ANDROID_APK_HREF = `/downloads/${ANDROID_APK_VERSIONED_FILENAME}`;

export function isAndroidUserAgent(ua?: string): boolean {
  if (typeof ua === "string") return /Android/i.test(ua);
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent);
}

/** Trigger a browser download of the versioned release APK. */
export function downloadAndroidApk(): void {
  if (typeof document === "undefined") return;
  const a = document.createElement("a");
  a.href = ANDROID_APK_HREF;
  a.download = ANDROID_APK_FILENAME;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}
