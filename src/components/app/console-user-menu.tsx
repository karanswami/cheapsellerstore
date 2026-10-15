"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { useInstallAppAction } from "@/components/layout/install-app-ui";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatMoney } from "@/lib/currencies";
import { roleBadge } from "@/lib/roles";
import type { SafeUser } from "@/types/user";
import {
  BadgeCheck,
  ChevronDown,
  Gift,
  History,
  LayoutDashboard,
  LogOut,
  ShoppingCart,
  Smartphone,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export function ConsoleUserMenu({
  user,
  cartCount = 0,
  onOpenCart,
}: {
  user: SafeUser;
  cartCount?: number;
  onOpenCart?: () => void;
}) {
  const { logout } = useAuth();
  const pathname = usePathname();
  const { canInstall, install, isAndroid } = useInstallAppAction();
  const [open, setOpen] = useState(false);
  const initial = user.name.trim().charAt(0).toUpperCase() || "?";

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  async function onLogout() {
    setOpen(false);
    await logout();
    window.location.assign("/");
  }

  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      {onOpenCart ? (
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="relative size-9 rounded-[0.85rem] border-primary/25 bg-secondary/70 shadow-none hover:border-primary/45 hover:bg-primary/10 hover:shadow-[var(--glow-soft)]"
          aria-label={`Open cart, ${cartCount} items`}
          onClick={onOpenCart}
        >
          <ShoppingCart className="size-[1.15rem] transition-transform duration-300 ease-out group-hover/button:scale-110" />
          {cartCount > 0 ? (
            <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
              {cartCount > 9 ? "9+" : cartCount}
            </span>
          ) : null}
        </Button>
      ) : null}

      <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="h-9 max-w-[14rem] gap-2 rounded-[0.85rem] border-primary/25 bg-secondary/70 px-2.5 shadow-none hover:border-primary/45 hover:bg-primary/10 hover:shadow-[var(--glow-soft)]"
          >
            <Avatar className="size-7 rounded-lg">
              {user.avatarUrl ? (
                <AvatarImage
                  src={user.avatarUrl}
                  alt={user.name}
                  className="rounded-lg"
                />
              ) : null}
              <AvatarFallback className="rounded-lg text-xs">
                {initial}
              </AvatarFallback>
            </Avatar>
            <span className="hidden min-w-0 flex-col items-start text-left sm:flex">
              <span className="truncate text-xs font-semibold leading-tight">
                @{user.username}
              </span>
              <span className="truncate text-[10px] tracking-wide text-primary uppercase">
                {roleBadge(user.role)}
              </span>
            </span>
            <ChevronDown className="size-3.5 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-56 rounded-xl">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium">{user.name}</span>
              <span className="text-xs text-muted-foreground">{user.email}</span>
              <span className="text-xs font-medium text-success">
                {formatMoney(user.walletBalance)}
              </span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            {user.role === "ADMIN" ? (
              <DropdownMenuItem asChild>
                <Link href="/admin">
                  <LayoutDashboard />
                  Admin panel
                </Link>
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem asChild>
              <Link href="/app/profile">
                <BadgeCheck />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/app/history">
                <History />
                History
              </Link>
            </DropdownMenuItem>
            {user.depositsEnabled ? (
              <DropdownMenuItem asChild>
                <Link href="/app/deposit">
                  <Wallet />
                  Deposit
                </Link>
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem asChild>
              <Link href="/app/referral">
                <Gift />
                Referral
              </Link>
            </DropdownMenuItem>
            {canInstall ? (
              <DropdownMenuItem
                onSelect={(e) => {
                  // Keep open until install prompt starts (needs user gesture),
                  // then always dismiss so the list never sticks around.
                  e.preventDefault();
                  void install().finally(() => setOpen(false));
                }}
              >
                <Smartphone />
                {isAndroid ? "Download app" : "Install app"}
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onLogout}>
            <LogOut />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
