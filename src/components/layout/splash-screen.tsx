"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { useSiteConfig } from "@/components/theme/site-config-provider";
import { isNativeApp } from "@/lib/native-app";
import { isStandaloneBioRoute } from "@/lib/profile";
import { isSystemStatusPath } from "@/lib/system-status-paths";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import styles from "./splash-screen.module.css";

const EXIT_MS = 240;
/** Keep the brand moment on screen even if auth hydrates instantly. */
const MIN_VISIBLE_MS = 3000;
/** CSS + JS hard cap — works even if hydration / effects never run. */
const MAX_VISIBLE_MS = 3000;

/**
 * Boot splash over the first paint.
 * CSS Module animation clears even when client JS fails to hydrate
 * (CursorBrowser / extension / chunk errors). JS dismisses after auth is ready
 * and the minimum display time has elapsed.
 *
 * No inline <style> — React 19 can shift DOM nodes around injected style tags
 * and cascade hydration mismatches into the sidebar tree.
 */
export function SplashScreen({ isBioInitial = false }: { isBioInitial?: boolean }) {
  const { loading } = useAuth();
  const site = useSiteConfig();
  const pathname = usePathname();
  const isBio = isBioInitial || isStandaloneBioRoute(pathname);
  const [visible, setVisible] = useState(!isBio);
  const [exiting, setExiting] = useState(false);
  const [nativeApp, setNativeApp] = useState(false);
  const dismissedRef = useRef(isBio);
  const startedAtRef = useRef(0);
  const onStatusScreen = isSystemStatusPath(pathname);


  useEffect(() => {
    if (isBio) {
      dismissedRef.current = true;
      setVisible(false);
      return;
    }
    startedAtRef.current = Date.now();
    if (isNativeApp() || onStatusScreen) {
      setNativeApp(isNativeApp());
      dismissedRef.current = true;
      setVisible(false);
    }
  }, [onStatusScreen, isBio]);

  function dismiss() {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    setExiting(true);
    window.setTimeout(() => setVisible(false), EXIT_MS);
  }

  // Hold for MIN_VISIBLE_MS, then dismiss once session hydrate finishes.
  useEffect(() => {
    if (nativeApp || loading) return;
    const elapsed = Date.now() - startedAtRef.current;
    const remaining = Math.max(0, MIN_VISIBLE_MS - elapsed);
    const t = window.setTimeout(() => dismiss(), remaining);
    return () => window.clearTimeout(t);
  }, [loading, nativeApp]);

  // JS failsafe (backup for CSS animation).
  useEffect(() => {
    if (nativeApp) return;
    const t = window.setTimeout(() => dismiss(), MAX_VISIBLE_MS);
    return () => window.clearTimeout(t);
  }, [nativeApp]);

  if (nativeApp || onStatusScreen || !visible) return null;

  return (
    <div
      className={cn(
        styles.root,
        "fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background",
        exiting && styles.rootExiting,
      )}
      role="status"
      aria-live="polite"
      aria-label={`Loading ${site.siteName}`}
      aria-busy={!exiting}
      suppressHydrationWarning
      onAnimationEnd={(e) => {
        // Ignore bubbled child animations (title / bg / logo / loader).
        if (e.target !== e.currentTarget) return;
        if (
          e.animationName.includes("drip-splash-sequence") ||
          e.animationName.includes("drip-splash-exit")
        ) {
          dismissedRef.current = true;
          setVisible(false);
        }
      }}
    >
      <div className={styles.inner}>
        <div className={styles.logoStack}>
          <div className={styles.logoFrame} aria-hidden>
            <span className={styles.logoRing} />
            {site.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={site.logoUrl}
                alt=""
                className={cn("object-contain", styles.logoMark)}
                aria-hidden
              />
            ) : (
              <span className={styles.logoFallback} aria-hidden>
                {site.initial}
              </span>
            )}
          </div>

          <p className={styles.title}>{site.siteName}</p>

          <div className={styles.loader} aria-hidden>
            <div className={styles.loaderTrack}>
              <span className={styles.loaderBar} />
            </div>
            <div className={styles.loaderDots}>
              <span className={styles.loaderDot} />
              <span className={styles.loaderDot} />
              <span className={styles.loaderDot} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
