/**
 * Detect Capacitor native shell (Android APK).
 * Uses the injected bridge — no server-side import of @capacitor/core.
 */

/** Bump with android/app/build.gradle versionName so caches clear once per release. */
export const NATIVE_SHELL_VERSION = "1.0.8";
const NATIVE_CACHE_VERSION_KEY = "drip-native-shell-version";

export function isNativeApp(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const cap = (
      window as Window & {
        Capacitor?: { isNativePlatform?: () => boolean };
      }
    ).Capacitor;
    return Boolean(cap?.isNativePlatform?.());
  } catch {
    return false;
  }
}

export async function hideNativeSplash(): Promise<void> {
  if (!isNativeApp()) return;
  try {
    const { SplashScreen } = await import("@capacitor/splash-screen");
    await SplashScreen.hide();
  } catch {
    /* ignore */
  }
  // Also release MainActivity keepOnScreenCondition (Android 12+ Theme.SplashScreen).
  try {
    (
      window as Window & {
        DripNative?: { releaseSplash?: () => void };
      }
    ).DripNative?.releaseSplash?.();
  } catch {
    /* ignore */
  }
}

/** PWA service workers can cache stale HTML/chunks and cause a blank WebView after deploys. */
export async function clearNativeWebCaches(): Promise<void> {
  if (!isNativeApp() || typeof window === "undefined") return;
  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((reg) => reg.unregister()));
    }
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith("drip-"))
          .map((key) => caches.delete(key)),
      );
    }
  } catch {
    /* ignore */
  }
}

/**
 * Clear SW + drip-* caches only when the native shell version changes.
 * Avoids wiping HTTP/WebView cache on every cold start.
 */
export async function clearNativeWebCachesIfNeeded(): Promise<void> {
  if (!isNativeApp() || typeof window === "undefined") return;
  try {
    const stored = localStorage.getItem(NATIVE_CACHE_VERSION_KEY);
    if (stored === NATIVE_SHELL_VERSION) return;
    await clearNativeWebCaches();
    localStorage.setItem(NATIVE_CACHE_VERSION_KEY, NATIVE_SHELL_VERSION);
  } catch {
    await clearNativeWebCaches();
  }
}

export async function configureNativeChrome(): Promise<void> {
  if (!isNativeApp()) return;
  document.documentElement.classList.add("native-app");
  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    await StatusBar.setOverlaysWebView({ overlay: true });
    await StatusBar.setBackgroundColor({ color: "#0c0c0e" });
    await StatusBar.setStyle({ style: Style.Dark });
  } catch {
    /* ignore */
  }
}

export async function registerNativeBackButton(): Promise<() => void> {
  if (!isNativeApp()) return () => undefined;
  try {
    const { App } = await import("@capacitor/app");
    const handle = await App.addListener("backButton", ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back();
        return;
      }
      void App.exitApp();
    });
    return () => {
      void handle.remove();
    };
  } catch {
    return () => undefined;
  }
}

function isOfflineDocumentUrl(href: string): boolean {
  return href.includes("localhost/offline.html") || href.endsWith("/offline.html");
}

export async function registerNativeNetworkReload(): Promise<() => void> {
  if (!isNativeApp()) return () => undefined;
  try {
    const { Network } = await import("@capacitor/network");
    const handle = await Network.addListener("networkStatusChange", (status) => {
      if (!status.connected) return;
      const href = window.location.href;
      if (isOfflineDocumentUrl(href)) {
        window.location.href =
          process.env.NEXT_PUBLIC_APP_URL ?? "https://cheapseller.store";
      }
    });
    return () => {
      void handle.remove();
    };
  } catch {
    return () => undefined;
  }
}

/**
 * Mid-session connectivity for the live site (not offline.html).
 * Calls `onChange(connected)` and returns an unsubscribe.
 */
export async function registerNativeNetworkStatus(
  onChange: (connected: boolean) => void,
): Promise<() => void> {
  if (!isNativeApp()) return () => undefined;
  try {
    const { Network } = await import("@capacitor/network");
    const initial = await Network.getStatus();
    onChange(initial.connected);
    const handle = await Network.addListener("networkStatusChange", (status) => {
      onChange(status.connected);
    });
    return () => {
      void handle.remove();
    };
  } catch {
    return () => undefined;
  }
}
