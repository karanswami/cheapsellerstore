"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { isStandaloneBioRoute } from "@/lib/profile";
import { isSystemStatusPath } from "@/lib/system-status-paths";
import {
  ArrowRight,
  BadgePercent,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Sparkles,
  Store,
  Users,
  Zap,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/** Storage key for tracking 48h dismissal timestamp */
export const RESELLER_POPUP_STORAGE_KEY = "drip_reseller_apply_popup_last_seen";

/** 48 hours in milliseconds (48 * 60 * 60 * 1000) */
export const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;

export function ResellerApplyPopup() {
  const { user, loading, openAuth } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (!hasMounted || loading) return;

    // STRICTLY ONLY for logged-in non-reseller retail users (role === "USER")
    // Non-logged-in guests, Sellers, Resellers, and Admins are excluded.
    if (!user || user.role !== "USER") {
      return;
    }

    // Do not show on system status screens or when already on the become-seller application page
    if (
      isSystemStatusPath(pathname) ||
      isStandaloneBioRoute(pathname) ||
      pathname.startsWith("/app/become-seller") ||
      pathname.startsWith("/app/become-reseller")
    ) {
      return;
    }

    try {
      const userStorageKey = `${RESELLER_POPUP_STORAGE_KEY}_${user.id}`;
      const lastSeenStr =
        localStorage.getItem(userStorageKey) ||
        localStorage.getItem(RESELLER_POPUP_STORAGE_KEY);

      if (lastSeenStr) {
        const lastSeen = parseInt(lastSeenStr, 10);
        if (Number.isFinite(lastSeen)) {
          const elapsed = Date.now() - lastSeen;
          if (elapsed < FORTY_EIGHT_HOURS_MS) {
            // Still within the 48-hour cooldown window
            return;
          }
        }
      }
    } catch {
      // Ignore localStorage access errors
    }

    // Delay popup slightly to avoid interrupting initial paint/hydration
    const timer = setTimeout(() => {
      setOpen(true);
    }, 1500);

    return () => clearTimeout(timer);
  }, [hasMounted, loading, user, pathname]);

  function markDismissed() {
    try {
      const now = String(Date.now());
      if (user?.id) {
        localStorage.setItem(`${RESELLER_POPUP_STORAGE_KEY}_${user.id}`, now);
      }
      localStorage.setItem(RESELLER_POPUP_STORAGE_KEY, now);
    } catch {
      // Ignore storage errors
    }
  }

  function handleClose(isOpen: boolean) {
    if (!isOpen) {
      markDismissed();
      setOpen(false);
    } else {
      setOpen(true);
    }
  }

  function handleDismissLater() {
    markDismissed();
    setOpen(false);
  }

  function handleApply() {
    markDismissed();
    setOpen(false);
    router.push("/app/become-seller");
  }

  if (!hasMounted) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        size="lg"
        showCloseButton={true}
        className="max-h-[min(94dvh,680px)] overflow-hidden border border-primary/30 bg-card/95 p-0 shadow-[var(--glow-strong)] backdrop-blur-xl sm:max-w-lg"
      >
        {/* Glow accent band & Header */}
        <div className="relative overflow-hidden border-b border-border/40 bg-gradient-to-b from-primary/15 via-primary/5 to-transparent px-5 pt-6 pb-4 sm:px-6">
          {/* Subtle decorative glow orb */}
          <div
            className="pointer-events-none absolute -top-12 -right-12 size-36 rounded-full bg-primary/20 blur-2xl"
            aria-hidden
          />

          <div className="relative flex flex-col gap-2.5">
            <div className="inline-flex w-fit items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary shadow-[0_0_12px_rgba(16, 185, 129,0.2)]">
              <Sparkles className="size-3.5 animate-pulse" />
              <span>PARTNER INVITATION</span>
            </div>

            <DialogHeader className="gap-1 text-left">
              <DialogTitle className="text-xl font-bold tracking-tight sm:text-2xl">
                Become an Official Reseller
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Unlock exclusive wholesale pricing, earn high margins, and scale your digital sales with automated delivery.
              </DialogDescription>
            </DialogHeader>
          </div>
        </div>

        {/* Value Perks List */}
        <div className="space-y-3.5 overflow-y-auto px-5 py-4 sm:px-6">
          <div className="grid gap-2.5 sm:grid-cols-2">
            {/* Perk 1 */}
            <div className="flex items-start gap-3 rounded-xl border border-border/50 bg-background/60 p-3 shadow-xs">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <BadgePercent className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground">Wholesale Prices</p>
                <p className="text-[11px] text-muted-foreground leading-tight">
                  Enjoy deep discounts on all keys & software.
                </p>
              </div>
            </div>

            {/* Perk 2 */}
            <div className="flex items-start gap-3 rounded-xl border border-border/50 bg-background/60 p-3 shadow-xs">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
                <Zap className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground">Instant 24/7 Delivery</p>
                <p className="text-[11px] text-muted-foreground leading-tight">
                  Automated fulfillment & secure API access.
                </p>
              </div>
            </div>

            {/* Perk 3 */}
            <div className="flex items-start gap-3 rounded-xl border border-border/50 bg-background/60 p-3 shadow-xs">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sky-500/15 text-sky-400">
                <Users className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground">Sub-Reseller Network</p>
                <p className="text-[11px] text-muted-foreground leading-tight">
                  Create, manage & fund your own sub-sellers.
                </p>
              </div>
            </div>

            {/* Perk 4 */}
            <div className="flex items-start gap-3 rounded-xl border border-border/50 bg-background/60 p-3 shadow-xs">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-400">
                <ShieldCheck className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground">Priority Support</p>
                <p className="text-[11px] text-muted-foreground leading-tight">
                  Dedicated admin line & high-stock allocations.
                </p>
              </div>
            </div>
          </div>

          {/* Guarantee banner */}
          <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
            <CheckCircle2 className="size-4 shrink-0 text-primary" />
            <span>
              Instant activation available upon admin approval or automated review.
            </span>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex flex-col-reverse gap-2 border-t border-border/40 bg-muted/30 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleDismissLater}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            <Clock className="mr-1.5 size-3.5" />
            Remind me in 48h
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleApply}
            className="group font-medium shadow-[var(--glow-soft)]"
          >
            <Store className="mr-1.5 size-4" />
            Apply for Reseller
            <ArrowRight className="ml-1.5 size-3.5 transition-transform group-hover:translate-x-0.5" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
