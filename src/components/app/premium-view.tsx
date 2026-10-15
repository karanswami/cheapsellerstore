"use client";

import {
  BioEditDialog,
  PrivacyDialog,
  SocialLinksDialog,
  ProfileBorderDialog,
  EmojiStatusDialog,
} from "@/components/app/profile-customization-dialogs";
import { ProfileShareCard } from "@/components/app/profile-share-card";
import { SocialLinksDisplay } from "@/components/app/social-links";
import {
  CustomReferralDialog,
  FeaturedProductsDialog,
  PremiumPurchaseDialog,
  UsernameChangeDialog,
} from "@/components/app/premium-dialogs";
import { HubHeaderBar } from "@/components/app/hub/hub-header-bar";
import { HubPanelCard } from "@/components/app/hub/hub-list-row";
import { HubPageShell } from "@/components/app/hub/hub-page-shell";
import { useAuth } from "@/components/auth/auth-provider";
import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatMoney, usdToMicrocents } from "@/lib/currencies";
import { cn } from "@/lib/utils";
import type { SafeUser } from "@/types/user";
import type { LucideIcon } from "lucide-react";
import {
  AtSign,
  Eye,
  EyeOff,
  Flag,
  Gift,
  KeyRound,
  Link2,
  Lock,
  Palette,
  ShoppingBag,
  Smile,
  User,
  Zap,
} from "lucide-react";
import { PremiumBadge } from "@/components/ui/premium-badge";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type PremiumViewProps = {
  user: SafeUser;
  referralCode: string | null;
  premiumPriceUsd: number;
};

