"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, Globe, Sparkles, X, ArrowRight, Eye } from "lucide-react";
import Link from "next/link";
import {
  WhatsNewModal,
  WHATS_NEW_BANNER_DISMISSED_KEY,
  WHATS_NEW_STORAGE_KEY,
} from "@/components/app/whats-new-modal";
import type { SafeUser } from "@/types/user";

type Props = {
  user?: SafeUser | null;
};

export function WhatsNewBanner({ user }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [bannerVisible, setBannerVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window === "undefined") return;

    const seenTour = localStorage.getItem(WHATS_NEW_STORAGE_KEY) === "1";
    const dismissedBanner =
      localStorage.getItem(WHATS_NEW_BANNER_DISMISSED_KEY) === "1";

    if (!dismissedBanner) {
      setBannerVisible(true);
    }

    // Auto-launch the 3-step walkthrough once for first-time visitors after a gentle mount delay
    if (!seenTour) {
      const timer = window.setTimeout(() => {
        setModalOpen(true);
      }, 600);
      return () => window.clearTimeout(timer);
    }
  }, []);

  const handleDismissBanner = () => {
    setBannerVisible(false);
    if (typeof window !== "undefined") {
      localStorage.setItem(WHATS_NEW_BANNER_DISMISSED_KEY, "1");
      localStorage.setItem(WHATS_NEW_STORAGE_KEY, "1");
    }
  };

  const handleOpenTour = () => {
    setModalOpen(true);
  };

  if (!mounted) return null;

  return (
    <>
      <WhatsNewModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        user={user}
        onFinished={() => {
          // Keep banner available if user wants to re-read, but dismiss flag remains user's choice
        }}
      />

      {bannerVisible ? (
        <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/15 via-background to-accent/15 p-3.5 sm:p-4 shadow-lg shadow-primary/5">
          {/* Ambient decorative glow */}
          <div
            className="pointer-events-none absolute -right-12 -top-12 size-40 rounded-full bg-primary/20 blur-2xl"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute -left-12 -bottom-12 size-40 rounded-full bg-accent/20 blur-2xl"
            aria-hidden="true"
          />

          {/* Dismiss button positioned neatly */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2 size-7 text-muted-foreground hover:text-foreground rounded-lg z-10"
            onClick={handleDismissBanner}
            aria-label="Dismiss what's new banner"
          >
            <X className="size-3.5" />
          </Button>

          <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pr-6 sm:pr-0">
            <div className="flex items-start gap-2.5 min-w-0 flex-1">
              <div className="relative flex size-9 sm:size-10 shrink-0 items-center justify-center rounded-xl border border-primary/40 bg-primary/20 text-primary shadow-sm mt-0.5">
                <Crown className="size-4 sm:size-5 text-amber-300 fill-amber-300/20" />
              </div>

              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge
                    variant="outline"
                    className="border-primary/50 bg-primary/10 px-1.5 py-0.5 text-[9px] sm:text-[10px] font-bold text-primary"
                  >
                    <Sparkles className="mr-1 size-2.5 sm:size-3 text-primary" />
                    NEW CREATOR UPDATE
                  </Badge>
                  <span className="text-[10px] font-mono text-muted-foreground hidden xs:inline">
                    v2.0 Standalone Subdomains
                  </span>
                </div>

                <h3 className="text-xs sm:text-sm font-bold text-foreground">
                  Launch Your Custom Subdomain & Golden VIP Hub
                </h3>
                <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed line-clamp-2 sm:line-clamp-1">
                  Get your personal{" "}
                  <span className="font-mono text-foreground font-semibold">
                    {user?.username || "username"}.dripclientofficial.dev
                  </span>{" "}
                  storefront with exclusive VIP badges & instant wallet payouts.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 sm:self-center w-full sm:w-auto pt-1 sm:pt-0">
              <Button
                variant="outline"
                size="sm"
                className="h-8 flex-1 sm:flex-initial border-border/80 bg-background/60 text-xs hover:bg-accent hover:text-accent-foreground"
                onClick={handleOpenTour}
              >
                <Eye className="mr-1.5 size-3.5 text-primary" />
                <span>3-Step Tour</span>
              </Button>

              <Button
                asChild
                variant="default"
                size="sm"
                className="h-8 flex-1 sm:flex-initial bg-gradient-to-r from-primary to-accent text-xs font-bold text-primary-foreground shadow-md shadow-primary/25"
              >
                <Link href="/app/bio">
                  <Globe className="mr-1.5 size-3.5" />
                  <span>Claim Now</span>
                  <ArrowRight className="ml-1 size-3" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
