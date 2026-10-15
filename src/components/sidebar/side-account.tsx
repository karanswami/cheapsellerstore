"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatMoney } from "@/lib/currencies";
import { cn } from "@/lib/utils";
import {
  Crown,
  LogOut,
  Wallet,
} from "lucide-react";
import Link from "next/link";

/** Minimal balance row: label + amount, optional top-up link. */
export function SideBalance({
  balanceMicrocents,
  action,
  className,
}: {
  balanceMicrocents: number;
  action?: { href: string; label: string };
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border border-sidebar-border bg-background/50 px-3 py-2.5",
        className,
      )}
    >
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
        <Wallet className="size-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] leading-none text-muted-foreground">
          Balance
        </p>
        <p className="mt-1 truncate text-base leading-none font-bold tabular-nums">
          {formatMoney(balanceMicrocents)}
        </p>
      </div>
      {action ? (
        <Link
          href={action.href}
          className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}

/** Single-row profile with a sign-out button. */
export function SideProfile({
  name,
  handle,
  role,
  imageUrl,
  crown = false,
  className,
}: {
  name: string;
  handle: string;
  role: string;
  imageUrl?: string | null;
  crown?: boolean;
  className?: string;
}) {
  const { logout } = useAuth();
  const letter = name.trim().charAt(0).toUpperCase() || "?";

  async function onLogout() {
    await logout();
    window.location.assign("/");
  }

  return (
    <div className={cn("flex items-center gap-2.5 pt-1", className)}>
      <Avatar className="size-9 rounded-xl after:rounded-xl">
        {imageUrl ? (
          <AvatarImage src={imageUrl} alt={name} className="rounded-xl" />
        ) : null}
        <AvatarFallback className="rounded-xl bg-primary/15 text-sm font-bold text-primary">
          {letter}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1 text-sm leading-tight font-semibold">
          <span className="truncate">{name}</span>
          {crown ? (
            <Crown className="size-3 shrink-0 text-amber-500" aria-hidden />
          ) : null}
        </p>
        <p className="truncate text-[11px] text-muted-foreground">
          {handle} · {role}
        </p>
      </div>
      <button
        type="button"
        onClick={onLogout}
        title="Log out"
        aria-label="Log out"
        className="grid size-9 shrink-0 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-rose-500/10 hover:text-rose-500"
      >
        <LogOut className="size-4" />
      </button>
    </div>
  );
}
