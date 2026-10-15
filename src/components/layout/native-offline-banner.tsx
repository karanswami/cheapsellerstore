"use client";

import { isNativeApp, registerNativeNetworkStatus } from "@/lib/native-app";
import { WifiOff } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * Compact native-only banner when connectivity drops mid-session.
 * Does not force navigation to offline.html (main-frame errors still do).
 */
export function NativeOfflineBanner() {
  const [offline, setOffline] = useState(false);
  const [native, setNative] = useState(false);

  useEffect(() => {
    if (!isNativeApp()) return;
    setNative(true);
    let remove: () => void = () => {};
    void registerNativeNetworkStatus((connected) => {
      setOffline(!connected);
    }).then((unsub) => {
      remove = unsub;
    });
    return () => remove();
  }, []);

  if (!native || !offline) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-0 z-[90] border-t border-border/60 bg-background/95 px-4 py-3 backdrop-blur-md"
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
    >
      <div className="mx-auto flex max-w-lg items-center gap-3">
        <WifiOff className="size-5 shrink-0 text-primary" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">You&apos;re offline</p>
          <p className="text-xs text-muted-foreground">
            Check Wi‑Fi or mobile data, then retry.
          </p>
        </div>
        <button
          type="button"
          className="shrink-0 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    </div>
  );
}
