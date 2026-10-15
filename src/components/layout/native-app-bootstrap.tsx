"use client";

import {
  clearNativeWebCaches,
  clearNativeWebCachesIfNeeded,
  configureNativeChrome,
  hideNativeSplash,
  isNativeApp,
  registerNativeBackButton,
  registerNativeNetworkReload,
} from "@/lib/native-app";
import { useEffect } from "react";

const MIN_SPLASH_MS = 400;
const MAX_SPLASH_MS = 12_000;

function waitForPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

/** Native shell bootstrap: splash, status bar, back button, network reload. */
export function NativeAppBootstrap() {
  useEffect(() => {
    if (!isNativeApp()) return;

    let removeBack: () => void = () => {};
    let removeNetwork: () => void = () => {};
    let splashHidden = false;
    const startedAt = Date.now();

    const hideSplashOnce = () => {
      if (splashHidden) return;
      splashHidden = true;
      void hideNativeSplash();
    };

    const scheduleSplashHide = () => {
      const elapsed = Date.now() - startedAt;
      const delay = Math.max(0, MIN_SPLASH_MS - elapsed);
      window.setTimeout(() => {
        void waitForPaint().then(hideSplashOnce);
      }, delay);
    };

    void (async () => {
      await clearNativeWebCachesIfNeeded();
      await configureNativeChrome();
      removeBack = await registerNativeBackButton();
      removeNetwork = await registerNativeNetworkReload();
    })();

    const onLoad = () => {
      scheduleSplashHide();
    };

    if (document.readyState === "complete") {
      onLoad();
    } else {
      window.addEventListener("load", onLoad);
    }

    const maxTimer = window.setTimeout(hideSplashOnce, MAX_SPLASH_MS);

    const onChunkError = (event: ErrorEvent) => {
      const message = event.message ?? "";
      if (!/chunk|loading css chunk|failed to fetch dynamically imported module/i.test(message)) {
        return;
      }
      void clearNativeWebCaches().then(() => {
        window.location.reload();
      });
    };
    window.addEventListener("error", onChunkError);

    return () => {
      window.removeEventListener("load", onLoad);
      window.removeEventListener("error", onChunkError);
      window.clearTimeout(maxTimer);
      removeBack();
      removeNetwork();
    };
  }, []);

  return null;
}
