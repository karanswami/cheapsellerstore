"use client";

import { useEffect } from "react";
import {
  clearNativeWebCachesIfNeeded,
  configureNativeChrome,
  hideNativeSplash,
  isNativeApp,
  registerNativeBackButton,
  registerNativeNetworkReload,
} from "@/lib/native-app";

/** One-time client boot: PWA service worker on the web, status bar / back button / splash in the Android shell. */
export function AppBoot() {
  useEffect(() => {
    const cleanups: Array<() => void> = [];
    let cancelled = false;

    if (isNativeApp()) {
      void (async () => {
        await clearNativeWebCachesIfNeeded();
        await configureNativeChrome();
        const offBack = await registerNativeBackButton();
        const offNet = await registerNativeNetworkReload();
        if (cancelled) {
          offBack();
          offNet();
        } else cleanups.push(offBack, offNet);
        await hideNativeSplash();
      })();
    } else if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    if (window.matchMedia("(display-mode: standalone)").matches) document.documentElement.classList.add("standalone");

    return () => {
      cancelled = true;
      cleanups.forEach((fn) => fn());
    };
  }, []);

  return null;
}
