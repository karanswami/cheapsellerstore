"use client";

import { FlashSaleTicker } from "@/components/catalog/flash-sale-ticker";
import { ProductSheet } from "@/components/product/product-sheet";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/currencies";
import {
  isSellerRole,
  roleDescription,
  roleLabel,
} from "@/lib/profile";
import { cn } from "@/lib/utils";
import type { ProductCardData } from "@/types/product";
import type { SafeUser, BioCustomLink, SocialLinks as SocialLinksType } from "@/types/user";
import {
  BadgeCheck,
  CalendarDays,
  Camera,
  Check,
  Copy,
  ExternalLink,
  Flame,
  Globe,
  Heart,
  MessageCircle,
  Play,
  Shield,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Tv,
  UserRound,
  Zap,
} from "lucide-react";
import Link from "next/link";
import {
  useState,
  useSyncExternalStore,
  type ComponentType,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import styles from "./public-profile-view.module.css";

type PublicProfileViewProps = {
  user: SafeUser;
  orderCount: number;
  totalSpent: number;
  averageRating: number | null;
  featuredProducts: ProductCardData[];
  isOwner: boolean;
  isPrivate: boolean;
  referralCode: string | null;
  isAuthenticated: boolean;
};

const subscribeNoop = () => () => {};

const themeClassMap: Record<string, string> = {
  DEFAULT: "",
  NEON_TOXIC: styles.themeToxic,
  PHANTOM_VIOLET: styles.themeViolet,
  GLACIER_CYAN: styles.themeGlacier,
  CRIMSON_FURY: styles.themeCrimson,
  GOLD_OBSIDIAN: styles.themeGold,
};

function getLucideIcon(name?: string) {
  const map: Record<string, ComponentType<{ className?: string }>> = {
    discord: MessageCircle,
    telegram: MessageCircle,
    youtube: Play,
    twitter: MessageCircle,
    instagram: Camera,
    globe: Globe,
    zap: Zap,
    shield: Shield,
    star: Star,
  };
  return (name && map[name.toLowerCase()]) || ExternalLink;
}

function JoinedLabel({ iso }: { iso: string }) {
  const label = useSyncExternalStore(
    subscribeNoop,
    () =>
      new Date(iso).toLocaleDateString("en-GB", {
        month: "short",
        year: "numeric",
      }),
    () =>
      new Date(iso).toLocaleDateString("en-GB", {
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }),
  );
  return <>{label}</>;
}

function ProfileAvatar({
  user,
  initial,
}: {
  user: SafeUser;
  initial: string;
}) {
  const emoji = user.emojiStatus?.trim() || null;

  return (
    <div className="relative inline-flex">
      <div className={styles.avatarRing}>
        <div className="relative size-24 overflow-hidden rounded-full ring-2 ring-background sm:size-28">
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="size-full object-cover"
            />
          ) : (
            <div className="flex size-full items-center justify-center bg-gradient-to-br from-primary/35 via-card to-accent/25 text-3xl font-semibold text-primary">
              {initial}
            </div>
          )}
        </div>
      </div>
      {emoji ? (
        <span
          className="absolute right-0 bottom-0 z-10 flex size-7 items-center justify-center rounded-full border-2 border-background bg-card text-sm shadow-lg"
          title={emoji}
        >
          {emoji}
        </span>
      ) : user.emailVerified ? (
        <span
          className="absolute right-0 bottom-0 z-10 flex size-6 items-center justify-center rounded-full border-2 border-background bg-emerald-500 text-white shadow-lg"
          title="Verified account"
        >
          <BadgeCheck className="size-3.5" aria-hidden />
        </span>
      ) : null}
    </div>
  );
}

function BentoLinkTile({ link }: { link: BioCustomLink }) {
  const Icon = getLucideIcon(link.icon);
  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className={styles.linkTile}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-4" />
        </div>
        <span className="truncate text-sm font-semibold">{link.title}</span>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {link.badge ? (
          <span className="rounded-full bg-primary/15 border border-primary/30 px-2 py-0.5 text-[10px] font-bold text-primary">
            {link.badge}
          </span>
        ) : null}
        <ExternalLink className="size-3.5 text-muted-foreground opacity-60" />
      </div>
    </a>
  );
}

