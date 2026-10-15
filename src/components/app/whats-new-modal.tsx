"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Crown,
  ExternalLink,
  Globe,
  Lock,
  MessageCircle,
  Share2,
  ShieldCheck,
  Sparkles,
  Wallet,
  Zap,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { SafeUser } from "@/types/user";

export const WHATS_NEW_STORAGE_KEY = "drip_whats_new_v2_seen";
export const WHATS_NEW_BANNER_DISMISSED_KEY = "drip_whats_new_banner_v1_dismissed";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: SafeUser | null;
  onFinished?: () => void;
};

export function WhatsNewModal({
  open,
  onOpenChange,
  user,
  onFinished,
}: Props) {
  const [step, setStep] = useState(1);
  const username = user?.username || "creator";

  // Reset to step 1 whenever modal opens
  useEffect(() => {
    if (open) {
      setStep(1);
    }
  }, [open]);

  const handleFinish = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem(WHATS_NEW_STORAGE_KEY, "1");
    }
    onOpenChange(false);
    onFinished?.();
  };

  const steps = [
    {
      id: 1,
      badge: "VIP EXCLUSIVE SUBDOMAIN",
      badgeTone: "border-primary/40 bg-primary/10 text-primary font-bold",
      icon: Globe,
      iconBg: "bg-primary/20 text-primary border border-primary/30 shadow-[0_0_20px_rgba(232,79,255,0.3)]",
      title: "Your Dedicated .dev Subdomain",
      tagline: `https://${username}.dripclientofficial.dev`,
      description:
        "Exclusive to Drip VIP members — launch your own dedicated standalone creator storefront with zero store clutter, custom branding, and direct link sharing.",
      highlights: [
        {
          title: "VIP Dedicated Subdomain",
          desc: "Activate your personal username.dripclientofficial.dev link with VIP status.",
        },
        {
          title: "Real-Time Visual Studio",
          desc: "Live mobile simulator to customize themes, banners & taglines.",
        },
        {
          title: "Shareable Link Anywhere",
          desc: "Drop your custom .dev link on TikTok, YouTube & Discord.",
        },
      ],
      preview: (
        <div className="relative overflow-hidden rounded-xl border border-primary/30 bg-background/80 p-3 shadow-inner">
          <div className="mb-2.5 flex items-center justify-between border-b border-border/60 pb-2">
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-red-500/80" />
              <span className="size-2 rounded-full bg-yellow-500/80" />
              <span className="size-2 rounded-full bg-emerald-500/80" />
            </div>
            <div className="flex items-center gap-1.5 rounded-full border border-border/80 bg-muted/60 px-3 py-0.5 text-[11px] font-mono text-muted-foreground">
              <Lock className="size-3 text-emerald-400" />
              <span className="text-foreground font-medium">{username}</span>
              <span>.dripclientofficial.dev</span>
            </div>
            <div className="size-2" />
          </div>
          <div className="flex items-center gap-3 rounded-lg bg-card/60 p-2.5 border border-border/40">
            <div className="flex size-10 items-center justify-center rounded-full bg-primary/15 border border-primary/30 text-primary font-bold text-sm">
              {username.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="truncate text-xs font-semibold text-foreground">@{username}</p>
                <Badge variant="outline" className="h-4 border-amber-500/40 bg-amber-500/10 px-1 text-[9px] font-bold text-amber-300">
                  <Crown className="mr-0.5 size-2.5" /> VIP
                </Badge>
              </div>
              <p className="text-[10px] text-muted-foreground truncate">Official Creator Store & Verified Hub</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 2,
      badge: "VIP STATUS & BADGES",
      badgeTone: "border-amber-500/40 bg-amber-500/10 text-amber-300",
      icon: Crown,
      iconBg: "bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.3)]",
      title: "Prestigious Golden VIP Perks",
      tagline: "Exclusive Badge & Priority Queues",
      description:
        "Stand out as an elite creator. Drip VIP gives you instant authority with verified golden badges across profiles, reviews, and customer leaderboards.",
      highlights: [
        {
          title: "Golden VIP Badge",
          desc: "Shining crown badge pinned to your bio, reviews & rankings.",
        },
        {
          title: "Priority Support Lane",
          desc: "VIP tickets receive priority response from our dedicated desk.",
        },
        {
          title: "Maximum Buyer Trust",
          desc: "Verified status gives your customers 100% purchase confidence.",
        },
      ],
      preview: (
        <div className="relative overflow-hidden rounded-xl border border-amber-500/30 bg-gradient-to-b from-amber-500/10 to-transparent p-4">
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="relative flex items-center justify-center">
              <div className="absolute -inset-2 rounded-full bg-amber-500/20 blur-md animate-pulse" />
              <div className="relative flex size-14 items-center justify-center rounded-2xl border border-amber-500/50 bg-background/90 text-amber-400 shadow-lg">
                <Crown className="size-7 text-amber-400 fill-amber-400/20" />
              </div>
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/15 px-2.5 py-0.5 text-xs font-bold text-amber-300">
                <Sparkles className="size-3.5" />
                <span>OFFICIAL VIP CREATOR</span>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Lifetime Creator Privilege · Verified Drip Identity
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 3,
      badge: "SOCIAL BIO & EARNINGS",
      badgeTone: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
      icon: Zap,
      iconBg: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.3)]",
      title: "All-in-One Social Bio & Sales",
      tagline: "Monetize Your Traffic Instantly",
      description:
        "Connect your Discord, Telegram, YouTube videos, and custom links in one place. Receive direct automated wallet payouts whenever fans buy through your bio.",
      highlights: [
        {
          title: "Custom Social Links",
          desc: "Link Discord server, Telegram channel, and YouTube embeds.",
        },
        {
          title: "Featured Mod Products",
          desc: "Curate and feature your favorite keys directly on your storefront.",
        },
        {
          title: "Instant Wallet Deposits",
          desc: "Earnings credit automatically to your Drip USD wallet.",
        },
      ],
      preview: (
        <div className="grid grid-cols-2 gap-2 text-left">
          <div className="flex items-center gap-2 rounded-lg border border-border/80 bg-card/60 p-2.5">
            <div className="flex size-7 items-center justify-center rounded-md bg-[#5865F2]/20 text-[#5865F2]">
              <MessageCircle className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold text-foreground truncate">Discord Server</p>
              <p className="text-[9px] text-muted-foreground">1-Tap Join</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-border/80 bg-card/60 p-2.5">
            <div className="flex size-7 items-center justify-center rounded-md bg-[#229ED9]/20 text-[#229ED9]">
              <Share2 className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold text-foreground truncate">Telegram Hub</p>
              <p className="text-[9px] text-muted-foreground">Direct Updates</p>
            </div>
          </div>
          <div className="col-span-2 flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2.5">
            <div className="flex items-center gap-2">
              <Wallet className="size-4 text-emerald-400" />
              <span className="text-[11px] font-medium text-emerald-300">Instant Wallet Payouts</span>
            </div>
            <span className="text-xs font-bold text-emerald-400 font-mono">100% USD Direct</span>
          </div>
        </div>
      ),
    },
  ];

  const currentStep = steps[step - 1];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="lg"
        className="flex max-h-[min(90dvh,580px)] w-full max-w-[calc(100%-1.25rem)] sm:max-w-lg flex-col gap-0 overflow-hidden p-0 border border-primary/30 bg-card shadow-2xl"
      >
        {/* Header Progress Band (Fixed Shrink-0) */}
        <div className="shrink-0 relative border-b border-border/60 bg-muted/40 px-4 py-3 sm:px-5 sm:py-3.5">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-md bg-primary/20 text-primary">
                <Sparkles className="size-3.5" />
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                What&apos;s New in Drip
              </span>
            </div>
            <Badge variant="outline" className={cn("text-[10px] font-mono px-2 py-0.5", currentStep.badgeTone)}>
              Step {step} of 3
            </Badge>
          </div>

          {/* Progress Bars */}
          <div className="grid grid-cols-3 gap-1.5">
            {steps.map((s) => (
              <div
                key={s.id}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  step >= s.id
                    ? "bg-gradient-to-r from-primary to-accent"
                    : "bg-muted-foreground/20"
                )}
              />
            ))}
          </div>
        </div>

        {/* Modal Body with Dedicated Smooth Scroll Container */}
        <div className="flex-1 overflow-y-auto overscroll-contain space-y-3.5 p-4 sm:p-5">
          {/* Visual Showcase Card */}
          {currentStep.preview}

          {/* Title & Description */}
          <div className="space-y-1 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <div className={cn("flex size-6 sm:size-7 items-center justify-center rounded-lg", currentStep.iconBg)}>
                <currentStep.icon className="size-3.5 sm:size-4" />
              </div>
              <DialogTitle className="text-sm sm:text-base font-bold text-foreground">
                {currentStep.title}
              </DialogTitle>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {currentStep.description}
            </p>
          </div>

          {/* Feature Highlights Grid */}
          <div className="space-y-1.5 rounded-xl border border-border/60 bg-muted/30 p-2.5 sm:p-3">
            {currentStep.highlights.map((h, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-primary" />
                <div className="min-w-0">
                  <span className="font-semibold text-foreground">{h.title}: </span>
                  <span className="text-muted-foreground">{h.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Navigation (Fixed Shrink-0) */}
        <div className="shrink-0 flex flex-col-reverse sm:flex-row items-center justify-between gap-2 border-t border-border/60 bg-muted/40 px-4 py-3 sm:px-5 sm:py-3.5">
          <div className="flex w-full sm:w-auto items-center gap-2">
            {step > 1 ? (
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-3 text-xs flex-1 sm:flex-initial"
                onClick={() => setStep((s) => s - 1)}
              >
                <ArrowLeft className="mr-1 size-3.5" />
                Back
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 px-3 text-xs text-muted-foreground hover:text-foreground flex-1 sm:flex-initial"
                onClick={handleFinish}
              >
                Skip Tour
              </Button>
            )}
          </div>

          <div className="flex w-full sm:w-auto items-center gap-2">
            {step < 3 ? (
              <Button
                variant="default"
                size="sm"
                className="h-9 px-4 text-xs font-semibold flex-1 sm:flex-initial bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-md shadow-primary/20"
                onClick={() => setStep((s) => s + 1)}
              >
                <span>Next Feature</span>
                <ArrowRight className="ml-1.5 size-3.5" />
              </Button>
            ) : (
              <div className="flex w-full sm:w-auto items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 px-3 text-xs flex-1 sm:flex-initial"
                  onClick={handleFinish}
                >
                  Got It
                </Button>
                <Button
                  asChild
                  variant="default"
                  size="sm"
                  className="h-9 px-4 text-xs font-bold flex-1 sm:flex-initial bg-gradient-to-r from-primary via-accent to-primary text-primary-foreground shadow-lg shadow-primary/30"
                  onClick={handleFinish}
                >
                  <Link href="/app/bio">
                    <Crown className="mr-1.5 size-3.5 text-amber-300" />
                    <span>Explore Bio & VIP</span>
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
