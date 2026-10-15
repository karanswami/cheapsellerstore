"use client";

import { isNativeApp } from "@/lib/native-app";
import { WifiOff } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * Mid-session offline banner for browser / PWA (native uses NativeOfflineBanner).
 */
export function OfflineBanner() {
  const [offline, setOffline] = useState(false);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (isNativeApp()) return;
    setEnabled(true);
    const sync = () => setOffline(!navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  if (!enabled || !offline) return null;

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
            Check your connection, then retry.
          </p>
        </div>
        <button
          type="button"
          className="pressable shrink-0 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    </div>
  );
}