function StatCell({
  icon: Icon,
  value,
  label,
  accent,
}: {
  icon?: ComponentType<{ className?: string }>;
  value: ReactNode;
  label: string;
  accent?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1 px-1.5 py-3 text-center">
      {Icon ? (
        <Icon className={cn("size-4", accent ?? "text-primary")} />
      ) : null}
      <p className="text-[15px] font-semibold tracking-tight tabular-nums sm:text-base">
        {value}
      </p>
      <p className="text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
        {label}
      </p>
    </div>
  );
}

function FeaturedProductCard({ product }: { product: ProductCardData }) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const inStock = product.durations.some((d) => d.stock > 0);
  const onSale = Boolean(product.flashSale);

  return (
    <>
      <article
        className={cn(
          styles.featured,
          "w-full max-w-full overflow-hidden rounded-[1.3rem] p-3.5 sm:p-4",
        )}
      >
        <div className="mb-2.5 flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1 rounded-full border border-orange-400/30 bg-orange-500/10 px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-orange-300 uppercase">
            <Flame className="size-3" aria-hidden />
            {onSale ? "Trending" : product.isBestSeller ? "Bestseller" : "Key Product"}
          </span>
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border/60 bg-background/40 text-muted-foreground">
            <Heart className="size-3" aria-hidden />
          </span>
        </div>

        <div className="flex min-w-0 gap-3">
          <div
            className={cn(
              styles.thumb,
              "relative size-20 shrink-0 overflow-hidden rounded-xl bg-muted sm:size-22",
            )}
          >
            {product.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.imageUrl}
                alt={product.title}
                className="size-full object-cover"
              />
            ) : (
              <div className="flex size-full items-center justify-center text-lg font-bold text-primary">
                {product.title.trim().charAt(0).toUpperCase() || "?"}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-1">
            <h3 className="line-clamp-2 text-[14px] font-semibold leading-snug">
              {product.title}
            </h3>
            {product.category ? (
              <Badge className="rounded-full border-primary/25 bg-primary/15 px-2 py-0 text-[10px] font-semibold text-primary">
                {product.category.name}
              </Badge>
            ) : null}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pt-0.5">
              <span className="inline-flex items-center gap-1 text-xs tabular-nums text-muted-foreground">
                <Star className="size-3.5 fill-amber-400 text-amber-400" />
                {product.rating.toFixed(1)}
                {product.reviewCount > 0 ? ` (${product.reviewCount})` : ""}
              </span>
              <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-emerald-400">
                <ShieldCheck className="size-3" aria-hidden />
                Instant Delivery
              </span>
            </div>
          </div>
        </div>

        {product.flashSale ? (
          <div className="mt-2.5 flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-xl border border-primary/20 bg-primary/5 px-2.5 py-1.5">
            <span className="text-[11px] font-semibold text-primary">
              ⚡ {product.flashSale.discountPercent}% Discount
            </span>
            <FlashSaleTicker sale={product.flashSale} compact />
          </div>
        ) : null}

        <div className="mt-3 flex min-w-0 items-end justify-between gap-3 border-t border-border/40 pt-2.5">
          <div className="min-w-0">
            <p className="text-[11px] text-muted-foreground uppercase font-semibold">Price</p>
            <p className="text-lg font-bold tabular-nums tracking-tight text-emerald-400">
              {product.startingPrice != null
                ? formatMoney(product.startingPrice, product.currency)
                : "—"}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              disabled={!inStock}
              onClick={() => setSheetOpen(true)}
              className={styles.buyNow}
            >
              <Zap className="size-3.5 fill-white/30" aria-hidden />
              Instant Buy
            </button>
          </div>
        </div>
      </article>

      <ProductSheet
        product={product}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </>
  );
}

