"use client";

import sidebarSurface from "@/components/layout/console-sidebar.module.css";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/currencies";
import { cn } from "@/lib/utils";
import { PremiumBadge } from "@/components/ui/premium-badge";
import {
  Check,
  Coins,
  ExternalLink,
  KeyRound,
  ShoppingBag,
  Wallet,
} from "lucide-react";
import Link from "next/link";

type ConsoleHeroProfileProps = {
  name: string;
  roleLabel: string;
  accessLine: string;
  balanceMicrocents: number;
  initial?: string;
  imageUrl?: string | null;
  showCrown?: boolean;
  className?: string;
};

export function ConsoleHeroProfile({
  name,
  roleLabel,
  accessLine,
  balanceMicrocents,
  initial,
  imageUrl,
  showCrown = false,
  className,
}: ConsoleHeroProfileProps) {
  const letter =
    initial ?? (name.trim().charAt(0).toUpperCase() || "?");

  return (
    <div className={cn(sidebarSurface.heroCard, "mx-3 mt-1 p-3", className)}>
      <span className={sidebarSurface.snakeOverlay} aria-hidden="true" />
      <div className="relative z-[1] flex items-center gap-2.5">
        <div className="relative shrink-0">
          <Avatar className="size-11 rounded-full ring-2 ring-primary/40 shadow-[0_0_12px_-2px_color-mix(in_oklab,var(--primary)_45%,transparent)]">
            {imageUrl ? (
              <AvatarImage src={imageUrl} alt={name} className="rounded-full" />
            ) : null}
            <AvatarFallback className="rounded-full bg-primary/20 text-sm font-bold text-primary">
              {letter}
            </AvatarFallback>
          </Avatar>
          <span
            aria-hidden
            className="absolute right-0 bottom-0 size-2.5 rounded-full border-2 border-background bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.7)]"
          />
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold leading-tight tracking-tight text-foreground">
            {name}
          </p>
          <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1">
            <span className="inline-flex max-w-full items-center gap-1 rounded-md border border-primary/40 bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
              {showCrown ? (
                <PremiumBadge variant="icon-only" size="xs" animated={false} />
              ) : null}
              <span className="truncate">{roleLabel}</span>
            </span>
            <span className="inline-flex min-w-0 items-center gap-0.5 text-[10px] font-medium text-muted-foreground">
              <Check className="size-3 shrink-0 text-emerald-500" aria-hidden />
              <span className="truncate">{accessLine}</span>
            </span>
          </div>
        </div>

        <div
          className={cn(
            sidebarSurface.heroBalance,
            "flex w-[5.5rem] shrink-0 flex-col items-center justify-center gap-0.5 px-1.5 py-2 text-center",
          )}
        >
          <span className="flex items-center gap-0.5 text-[9px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
            <Wallet className="size-3 text-primary" aria-hidden />
            Balance
          </span>
          <p className="w-full truncate text-sm font-bold tabular-nums leading-none text-primary">
            {formatMoney(balanceMicrocents)}
          </p>
        </div>
      </div>
    </div>
  );
}

type ConsoleProfileCardProps = {
  handle: string;
  role: string;
  balanceMicrocents?: number;
  initial?: string;
  imageUrl?: string | null;
  showCrown?: boolean;
  className?: string;
};

export function ConsoleProfileCard({
  handle,
  role,
  balanceMicrocents,
  initial,
  imageUrl,
  showCrown = false,
  className,
}: ConsoleProfileCardProps) {
  const letter =
    initial ?? (handle.replace(/^@/, "").charAt(0).toUpperCase() || "?");

  return (
    <div className={cn(sidebarSurface.footerCard, "px-3 py-2.5", className)}>
      <span className={sidebarSurface.snakeOverlay} aria-hidden="true" />
      <div className="relative z-[1] flex items-center gap-3">
        <Avatar className="size-9 rounded-full ring-1 ring-primary/25">
          {imageUrl ? (
            <AvatarImage src={imageUrl} alt={handle} className="rounded-full" />
          ) : null}
          <AvatarFallback className="rounded-full bg-primary/20 text-primary">
            {letter}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{handle}</p>
          <p className="truncate text-[11px] font-semibold tracking-wide text-primary uppercase">
            {role}
          </p>
        </div>
        {typeof balanceMicrocents === "number" ? (
          <p className="shrink-0 text-sm font-bold text-primary tabular-nums">
            {formatMoney(balanceMicrocents)}
          </p>
        ) : null}
        {showCrown ? (
          <PremiumBadge variant="icon-only" size="sm" animated={false} />
        ) : null}
      </div>
    </div>
  );
}

export type ConsoleQuickStatsProps = {
  orders: number;
  keys: number;
  deposits: number;
  className?: string;
};

export function ConsoleQuickStats({
  orders,
  keys,
  deposits,
  className,
}: ConsoleQuickStatsProps) {
  const tiles = [
    {
      label: "Orders",
      value: orders,
      Icon: ShoppingBag,
      tone: "text-primary",
    },
    {
      label: "Keys",
      value: keys,
      Icon: KeyRound,
      tone: "text-sky-400",
    },
    {
      label: "Deposits",
      value: deposits,
      Icon: Coins,
      tone: "text-amber-400",
    },
  ] as const;

  return (
    <div className={cn("grid grid-cols-3 gap-1.5", className)}>
      {tiles.map(({ label, value, Icon, tone }) => (
        <div
          key={label}
          className={cn(sidebarSurface.statTile, "px-1 py-1.5 text-center")}
        >
          <Icon className={cn("mx-auto size-3.5", tone)} aria-hidden />
          <p className={cn("mt-0.5 text-sm font-bold tabular-nums leading-none", tone)}>
            {value}
          </p>
          <p className="mt-0.5 truncate text-[8px] font-medium tracking-wide text-muted-foreground uppercase">
            {label}
          </p>
        </div>
      ))}
    </div>
  );
}

type ConsoleStoreLinkProps = {
  href?: string;
  label?: string;
  className?: string;
};

export function ConsoleStoreLink({
  href = "/",
  label = "Back to store",
  className,
}: ConsoleStoreLinkProps) {
  return (
    <Button
      asChild
      variant="outline"
      className={cn("h-10 w-full justify-start gap-2 rounded-xl", className)}
    >
      <Link href={href}>
        <ExternalLink className="size-4" />
        {label}
      </Link>
    </Button>
  );
}
