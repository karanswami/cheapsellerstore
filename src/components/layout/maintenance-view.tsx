"use client";

import { Button } from "@/components/ui/button";
import { Wrench, ChevronDown, RefreshCw, Send, MessageCircle } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { SupportChannels } from "@/lib/support-channels";

const AUTO_RETRY_SECONDS = 30;

/**
 * Floating maintenance modal / banner on the storefront.
 * Features direct Telegram & WhatsApp one-tap buttons.
 */
export function MaintenanceView({
  supportHref,
  supportChannels,
}: {
  supportHref?: string | null;
  supportChannels?: SupportChannels | null;
}) {
  const [checking, setChecking] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(AUTO_RETRY_SECONDS);
  const [minimized, setMinimized] = useState(false);
  const checkingRef = useRef(false);

  const checkAgain = useCallback(async () => {
    if (checkingRef.current) return;
    checkingRef.current = true;
    setChecking(true);
    try {
      const res = await fetch("/api/maintenance", { cache: "no-store" });
      const json = (await res.json()) as { data?: { maintenance: boolean } };
      if (json.data && !json.data.maintenance) {
        window.location.assign("/");
        return;
      }
    } catch {
      /* stay on page */
    } finally {
      checkingRef.current = false;
      setChecking(false);
      setSecondsLeft(AUTO_RETRY_SECONDS);
    }
  }, []);

  useEffect(() => {
    const tick = window.setInterval(() => {
      setSecondsLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => window.clearInterval(tick);
  }, []);

  useEffect(() => {
    if (secondsLeft > 0 || checking) return;
    void checkAgain();
  }, [secondsLeft, checking, checkAgain]);

  const telegramHref = supportChannels?.telegramHref;
  const whatsappHref = supportChannels?.whatsappHref;
  const fallbackHref = supportHref || supportChannels?.primaryHref;

  if (minimized) {
    return (
      <aside
        aria-label="Maintenance status minimized"
        className="fixed bottom-5 right-5 z-[70] animate-in fade-in slide-in-from-bottom-3 duration-300"
      >
        <button
          type="button"
          onClick={() => setMinimized(false)}
          className="flex items-center gap-2.5 rounded-full border border-amber-500/40 bg-card/90 px-4 py-2.5 text-xs font-semibold text-amber-400 shadow-[0_8px_32px_rgba(0,0,0,0.6)] backdrop-blur-xl transition hover:bg-card hover:border-amber-400 hover:scale-105 active:scale-95"
        >
          <span className="relative flex size-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-amber-500" />
          </span>
          <Wrench className="size-3.5 text-amber-400" />
          <span>Maintenance Active</span>
        </button>
      </aside>
    );
  }

  return (
    <aside
      role="status"
      aria-live="polite"
      aria-label="System maintenance notice"
      className="fixed bottom-5 inset-x-4 mx-auto max-w-lg z-[70] animate-in fade-in slide-in-from-bottom-5 duration-300"
    >
      <div className="relative overflow-hidden rounded-2xl border border-amber-500/35 bg-card/95 p-4 sm:p-5 shadow-[0_12px_44px_rgba(0,0,0,0.75)] backdrop-blur-2xl">
        {/* Ambient glow accent */}
        <div
          className="pointer-events-none absolute -top-16 -right-16 size-36 rounded-full bg-amber-500/15 blur-3xl"
          aria-hidden
        />

        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="relative mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/15 text-amber-400 shadow-inner">
              <Wrench className="size-4.5" />
              <span className="absolute -top-1 -right-1 flex size-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex size-2.5 rounded-full bg-amber-500" />
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold tracking-tight text-foreground">
                  Scheduled Maintenance
                </h2>
                <span className="rounded-md border border-amber-500/30 bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-400">
                  Upgrading
                </span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                System upgrades in progress. Store orders, deposits, and customer logins are temporarily paused.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setMinimized(true)}
            className="shrink-0 rounded-lg p-1 text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
            title="Minimize"
            aria-label="Minimize notice"
          >
            <ChevronDown className="size-4" />
          </button>
        </div>

        {/* Action bar with Telegram & WhatsApp direct links */}
        <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 border-t border-border/50 pt-3">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <RefreshCw
              className={cn("size-3 text-amber-400/90", checking && "animate-spin")}
            />
            <span className="tabular-nums">
              {checking ? "Checking status…" : `Auto-check in ${secondsLeft}s`}
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {telegramHref && (
              <Button
                asChild
                size="sm"
                variant="outline"
                className="h-7.5 border-sky-500/30 bg-sky-500/10 px-2.5 text-xs font-medium text-sky-400 hover:bg-sky-500/20 hover:border-sky-500/50"
              >
                <a href={telegramHref} target="_blank" rel="noopener noreferrer">
                  <Send className="mr-1 size-3 text-sky-400" />
                  Telegram
                </a>
              </Button>
            )}

            {whatsappHref && (
              <Button
                asChild
                size="sm"
                variant="outline"
                className="h-7.5 border-emerald-500/30 bg-emerald-500/10 px-2.5 text-xs font-medium text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/50"
              >
                <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="mr-1 size-3 text-emerald-400" />
                  WhatsApp
                </a>
              </Button>
            )}

            {!telegramHref && !whatsappHref && fallbackHref && (
              <Button
                asChild
                size="sm"
                variant="ghost"
                className="h-7.5 px-2.5 text-xs text-muted-foreground hover:text-foreground"
              >
                <a href={fallbackHref} target="_blank" rel="noopener noreferrer">
                  Support
                </a>
              </Button>
            )}

            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={checking}
              onClick={() => void checkAgain()}
              className="h-7.5 border-amber-500/30 bg-amber-500/10 px-3 text-xs font-medium text-amber-300 hover:bg-amber-500/20 hover:border-amber-500/50"
            >
              {checking ? "Checking…" : "Retry Now"}
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
}