export function PublicProfileView({
  user,
  orderCount,
  totalSpent,
  averageRating,
  featuredProducts,
  isOwner,
  isPrivate,
  referralCode,
  isAuthenticated,
}: PublicProfileViewProps) {
  const initial = user.name.trim().charAt(0).toUpperCase() || "?";
  const seller = isSellerRole(user.role);
  const themeClass = themeClassMap[user.bioTheme || "DEFAULT"] || "";

  const promoCode = user.bioPromoCode || referralCode;
  const customLinks = (user.bioLinks as BioCustomLink[]) || [];
  const socials = (user.socialLinks as SocialLinksType) || {};

  // Build social pills list
  const socialList = [
    socials.telegram ? { key: "tg", label: "Telegram", url: socials.telegram.startsWith("http") ? socials.telegram : `https://t.me/${socials.telegram.replace(/^@/, "")}`, icon: MessageCircle } : null,
    socials.discord ? { key: "dc", label: "Discord", url: socials.discord.startsWith("http") ? socials.discord : `https://discord.gg/${socials.discord}`, icon: MessageCircle } : null,
    socials.youtube ? { key: "yt", label: "YouTube", url: socials.youtube.startsWith("http") ? socials.youtube : `https://youtube.com/@${socials.youtube.replace(/^@/, "")}`, icon: Play } : null,
    socials.twitter ? { key: "tw", label: "Twitter", url: socials.twitter.startsWith("http") ? socials.twitter : `https://x.com/${socials.twitter.replace(/^@/, "")}`, icon: MessageCircle } : null,
    socials.instagram ? { key: "ig", label: "Instagram", url: socials.instagram.startsWith("http") ? socials.instagram : `https://instagram.com/${socials.instagram.replace(/^@/, "")}`, icon: Camera } : null,
  ].filter(Boolean) as { key: string; label: string; url: string; icon: ComponentType<{ className?: string }> }[];

  return (
    <main className={cn(styles.page, themeClass, "no-scrollbar relative min-h-dvh flex flex-col justify-between overflow-x-hidden pb-12 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none]")}>
      <div aria-hidden className={styles.heroWash}>
        <div className={styles.heroOrbA} />
        <div className={styles.heroOrbB} />
      </div>

      <div className="relative z-[1] mx-auto w-full max-w-md px-4 pt-6 sm:max-w-lg sm:pt-8 lg:max-w-xl">
        {/* Hero Identity Box */}
        <section className={cn(styles.card, "overflow-hidden rounded-[1.6rem]")}>
          {/* Custom Banner */}
          {user.bioBannerUrl ? (
            <div className={styles.bannerWrapper}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={user.bioBannerUrl}
                alt="Profile Banner"
                className={styles.bannerImg}
              />
            </div>
          ) : (
            <div className="h-14 w-full bg-gradient-to-r from-primary/20 via-accent/15 to-transparent" />
          )}

          <div className="relative -mt-10 flex flex-col items-center px-5 pb-6 pt-0 text-center sm:px-6">
            <ProfileAvatar user={user} initial={initial} />

            <div className="mt-3.5 flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                {user.name}
              </h1>
            </div>

            <p className="mt-0.5 text-xs text-muted-foreground">@{user.username}</p>

            {/* Badges Row */}
            <div className="mt-2.5 flex flex-wrap items-center justify-center gap-1.5">
              <span className={styles.onlinePulse}>
                <span className={styles.onlineDot} />
                ONLINE
              </span>
              <Badge className="gap-1 rounded-full border-primary/30 bg-primary/15 px-2.5 text-[11px] text-primary">
                {seller ? <Shield className="size-3" /> : <UserRound className="size-3" />}
                {roleLabel(user.role)}
              </Badge>
            </div>

            {/* Tagline & Bio */}
            {user.bioTagline ? (
              <p className="mt-3 text-xs font-semibold text-primary/90">
                ⚡ {user.bioTagline}
              </p>
            ) : null}

            {user.bio ? (
              <p className="mt-2 max-w-md whitespace-pre-wrap break-words text-xs sm:text-sm text-muted-foreground">
                {user.bio}
              </p>
            ) : null}


            {/* Social Links Dock */}

            {socialList.length > 0 ? (
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                {socialList.map((soc) => (
                  <a
                    key={soc.key}
                    href={soc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-full border border-border/70 bg-card/60 px-3 py-1.5 text-xs font-medium text-foreground transition-all hover:border-primary/60 hover:bg-primary/10 hover:text-primary"
                  >
                    <soc.icon className="size-3.5" />
                    <span>{soc.label}</span>
                  </a>
                ))}
              </div>
            ) : null}
          </div>
        </section>

        {/* Live Trust & Stats */}
        {user.showVouches !== false ? (
          <section className={cn(styles.stats, "mt-3.5 overflow-hidden rounded-[1.2rem]")}>
            <div className="grid grid-cols-3 divide-x divide-border/50">
              <StatCell
                icon={CalendarDays}
                value={<JoinedLabel iso={user.createdAt} />}
                label="Joined"
              />
              <StatCell
                icon={ShoppingBag}
                value={orderCount > 0 ? `${orderCount}+` : "New"}
                label="Orders"
              />
              <StatCell
                icon={Star}
                value={averageRating ? averageRating.toFixed(1) : "5.0"}
                label="Vouches"
                accent="text-amber-400"
              />
            </div>
          </section>
        ) : null}

        {/* Custom Bento Action Tiles */}
        {customLinks.length > 0 ? (
          <section className="mt-4 space-y-2">
            {customLinks.map((link) => (
              <BentoLinkTile key={link.id} link={link} />
            ))}
          </section>
        ) : null}

        {/* Discord & Telegram Community Tile */}
        {(user.discordInvite || user.telegramChannel) ? (
          <section className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {user.discordInvite ? (
              <a
                href={user.discordInvite.startsWith("http") ? user.discordInvite : `https://discord.gg/${user.discordInvite}`}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(styles.bentoTile, "flex items-center gap-3 p-3.5 text-indigo-400")}
              >
                <div className="flex size-9 items-center justify-center rounded-xl bg-indigo-500/15">
                  <MessageCircle className="size-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-foreground">Discord Server</p>
                  <p className="text-[11px] text-muted-foreground">Join community</p>
                </div>
              </a>
            ) : null}

            {user.telegramChannel ? (
              <a
                href={user.telegramChannel.startsWith("http") ? user.telegramChannel : `https://t.me/${user.telegramChannel.replace(/^@/, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(styles.bentoTile, "flex items-center gap-3 p-3.5 text-sky-400")}
              >
                <div className="flex size-9 items-center justify-center rounded-xl bg-sky-500/15">
                  <MessageCircle className="size-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-foreground">Telegram Channel</p>
                  <p className="text-[11px] text-muted-foreground">Stock alerts</p>
                </div>
              </a>
            ) : null}
          </section>
        ) : null}

        {/* Featured Keys Storefront */}
        {featuredProducts.length > 0 ? (
          <section className="mt-6 space-y-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5">
                <Sparkles className="size-4 text-primary" />
                <h2 className="text-sm font-bold tracking-wider uppercase">
                  Featured Products
                </h2>
              </div>
              <span className="text-[11px] text-muted-foreground">Instant Delivery</span>
            </div>
            <ul className="space-y-3">
              {featuredProducts.map((product) => (
                <li key={product.id}>
                  <FeaturedProductCard product={product} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>

      {/* Discrete Minimalist Subdomain Badge at the Very Bottom */}
      <div className="relative z-[1] mt-12 mb-4 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-border/40 bg-card/40 px-3.5 py-1 text-[11px] text-muted-foreground backdrop-blur-sm">
          <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-mono">{user.username}.cheapseller.store</span>
        </div>
      </div>
    </main>
  );
}
