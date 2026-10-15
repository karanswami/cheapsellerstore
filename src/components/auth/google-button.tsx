"use client";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

type GoogleSignInButtonProps = {
  nextPath?: string | null;
  referralCode?: string | null;
  label?: string;
};

export function GoogleSignInButton({
  nextPath,
  referralCode,
  label = "Continue with Google",
}: GoogleSignInButtonProps) {
  const [enabled, setEnabled] = useState(false);
  const [checked, setChecked] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/auth/google/status");
        const json = (await res.json()) as { data?: { enabled?: boolean } };
        if (!cancelled) setEnabled(Boolean(json.data?.enabled));
      } catch {
        if (!cancelled) setEnabled(false);
      } finally {
        if (!cancelled) setChecked(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!checked) {
    return (
      <div className="space-y-3 min-h-[72px]" aria-hidden>
        <Skeleton className="h-11 w-full rounded-xl" />
        <div className="relative py-0.5 text-center text-[11px] text-muted-foreground">
          <span className="absolute inset-x-0 top-1/2 border-t border-border/60" />
          <span className="relative bg-card px-2 text-transparent">or</span>
        </div>
      </div>
    );
  }

  if (!enabled) return null;

  const params = new URLSearchParams();
  if (nextPath) params.set("next", nextPath);
  if (referralCode?.trim()) params.set("ref", referralCode.trim());
  const qs = params.toString();
  const href = qs ? `/api/auth/google?${qs}` : "/api/auth/google";

  const handleClick = (e: React.MouseEvent) => {
    if (redirecting) {
      e.preventDefault();
      return;
    }
    setRedirecting(true);
  };

  return (
    <div className="space-y-3 min-h-[72px]">
      <Button
        type="button"
        variant="outline"
        size="lg"
        disabled={redirecting}
        onClick={handleClick}
        className={cn(
          "w-full rounded-xl border-border/80 bg-background/55 font-medium shadow-[0_0_0_1px_color-mix(in_oklab,var(--primary)_10%,transparent)] transition-all",
          "supports-backdrop-filter:backdrop-blur-sm hover:bg-background/80 hover:border-primary/40 active:scale-[0.99]",
          redirecting && "opacity-80 cursor-wait",
        )}
        asChild
      >
        <a href={href} onClick={handleClick}>
          {redirecting ? (
            <>
              <span className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent shrink-0" />
              <span>Connecting to Google…</span>
            </>
          ) : (
            <>
              <GoogleGlyph />
              <span>{label}</span>
            </>
          )}
        </a>
      </Button>
      <div className="relative py-0.5 text-center text-[11px] text-muted-foreground select-none">
        <span className="absolute inset-x-0 top-1/2 border-t border-border/60" />
        <span className="relative bg-card px-2.5">or continue with email</span>
      </div>
    </div>
  );
}

function GoogleGlyph() {
  return (
    <svg
      className="size-5 shrink-0"
      viewBox="0 0 24 24"
      aria-hidden
      focusable="false"
    >
      <path
        fill="#EA4335"
        d="M12 10.2v3.6h5.1c-.2 1.2-1.5 3.6-5.1 3.6-3.1 0-5.6-2.5-5.6-5.6S8.9 6.2 12 6.2c1.8 0 3 .7 3.7 1.4l2.5-2.4C16.7 3.7 14.6 2.7 12 2.7 6.9 2.7 2.7 6.9 2.7 12S6.9 21.3 12 21.3c5.5 0 9.1-3.9 9.1-9.3 0-.6-.1-1.1-.2-1.6H12z"
      />
      <path
        fill="#34A853"
        d="M3.9 7.4l3 2.2C7.7 7.5 9.7 6.2 12 6.2c1.8 0 3 .7 3.7 1.4l2.5-2.4C16.7 3.7 14.6 2.7 12 2.7 8.5 2.7 5.5 4.7 3.9 7.4z"
      />
      <path
        fill="#4A90E2"
        d="M12 21.3c2.5 0 4.6-.8 6.1-2.2l-2.9-2.3c-.8.6-1.9 1-3.2 1-3.5 0-6.5-2.4-7.5-5.6l-3 2.3C3.1 18.6 7.1 21.3 12 21.3z"
      />
      <path
        fill="#FBBC05"
        d="M4.5 14.2c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2l-3-2.3C1.2 9.3 1 10.6 1 12s.2 2.7.5 4l3-1.8z"
      />
    </svg>
  );
}
