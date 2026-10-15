"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { useWebPush } from "@/hooks/use-web-push";
import { Bell, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const PUSH_PROMPT_DISMISS_KEY = "drip_push_prompt_dismissed_at";
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function WebPushPrompt() {
  const { user } = useAuth();
  const pathname = usePathname();
  const { supported, permission, isSubscribed, loading, subscribe } = useWebPush();
  const [visible, setVisible] = useState(false);
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    // Only show if supported, permission is default, not already subscribed, not loading, and user is logged in
    if (!supported || loading || isSubscribed || permission !== "default" || !user) {
      setVisible(false);
      return;
    }

    // Check dismissal cooldown
    try {
      const dismissedAt = localStorage.getItem(PUSH_PROMPT_DISMISS_KEY);
      if (dismissedAt) {
        const timePassed = Date.now() - Number(dismissedAt);
        if (timePassed < DISMISS_DURATION_MS) {
          setVisible(false);
          return;
        }
      }
    } catch {
      // Ignore storage errors
    }

    // Delay slightly after page load so it's not jarring
    const timer = setTimeout(() => {
      setVisible(true);
    }, 2500);

    return () => clearTimeout(timer);
  }, [supported, loading, isSubscribed, permission, user, pathname]);

  function dismiss() {
    setVisible(false);
    try {
      localStorage.setItem(PUSH_PROMPT_DISMISS_KEY, String(Date.now()));
    } catch {
      // Ignore
    }
  }

  async function handleEnable() {
    setSubscribing(true);
    const success = await subscribe();
    setSubscribing(false);
    if (success) {
      setVisible(false);
    }
  }

  if (!visible) return null;

  return (
    <aside
      aria-label="Push notifications"
      className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md animate-in fade-in slide-in-from-bottom-4 duration-300 sm:bottom-6 sm:left-auto sm:right-6"
    >
      <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-card/95 p-4 shadow-2xl backdrop-blur-xl ring-1 ring-white/10">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-primary">
            <Bell className="size-5 animate-bounce" aria-hidden />
          </div>

          <div className="min-w-0 flex-1 pr-6">
            <h4 className="text-sm font-semibold tracking-tight text-foreground">
              Turn on push notifications
            </h4>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Get instant alerts for key purchases, balance top-ups, and store news.
            </p>

            <div className="mt-3 flex items-center gap-2">
              <Button
                size="sm"
                className="h-8 rounded-lg px-3 text-xs shadow-md shadow-primary/25"
                disabled={subscribing}
                onClick={handleEnable}
              >
                {subscribing ? "Enabling..." : "Enable alerts"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 rounded-lg px-2.5 text-xs text-muted-foreground hover:text-foreground"
                onClick={dismiss}
              >
                Maybe later
              </Button>
            </div>
          </div>

          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss notification prompt"
            className="absolute right-3 top-3 rounded-lg p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
