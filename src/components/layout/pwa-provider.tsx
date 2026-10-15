"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { isAndroidUserAgent } from "@/lib/android-apk";
import { isNativeApp } from "@/lib/native-app";

const DISMISS_KEY = "drip-pwa-install-dismissed";
const DISMISS_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type PwaInstallContextValue = {
  /** App already running as installed standalone */
  isInstalled: boolean;
  /** Chromium deferred prompt available */
  canPromptInstall: boolean;
  /** iOS Safari — needs Share → Add to Home Screen */
  isIos: boolean;
  /** Android browser — offer store-named APK download */
  isAndroid: boolean;
  /** Show soft banner (not dismissed, not installed, installable somehow) */
  showBanner: boolean;
  /** True when we can offer any install path */
  canInstall: boolean;
  promptInstall: () => Promise<"accepted" | "dismissed" | "unavailable" | "ios">;
  dismissBanner: () => void;
  openHelp: () => void;
  helpOpen: boolean;
  setHelpOpen: (open: boolean) => void;
};

const PwaInstallContext = createContext<PwaInstallContextValue | null>(null);

function readDismissed(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const until = Number(raw);
    if (!Number.isFinite(until)) return false;
    if (Date.now() > until) {
      localStorage.removeItem(DISMISS_KEY);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function detectStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const mq = window.matchMedia("(display-mode: standalone)").matches;
  const iosStandalone =
    "standalone" in navigator &&
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  return mq || iosStandalone;
}

function detectIos(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua);
  const iPadOs =
    navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return iOS || iPadOs;
}

export function PwaProvider({ children }: { children: ReactNode }) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [dismissed, setDismissed] = useState(true);
  const [helpOpen, setHelpOpen] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setIsInstalled(detectStandalone() || isNativeApp());
    setIsIos(detectIos());
    setIsAndroid(isAndroidUserAgent());
    setDismissed(readDismissed());
    setReady(true);

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setIsInstalled(true);
      setDeferred(null);
    };

    window.addEventListener("beforeinstallprompt", onBip);
    window.addEventListener("appinstalled", onInstalled);

    // Native APK loads the live site in a WebView — skip SW to avoid stale shell cache blank screens.
    if (!isNativeApp()) {
      if (
        "serviceWorker" in navigator &&
        (window.location.protocol === "https:" ||
          window.location.hostname === "localhost" ||
          window.location.hostname === "127.0.0.1")
      ) {
        void navigator.serviceWorker.register("/sw.js").catch(() => {
          /* ignore SW failures — install UI still works when browser offers it */
        });
      }
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const canPromptInstall = Boolean(deferred) && !isInstalled;
  /** Offer install when not already running as an app (native prompt or help). */
  const canInstall = ready && !isInstalled && !isNativeApp();

  const showBanner =
    ready &&
    canInstall &&
    !dismissed &&
    (canPromptInstall || isIos || isAndroid);

  const dismissBanner = useCallback(() => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_MS));
    } catch {
      /* ignore */
    }
    setDismissed(true);
  }, []);

  const promptInstall = useCallback(async () => {
    if (isInstalled) return "unavailable" as const;
    // Android: prefer native APK download UI (handled by install-app-ui).
    if (isAndroid) {
      setHelpOpen(true);
      return "unavailable" as const;
    }
    if (deferred) {
      try {
        await deferred.prompt();
        const { outcome } = await deferred.userChoice;
        setDeferred(null);
        if (outcome === "accepted") {
          setIsInstalled(true);
        }
        return outcome;
      } catch {
        return "unavailable" as const;
      }
    }
    if (isIos) {
      setHelpOpen(true);
      return "ios" as const;
    }
    setHelpOpen(true);
    return "unavailable" as const;
  }, [deferred, isInstalled, isIos, isAndroid]);

  const openHelp = useCallback(() => setHelpOpen(true), []);

  const value = useMemo(
    () => ({
      isInstalled,
      canPromptInstall,
      isIos,
      isAndroid,
      showBanner,
      canInstall,
      promptInstall,
      dismissBanner,
      openHelp,
      helpOpen,
      setHelpOpen,
    }),
    [
      isInstalled,
      canPromptInstall,
      isIos,
      isAndroid,
      showBanner,
      canInstall,
      promptInstall,
      dismissBanner,
      openHelp,
      helpOpen,
    ],
  );

  return (
    <PwaInstallContext.Provider value={value}>
      {children}
    </PwaInstallContext.Provider>
  );
}

export function usePwaInstall(): PwaInstallContextValue {
  const ctx = useContext(PwaInstallContext);
  if (!ctx) {
    throw new Error("usePwaInstall must be used within PwaProvider");
  }
  return ctx;
}
