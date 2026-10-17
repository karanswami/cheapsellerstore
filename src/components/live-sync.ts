"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

const POLL_MS = 5000;
/** Fired on window after a live refresh, for client state that isn't derived from props. */
export const LIVE_EVENT = "live:update";

/**
 * Keeps /app pages current without a reload: polls a tiny fingerprint of the
 * customer's data and re-renders the server tree when it changes. Checks right
 * away when the tab regains focus or a push lands.
 */
export function useLiveSync() {
  const router = useRouter();
  const stamp = useRef<string | null>(null);

  useEffect(() => {
    let alive = true;
    let inFlight = false;

    async function check() {
      if (inFlight || document.visibilityState !== "visible") return;
      inFlight = true;
      try {
        const res = await fetch("/api/live", { cache: "no-store" });
        if (!res.ok || !alive) return;
        const next = (await res.json()).data.stamp as string;
        const prev = stamp.current;
        stamp.current = next;
        if (prev === null || prev === next) return;
        router.refresh();
        window.dispatchEvent(new Event(LIVE_EVENT));
      } catch {
        // offline: try again next tick
      } finally {
        inFlight = false;
      }
    }

    void check();
    const timer = window.setInterval(() => void check(), POLL_MS);
    const onShow = () => void check();
    const onMessage = (e: MessageEvent) => e.data?.type === "push-notification" && void check();
    document.addEventListener("visibilitychange", onShow);
    window.addEventListener("focus", onShow);
    window.addEventListener("online", onShow);
    navigator.serviceWorker?.addEventListener("message", onMessage);
    return () => {
      alive = false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onShow);
      window.removeEventListener("focus", onShow);
      window.removeEventListener("online", onShow);
      navigator.serviceWorker?.removeEventListener("message", onMessage);
    };
  }, [router]);
}