export function PremiumView({
  user: initialUser,
  referralCode,
  premiumPriceUsd,
}: PremiumViewProps) {
  const { setUser, refresh, user: liveUser } = useAuth();
  const router = useRouter();
  const [user, setLocalUser] = useState(initialUser);
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [bioOpen, setBioOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [socialOpen, setSocialOpen] = useState(false);
  const [borderOpen, setBorderOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [usernameOpen, setUsernameOpen] = useState(false);
  const [referralOpen, setReferralOpen] = useState(false);
  const [featuredOpen, setFeaturedOpen] = useState(false);

  useEffect(() => {
    if (liveUser) setLocalUser(liveUser);
  }, [liveUser]);

  const premium = user.isPremium;
  const priceMicro = usdToMicrocents(premiumPriceUsd);
  const initial = user.name.trim().charAt(0).toUpperCase() || "?";
  const code = referralCode ?? user.referralCode;

  async function handleUpdated(next: SafeUser) {
    setLocalUser(next);
    setUser(next);
    await refresh();
    router.refresh();
  }

  function openPremiumAction(setter: (v: boolean) => void) {
    if (!premium) {
      setPurchaseOpen(true);
      return;
    }
    setter(true);
  }

  return (
    <HubPageShell maxWidth="lg">
      <HubHeaderBar
        icon={<PremiumBadge variant="icon-only" size="md" animated={false} />}
        title="Premium"
        description="Customize your public page and share your trust status"
        stats={[
          {
            label: "Status",
            value: premium ? "Active" : "Locked",
            tone: premium ? "success" : "default",
          },
          {
            label: "Price",
            value: formatMoney(priceMicro),
            tone: "accent",
          },
        ]}
        statsLabel="Membership"
      />

      <HubPanelCard>
      <Card variant="hero" className="border-0 bg-transparent shadow-none">
        <CardHeader className="border-b border-border/40">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <div className="relative shrink-0">
                <Avatar
                  className={cn(
                    "size-11 rounded-xl after:rounded-xl",
                    user.profileBorder === "PREMIUM" &&
                      "ring-2 ring-amber-500 ring-offset-2 ring-offset-background",
                    user.profileBorder === "VIP" &&
                      "ring-2 ring-primary ring-offset-2 ring-offset-background",
                  )}
                  size="lg"
                >
                  {user.avatarUrl ? (
                    <AvatarImage
                      src={user.avatarUrl}
                      alt={user.name}
                      className="rounded-xl"
                    />
                  ) : null}
                  <AvatarFallback className="rounded-xl bg-primary/10 text-sm font-semibold text-primary">
                    {initial}
                  </AvatarFallback>
                </Avatar>
                {user.emojiStatus ? (
                  <AvatarBadge
                    className="size-5 border border-border/40 bg-card text-xs leading-none text-foreground ring-1 ring-background"
                    aria-label={`Status ${user.emojiStatus}`}
                  >
                    {user.emojiStatus}
                  </AvatarBadge>
                ) : null}
              </div>
              <div className="min-w-0 space-y-1">
                <p className="text-xs font-medium tracking-wide text-primary uppercase">
                  Membership
                </p>
                <CardTitle className="flex flex-wrap items-center gap-2">
                  {premium ? "Premium active" : "Unlock Premium"}
                  {premium ? (
                    <PremiumBadge size="xs" />
                  ) : (
                    <Badge variant="outline" className="gap-1 text-[10px]">
                      <Lock className="size-3" aria-hidden />
                      Locked
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  {premium
                    ? "Lifetime access · verified account · customize your public page"
                    : `One-time ${formatMoney(priceMicro)} · verifies email & account`}
                </CardDescription>
              </div>
            </div>
            {!premium ? (
              <Button
                type="button"
                size="sm"
                className="shrink-0"
                onClick={() => setPurchaseOpen(true)}
              >
                Unlock
              </Button>
            ) : null}
          </div>
        </CardHeader>
        {!premium ? (
          <CardContent className="space-y-2 pt-4 text-sm text-muted-foreground">
            <p>
              Wallet balance:{" "}
              <span className="font-medium text-foreground tabular-nums">
                {formatMoney(user.walletBalance)}
              </span>
            </p>
            <p>
              Need funds?{" "}
              {user.depositsEnabled ? (
                <Link href="/app/deposit" className="text-primary underline-offset-2 hover:underline">
                  Deposit
                </Link>
              ) : user.role === "RESELLER" ? (
                <span>Ask your seller to top up your wallet.</span>
              ) : (
                <span>Self-serve deposits are disabled on this account.</span>
              )}
            </p>
          </CardContent>
        ) : null}
      </Card>
      </HubPanelCard>

      <ProfileShareCard user={user} referralCode={code} />

      <HubPanelCard>
      <Card variant="list" className="border-0 bg-transparent shadow-none">
        <CardHeader className="border-b border-border/40 px-(--card-spacing) py-4">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
              <AtSign className="size-5" aria-hidden />
            </span>
            <div className="min-w-0 space-y-1">
              <p className="text-xs font-medium tracking-wide text-primary uppercase">
                Identity
              </p>
              <CardTitle>Username & referral</CardTitle>
              <CardDescription>
                Vanity handle and invite code for your share links.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border/40">
            <FeatureRow
              icon={AtSign}
              title="Username"
              subtitle={`@${user.username}`}
              locked={!premium}
              actionLabel="Change"
              onAction={() => openPremiumAction(setUsernameOpen)}
            />
            <FeatureRow
              icon={Gift}
              title="Custom referral code"
              subtitle={code ?? "Set a vanity invite code"}
              locked={!premium}
              actionLabel="Edit"
              onAction={() => openPremiumAction(setReferralOpen)}
            />
          </div>
        </CardContent>
      </Card>
      </HubPanelCard>

      <HubPanelCard>
      <Card variant="list" className="border-0 bg-transparent shadow-none">
        <CardHeader className="border-b border-border/40 px-(--card-spacing) py-4">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
              <Palette className="size-5" aria-hidden />
            </span>
            <div className="min-w-0 space-y-1">
              <p className="text-xs font-medium tracking-wide text-primary uppercase">
                Customization
              </p>
              <CardTitle>Public page style</CardTitle>
              <CardDescription>
                Bio, socials, borders, and emoji on your trust page.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border/40">
            <FeatureRow
              icon={User}
              title="Bio"
              subtitle={
                user.bio
                  ? `"${user.bio.slice(0, 50)}${user.bio.length > 50 ? "..." : ""}"`
                  : "Add a personal bio"
              }
              locked={!premium}
              actionLabel={user.bio ? "Edit" : "Add"}
              onAction={() => openPremiumAction(setBioOpen)}
            />
            <FeatureRow
              icon={user.isProfilePublic ? Eye : EyeOff}
              title="Privacy"
              subtitle={`Profile is ${user.isProfilePublic ? "public" : "private"}`}
              locked={false}
              actionLabel="Edit"
              onAction={() => setPrivacyOpen(true)}
            />
            <FeatureRow
              icon={Link2}
              title="Social links"
              subtitle={
                (() => {
                  const count = user.socialLinks
                    ? Object.values(user.socialLinks).filter((v) =>
                        Boolean(v?.trim()),
                      ).length
                    : 0;
                  return count > 0
                    ? `${count} link${count === 1 ? "" : "s"} added`
                    : "Add social media profiles";
                })()
              }
              locked={!premium}
              actionLabel="Edit"
              onAction={() => openPremiumAction(setSocialOpen)}
            />
            <FeatureRow
              icon={Palette}
              title="Profile border"
              subtitle={
                user.profileBorder === "PREMIUM"
                  ? "Premium border"
                  : user.profileBorder === "VIP"
                    ? "VIP border"
                    : "No border"
              }
              locked={!premium}
              actionLabel="Edit"
              onAction={() => openPremiumAction(setBorderOpen)}
            />
            <FeatureRow
              icon={Smile}
              title="Emoji status"
              subtitle={
                user.emojiStatus
                  ? `Current: ${user.emojiStatus}`
                  : "Add emoji status"
              }
              locked={!premium}
              actionLabel={user.emojiStatus ? "Edit" : "Add"}
              onAction={() => openPremiumAction(setEmojiOpen)}
            />
            <FeatureRow
              icon={ShoppingBag}
              title="Featured products"
              subtitle={
                user.featuredProducts.length > 0
                  ? `${user.featuredProducts.length} featured`
                  : "Showcase purchases on your page"
              }
              locked={!premium}
              actionLabel="Edit"
              onAction={() => openPremiumAction(setFeaturedOpen)}
            />
          </div>
          {premium ? (
            <div className="border-t border-border/40 px-4 py-3 sm:px-5">
              <SocialLinksDisplay socialLinks={user.socialLinks} />
            </div>
          ) : null}
        </CardContent>
      </Card>
      </HubPanelCard>

      <HubPanelCard>
      <Card variant="list" className="border-0 bg-transparent shadow-none">
        <CardHeader className="border-b border-border/40 px-(--card-spacing) py-4">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/12 text-amber-400">
              <Zap className="size-5" aria-hidden />
            </span>
            <div className="min-w-0 space-y-1">
              <p className="text-xs font-medium tracking-wide text-amber-400 uppercase">
                {user.role === "SELLER" || user.role === "RESELLER" || user.role === "ADMIN"
                  ? "VIP Utilities & API"
                  : "VIP Utilities"}
              </p>
              <CardTitle>
                {user.role === "SELLER" || user.role === "RESELLER" || user.role === "ADMIN"
                  ? "VIP Perks & Developer Tools"
                  : "VIP Perks & Priority Tools"}
              </CardTitle>
              <CardDescription>
                {user.role === "SELLER" || user.role === "RESELLER" || user.role === "ADMIN"
                  ? "Fast priority support, free automation API key, and elevated 300 RPM rate limits."
                  : "Fast priority support queue, gold verified trust seal, and priority service."}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border/40">
            <FeatureRow
              icon={Flag}
              title="⚡ VIP Fast Support"
              subtitle={premium ? "Active · priority queue on key & deposit tickets" : "Fast-track ticket review queue"}
              locked={!premium}
              actionLabel="Reports"
              onAction={() => router.push("/app/reports")}
            />
            {user.role === "SELLER" || user.role === "RESELLER" || user.role === "ADMIN" ? (
              <>
                <FeatureRow
                  icon={KeyRound}
                  title="🔑 Free Automation API Key"
                  subtitle={premium ? "Active · 1 API credential slot unlocked (0 setup fee)" : "Platform API key for bots & automation"}
                  locked={!premium}
                  actionLabel="API Hub"
                  onAction={() => router.push("/app/development")}
                />
                <FeatureRow
                  icon={Zap}
                  title="🚀 300 RPM High-Speed Limit"
                  subtitle={premium ? "Active · 300 requests/min high throughput tier" : "Elevated speed tier (up from standard)"}
                  locked={!premium}
                  actionLabel="Docs"
                  onAction={() => router.push("/developers")}
                />
              </>
            ) : null}
          </div>
        </CardContent>
      </Card>
      </HubPanelCard>

      <PremiumPurchaseDialog
        open={purchaseOpen}
        onOpenChange={setPurchaseOpen}
        priceUsd={premiumPriceUsd}
        walletBalance={user.walletBalance}
        onPurchased={handleUpdated}
      />
      <UsernameChangeDialog
        open={usernameOpen}
        onOpenChange={setUsernameOpen}
        user={user}
        onUpdated={handleUpdated}
      />
      <CustomReferralDialog
        open={referralOpen}
        onOpenChange={setReferralOpen}
        user={user}
        onUpdated={handleUpdated}
      />
      <FeaturedProductsDialog
        open={featuredOpen}
        onOpenChange={setFeaturedOpen}
        user={user}
        onUpdated={handleUpdated}
      />
      <BioEditDialog
        open={bioOpen}
        onOpenChange={setBioOpen}
        user={user}
        onUpdated={handleUpdated}
      />
      <PrivacyDialog
        open={privacyOpen}
        onOpenChange={setPrivacyOpen}
        user={user}
        onUpdated={handleUpdated}
      />
      <SocialLinksDialog
        open={socialOpen}
        onOpenChange={setSocialOpen}
        user={user}
        onUpdated={handleUpdated}
      />
      <ProfileBorderDialog
        open={borderOpen}
        onOpenChange={setBorderOpen}
        user={user}
        onUpdated={handleUpdated}
      />
      <EmojiStatusDialog
        open={emojiOpen}
        onOpenChange={setEmojiOpen}
        user={user}
        onUpdated={handleUpdated}
      />
    </HubPageShell>
  );
}

function FeatureRow({
  icon: Icon,
  title,
  subtitle,
  locked,
  actionLabel,
  onAction,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  locked: boolean;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-medium">
            {title}
            {locked ? (
              <Lock className="size-3 text-muted-foreground" aria-label="Premium locked" />
            ) : null}
          </p>
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <Button type="button" variant="outline" size="sm" onClick={onAction}>
        {locked ? "Unlock" : actionLabel}
      </Button>
    </div>
  );
}
