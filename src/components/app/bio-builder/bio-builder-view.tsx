"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PremiumBadge } from "@/components/ui/premium-badge";
import {
  CustomReferralDialog,
  PremiumPurchaseDialog,
  UsernameChangeDialog,
} from "@/components/app/premium-dialogs";
import type { BioCustomLink, BioThemePreset, SafeUser } from "@/types/user";
import {
  AtSign,
  Copy,
  Crown,
  ExternalLink,
  Gift,
  Globe,
  Layers,
  Lock,
  Palette,
  Pencil,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Smartphone,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import {
  EditBioProfileDialog,
  ManageBioLinksDialog,
  ShowcaseProductsDialog,
  ThemePickerBioDialog,
  THEME_PRESETS,
} from "./bio-dialogs";
import { PublicProfileView } from "@/components/app/public-profile-view";
import { WhatsNewModal } from "@/components/app/whats-new-modal";
import type { ProductCardData } from "@/types/product";

type BioBuilderViewProps = {
  initialUser: SafeUser;
  catalogProducts: { id: string; title: string; category?: { name: string } | null }[];
  featuredProductsData: ProductCardData[];
  orderCount: number;
  totalSpent: number;
  averageRating: number | null;
  vouchCount: number;
  referralCode?: string | null;
  premiumPriceUsd?: number;
};

export function BioBuilderView({
  initialUser,
  catalogProducts,
  featuredProductsData,
  orderCount,
  totalSpent,
  averageRating,
  vouchCount,
  referralCode,
  premiumPriceUsd = 10,
}: BioBuilderViewProps) {
  const [user, setUser] = useState<SafeUser>(initialUser);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [linksDialogOpen, setLinksDialogOpen] = useState(false);
  const [showcaseDialogOpen, setShowcaseDialogOpen] = useState(false);
  const [themeDialogOpen, setThemeDialogOpen] = useState(false);
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false);
  const [usernameDialogOpen, setUsernameDialogOpen] = useState(false);
  const [referralDialogOpen, setReferralDialogOpen] = useState(false);
  const [whatsNewOpen, setWhatsNewOpen] = useState(false);

  const customLinks = (user.bioLinks as BioCustomLink[]) || [];
  const activeTheme = THEME_PRESETS.find((t) => t.id === (user.bioTheme || "DEFAULT")) || THEME_PRESETS[0];

  const liveProfileUrl = `https://dripclientofficial.dev/${user.username}`;
  const subdomainUrl = `https://${user.username}.dripclientofficial.dev`;
  const primaryShareUrl = user.isPremium ? subdomainUrl : liveProfileUrl;

  const copyUrl = (url: string, label: string) => {
    navigator.clipboard.writeText(url);
    toast.success(`${label} copied to clipboard!`, { icon: "📋" });
  };

  const openOrGate = (openSetter: (open: boolean) => void) => {
    if (!user.isPremium) {
      toast.error("VIP Lifetime membership required to customize this feature.", {
        description: "Unlock VIP to enable custom themes, tiles, spotlight keys & bio details.",
      });
      setPurchaseDialogOpen(true);
      return;
    }
    openSetter(true);
  };

  const handleUpdate = async (patch: Partial<SafeUser>) => {
    if (!user.isPremium) {
      toast.error("VIP Lifetime membership required to customize storefront.");
      setPurchaseDialogOpen(true);
      return;
    }
    const res = await fetch("/api/bio", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });

    if (!res.ok) {
      const err = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
      if (res.status === 403) {
        setPurchaseDialogOpen(true);
      }
      toast.error(err?.error?.message ?? "Failed to update bio");
      throw new Error(err?.error?.message ?? "Failed to update bio");
    }

    const data = await res.json();
    if (data.user) {
      setUser(data.user);
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 pb-16">
      {/* Top Banner & Profile / Subdomain Hero Bar */}
      <div className="flex flex-col gap-4 rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-card to-accent/5 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary/20 text-primary">
              <Crown className="size-4" />
            </span>
            <h1 className="text-lg font-bold sm:text-xl">VIP Access &amp; Creator Hub</h1>
            {user.isPremium ? (
              <Badge className="rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                <Crown className="mr-1 size-3" /> VIP ACTIVE
              </Badge>
            ) : (
              <Badge variant="outline" className="rounded-full text-muted-foreground text-[10px] font-medium">
                STANDARD PROFILE
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {user.isPremium
              ? "Your dedicated standalone creator storefront:"
              : "Your public store bio link:"}
          </p>
          <p className="font-mono text-xs font-bold text-primary sm:text-sm">
            {primaryShareUrl}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="rounded-xl text-xs gap-1.5 border-primary/40 bg-primary/10 text-primary hover:bg-primary/20"
            onClick={() => setWhatsNewOpen(true)}
          >
            <Sparkles className="size-3.5 text-primary" />
            3-Step Tour
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="rounded-xl text-xs gap-1.5"
            onClick={() => copyUrl(primaryShareUrl, user.isPremium ? "Subdomain link" : "Profile link")}
          >
            <Copy className="size-3.5" />
            Copy Link
          </Button>
          <Button
            type="button"
            size="sm"
            className="rounded-xl text-xs gap-1.5"
            asChild
          >
            <Link href={`/${user.username}`} target="_blank">
              <ExternalLink className="size-3.5" />
              Open Live Page
            </Link>
          </Button>
        </div>
      </div>

      {/* Non-Premium Locked Subdomain Callout */}
      {!user.isPremium ? (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-card to-amber-500/5 p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-amber-500/40 bg-amber-500/20 text-amber-300">
              <Crown className="size-4" />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-foreground">Custom Subdomain Storefront &amp; VIP Perks</span>
                <Badge className="h-4 bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-bold px-1.5">
                  VIP ONLY
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                <span className="font-mono text-amber-300 font-medium">{subdomainUrl}</span> is locked. Upgrade to Drip VIP to unlock 0% API fees, 300 RPM rate limits, and your standalone .dev link!
              </p>
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            className="h-8 rounded-xl text-xs gap-1.5 bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-bold hover:from-amber-400 hover:to-yellow-400 shrink-0 w-full sm:w-auto"
            onClick={() => setPurchaseDialogOpen(true)}
          >
            <Zap className="size-3.5 fill-black" />
            Unlock VIP (${premiumPriceUsd})
          </Button>
        </div>
      ) : null}

      {/* Main Grid: Settings & Phone Preview Simulator */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Management Desks (7 Cols) */}
        <div className="space-y-4 lg:col-span-7">
          {/* VIP Status & Identity Card */}
          <div className="rounded-2xl border border-primary/25 bg-card p-4 sm:p-5">
            <div className="flex items-center justify-between border-b border-border/50 pb-3">
              <div className="flex items-center gap-2">
                <Crown className="size-4 text-amber-400" />
                <h2 className="text-sm font-bold">
                  {user.isPremium ? "VIP Lifetime Membership Active" : "VIP Lifetime Perks & Privileges"}
                </h2>
              </div>
              {user.isPremium ? (
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 rounded-xl text-xs gap-1"
                    onClick={() => setUsernameDialogOpen(true)}
                  >
                    <AtSign className="size-3" />
                    Change @handle
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 rounded-xl text-xs gap-1"
                    onClick={() => setReferralDialogOpen(true)}
                  >
                    <Gift className="size-3" />
                    Invite Code
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  className="h-8 rounded-xl text-xs gap-1.5 bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-bold hover:from-amber-400 hover:to-yellow-400"
                  onClick={() => setPurchaseDialogOpen(true)}
                >
                  <Zap className="size-3.5 fill-black" />
                  Upgrade VIP (${premiumPriceUsd})
                </Button>
              )}
            </div>

            <div className="mt-3.5">
              {user.isPremium ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div>
                      <p className="text-[11px] text-muted-foreground uppercase font-semibold">Status</p>
                      <p className="font-bold text-emerald-400 flex items-center gap-1">
                        <ShieldCheck className="size-3.5" /> Lifetime VIP Active
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground uppercase font-semibold">Custom Handle</p>
                      <p className="font-mono font-bold text-primary">@{user.username}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground uppercase font-semibold">Invite Code</p>
                      <p className="font-mono font-bold text-foreground">{user.referralCode || referralCode || "Default"}</p>
                    </div>
                  </div>

                  {/* All Features Grid for VIPs */}
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-primary mb-2">
                      Your VIP Active Features
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center gap-2 text-foreground">
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">✓</span>
                        <span><strong className="text-emerald-400">0% API Fee</strong> on all key purchases</span>
                      </div>
                      <div className="flex items-center gap-2 text-foreground">
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">✓</span>
                        <span><strong className="text-foreground">300 RPM</strong> High-Speed API tier</span>
                      </div>
                      <div className="flex items-center gap-2 text-foreground">
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">✓</span>
                        <span><strong className="text-foreground">Free Platform API</strong> key slot</span>
                      </div>
                      <div className="flex items-center gap-2 text-foreground">
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">✓</span>
                        <span><strong className="text-foreground">Custom Subdomain</strong> storefront</span>
                      </div>
                      <div className="flex items-center gap-2 text-foreground">
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">✓</span>
                        <span><strong className="text-amber-300">Gold Verified</strong> trust seal</span>
                      </div>
                      <div className="flex items-center gap-2 text-foreground">
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">✓</span>
                        <span><strong className="text-foreground">VIP Priority</strong> support queue</span>
                      </div>
                      <div className="flex items-center gap-2 text-foreground">
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">✓</span>
                        <span><strong className="text-foreground">Custom Handle</strong> &amp; invite code</span>
                      </div>
                      <div className="flex items-center gap-2 text-foreground">
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">✓</span>
                        <span><strong className="text-foreground">Cyber Bento</strong> themes &amp; tiles</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 text-xs">
                  <p className="text-muted-foreground">
                    Upgrade to VIP Lifetime to unlock the complete suite of VIP privileges across the Drip platform.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                    <div className="flex items-center gap-2 text-foreground">
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-amber-500/20 text-amber-300 text-[10px] font-bold">💎</span>
                      <span><strong className="text-emerald-400">0% Platform API Fee</strong> (0% surcharge)</span>
                    </div>
                    <div className="flex items-center gap-2 text-foreground">
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-amber-500/20 text-amber-300 text-[10px] font-bold">🚀</span>
                      <span><strong className="text-foreground">300 RPM</strong> High-Speed API rate limit</span>
                    </div>
                    <div className="flex items-center gap-2 text-foreground">
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-amber-500/20 text-amber-300 text-[10px] font-bold">🔑</span>
                      <span><strong className="text-foreground">Free API Key</strong> slot &amp; webhooks</span>
                    </div>
                    <div className="flex items-center gap-2 text-foreground">
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-amber-500/20 text-amber-300 text-[10px] font-bold">🌐</span>
                      <span><strong className="text-foreground">Custom Subdomain</strong> storefront</span>
                    </div>
                    <div className="flex items-center gap-2 text-foreground">
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-amber-500/20 text-amber-300 text-[10px] font-bold">👑</span>
                      <span><strong className="text-amber-300">Gold Verified</strong> profile badge</span>
                    </div>
                    <div className="flex items-center gap-2 text-foreground">
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-amber-500/20 text-amber-300 text-[10px] font-bold">⚡</span>
                      <span><strong className="text-foreground">VIP Priority</strong> ticket resolution</span>
                    </div>
                    <div className="flex items-center gap-2 text-foreground">
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-amber-500/20 text-amber-300 text-[10px] font-bold">✏️</span>
                      <span><strong className="text-foreground">Custom Handle</strong> &amp; referral code</span>
                    </div>
                    <div className="flex items-center gap-2 text-foreground">
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-amber-500/20 text-amber-300 text-[10px] font-bold">🎨</span>
                      <span><strong className="text-foreground">Cyber Themes</strong> &amp; custom action tiles</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Desk 1: Profile & Tagline */}
          <div className="rounded-2xl border border-border/70 bg-card p-4 sm:p-5">
            <div className="flex items-center justify-between border-b border-border/50 pb-3">
              <div className="flex items-center gap-2">
                <Pencil className="size-4 text-primary" />
                <h2 className="text-sm font-bold">Identity &amp; Tagline</h2>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 rounded-xl text-xs gap-1"
                onClick={() => openOrGate(setProfileDialogOpen)}
              >
                {!user.isPremium && <Lock className="size-3 text-amber-400" />}
                Edit Details
              </Button>
            </div>

            <div className="mt-3.5 grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs">
              <div>
                <p className="text-[11px] text-muted-foreground uppercase font-semibold">Subdomain</p>
                <p className="font-mono font-bold text-primary">@{user.username}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground uppercase font-semibold">Tagline</p>
                <p className="font-medium text-foreground truncate">{user.bioTagline || "Not set"}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground uppercase font-semibold">About / Bio</p>
                <p className="font-medium text-foreground truncate">{user.bio || "Not set"}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground uppercase font-semibold">Socials Linked</p>
                <p className="font-medium text-foreground">
                  {[user.discordInvite ? "Discord" : "", user.telegramChannel ? "Telegram" : ""]
                    .filter(Boolean)
                    .join(", ") || "None"}
                </p>
              </div>
            </div>
          </div>

          {/* Desk 2: Bento Link Tiles */}
          <div className="rounded-2xl border border-border/70 bg-card p-4 sm:p-5">
            <div className="flex items-center justify-between border-b border-border/50 pb-3">
              <div className="flex items-center gap-2">
                <Layers className="size-4 text-primary" />
                <h2 className="text-sm font-bold">Custom Action Tiles ({customLinks.length})</h2>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 rounded-xl text-xs gap-1"
                onClick={() => openOrGate(setLinksDialogOpen)}
              >
                {!user.isPremium && <Lock className="size-3 text-amber-400" />}
                Manage Tiles
              </Button>
            </div>

            <div className="mt-3 space-y-1.5">
              {customLinks.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-2">
                  No custom tiles added yet. Click &quot;Manage Tiles&quot; to add links.
                </p>
              ) : (
                customLinks.map((link) => (
                  <div
                    key={link.id}
                    className="flex items-center justify-between rounded-xl border border-border/50 bg-card/60 px-3 py-2 text-xs"
                  >
                    <span className="font-semibold">{link.title}</span>
                    <span className="text-[11px] text-muted-foreground truncate max-w-[140px]">
                      {link.url}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Desk 3: Storefront Spotlight */}
          <div className="rounded-2xl border border-border/70 bg-card p-4 sm:p-5">
            <div className="flex items-center justify-between border-b border-border/50 pb-3">
              <div className="flex items-center gap-2">
                <ShoppingBag className="size-4 text-primary" />
                <h2 className="text-sm font-bold">Featured Keys &amp; Trust</h2>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 rounded-xl text-xs gap-1"
                onClick={() => openOrGate(setShowcaseDialogOpen)}
              >
                {!user.isPremium && <Lock className="size-3 text-amber-400" />}
                Select Keys
              </Button>
            </div>

            <div className="mt-3.5 grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-[11px] text-muted-foreground uppercase font-semibold">Spotlight Products</p>
                <p className="font-bold text-foreground">{user.featuredProducts?.length || 0} Products Active</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground uppercase font-semibold">Live Vouches &amp; Trust</p>
                <p className="font-bold text-emerald-400">{user.showVouches !== false ? "Visible (5-Star)" : "Hidden"}</p>
              </div>
            </div>
          </div>

          {/* Desk 4: Theme & Appearance */}
          <div className="rounded-2xl border border-border/70 bg-card p-4 sm:p-5">
            <div className="flex items-center justify-between border-b border-border/50 pb-3">
              <div className="flex items-center gap-2">
                <Palette className="size-4 text-primary" />
                <h2 className="text-sm font-bold">Theme &amp; Cyber Glow</h2>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 rounded-xl text-xs gap-1"
                onClick={() => openOrGate(setThemeDialogOpen)}
              >
                {!user.isPremium && <Lock className="size-3 text-amber-400" />}
                Change Theme
              </Button>
            </div>

            <div className="mt-3.5 flex items-center gap-3">
              <div className={`h-4 w-10 rounded-full bg-gradient-to-r ${activeTheme.color}`} />
              <div>
                <p className="text-xs font-bold text-foreground">{activeTheme.name}</p>
                <p className="text-[11px] text-muted-foreground">{activeTheme.desc}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Mobile Frame Simulator (5 Cols) */}
        <div className="lg:col-span-5">
          <div className="sticky top-20 flex flex-col items-center">
            <div className="mb-2.5 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
              <Smartphone className="size-4 text-primary" />
              <span>Interactive Mobile Preview</span>
            </div>

            {/* Smartphone Mockup */}
            <div className="relative w-full max-w-[360px] rounded-[2.5rem] border-[6px] border-border/80 bg-background shadow-2xl overflow-hidden aspect-[9/18]">
              {/* Speaker / Notch */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 h-3.5 w-24 rounded-full bg-border/60 z-30 flex items-center justify-center">
                <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 mr-2" />
                <div className="h-1 w-8 rounded-full bg-muted-foreground/40" />
              </div>

              {/* Scrollable Screen Content */}
              <div className="no-scrollbar h-full w-full overflow-y-auto pt-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] overscroll-contain">
                <PublicProfileView
                  user={user}
                  orderCount={orderCount}
                  totalSpent={totalSpent}
                  averageRating={averageRating}
                  featuredProducts={featuredProductsData}
                  isOwner={true}
                  isPrivate={false}
                  referralCode={user.referralCode || referralCode || null}
                  isAuthenticated={true}
                />
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Dialog Modals */}
      <EditBioProfileDialog
        open={profileDialogOpen}
        onOpenChange={setProfileDialogOpen}
        user={user}
        onSave={handleUpdate}
      />

      <ManageBioLinksDialog
        open={linksDialogOpen}
        onOpenChange={setLinksDialogOpen}
        links={customLinks}
        onSave={(bioLinks) => handleUpdate({ bioLinks })}
      />

      <ShowcaseProductsDialog
        open={showcaseDialogOpen}
        onOpenChange={setShowcaseDialogOpen}
        catalogProducts={catalogProducts}
        featuredIds={user.featuredProducts || []}
        showVouches={user.showVouches !== false}
        onSave={handleUpdate}
      />

      <ThemePickerBioDialog
        open={themeDialogOpen}
        onOpenChange={setThemeDialogOpen}
        currentTheme={(user.bioTheme as BioThemePreset) || "DEFAULT"}
        onSave={(bioTheme) => handleUpdate({ bioTheme })}
      />

      <PremiumPurchaseDialog
        open={purchaseDialogOpen}
        onOpenChange={setPurchaseDialogOpen}
        priceUsd={premiumPriceUsd}
        walletBalance={user.walletBalance}
        onPurchased={(updated) => setUser(updated)}
      />

      <UsernameChangeDialog
        open={usernameDialogOpen}
        onOpenChange={setUsernameDialogOpen}
        user={user}
        onUpdated={(updated) => setUser(updated)}
      />

      <CustomReferralDialog
        open={referralDialogOpen}
        onOpenChange={setReferralDialogOpen}
        user={user}
        onUpdated={(updated) => setUser(updated)}
      />

      <WhatsNewModal
        open={whatsNewOpen}
        onOpenChange={setWhatsNewOpen}
        user={user}
      />

    </div>
  );
}

