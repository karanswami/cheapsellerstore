"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { useInstallAppAction } from "@/components/layout/install-app-ui";
import styles from "@/components/layout/site-header.module.css";
import { useSiteConfig } from "@/components/theme/site-config-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCart } from "@/hooks/use-cart";
import { cn } from "@/lib/utils";
import {
  KeyRound,
  LayoutDashboard,
  LogIn,
  LogOut,
  ShoppingCart,
  Smartphone,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const NAV: { href: string; label: string; exact?: boolean }[] = [
  { href: "/", label: "Store", exact: true },
  { href: "/#store", label: "Products" },
];

function navActive(pathname: string, href: string, exact?: boolean) {
  if (href.includes("#")) return pathname === "/";
  return exact ? pathname === href : pathname.startsWith(href);
}

export function SiteHeader() {
  const pathname = usePathname();
  const { itemCount, openCart } = useCart();
  const { user, loading, openAuth, logout } = useAuth();
  const { canInstall, install, isAndroid } = useInstallAppAction();
  const site = useSiteConfig();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  async function onLogout() {
    setMenuOpen(false);
    await logout();
    window.location.assign("/");
  }

  const initial =
    user?.name.trim().charAt(0).toUpperCase() ||
    user?.username.trim().charAt(0).toUpperCase() ||
    "?";

  return (
    <header className={styles.header}>
      <div className={styles.wash} aria-hidden />

      <div className={cn(styles.inner, "mx-auto max-w-5xl")}>
        <Link
          href={user ? "/app" : "/"}
          className={styles.brand}
          aria-label={site.siteName}
        >
          <span className={styles.brandLogo}>
            {site.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={site.logoUrl} alt="" />
            ) : (
              <span className={styles.brandInitial}>{site.initial}</span>
            )}
          </span>
          <span className={styles.brandName}>{site.siteName}</span>
        </Link>

        <nav className={styles.nav} aria-label="Store">
          {NAV.map((item) => {
            const active = navActive(pathname, item.href, item.exact);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(styles.navLink, active && styles.navLinkActive)}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className={styles.actions}>
          <button
            type="button"
            className={cn(styles.iconBtn, styles.cartBtn, "pressable")}
            aria-label={`Open cart, ${itemCount} items`}
            onClick={openCart}
          >
            <ShoppingCart />
            {itemCount > 0 ? (
              <span className={styles.cartBadge}>
                {itemCount > 9 ? "9+" : itemCount}
              </span>
            ) : null}
          </button>

          {canInstall ? (
            <button
              type="button"
              className={cn(styles.iconBtn, "pressable hidden sm:inline-flex")}
              aria-label={isAndroid ? "Download Android app" : "Install app"}
              onClick={() => void install()}
            >
              <Smartphone />
            </button>
          ) : null}

          {!loading && user ? (
            <DropdownMenu
              open={menuOpen}
              onOpenChange={setMenuOpen}
              modal={false}
            >
              <DropdownMenuTrigger asChild>
                <button type="button" className={cn(styles.userBtn, "pressable")}>
                  <Avatar className="size-6 rounded-md">
                    {user.avatarUrl ? (
                      <AvatarImage
                        src={user.avatarUrl}
                        alt={user.name}
                        className="rounded-md"
                      />
                    ) : null}
                    <AvatarFallback className="rounded-md text-[10px]">
                      {initial}
                    </AvatarFallback>
                  </Avatar>
                  <span className={cn(styles.userName, styles.userNameHidden)}>
                    {user.username}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-52 rounded-lg">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col gap-0.5">
                    <span className="truncate text-sm font-medium">
                      {user.name}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {user.email}
                    </span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem asChild>
                    <Link href="/app">
                      <LayoutDashboard />
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/app/keys">
                      <KeyRound />
                      My keys
                    </Link>
                  </DropdownMenuItem>
                  {canInstall ? (
                    <DropdownMenuItem
                      onSelect={(e) => {
                        e.preventDefault();
                        void install().finally(() => setMenuOpen(false));
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
          ) : !loading ? (
            <>
              <button
                type="button"
                className={cn(styles.authBtn, "pressable")}
                onClick={() => openAuth("login")}
              >
                <LogIn />
                <span className={styles.authLabel}>Login</span>
              </button>
              <button
                type="button"
                className={cn(styles.authBtn, styles.authBtnPrimary, "pressable")}
                onClick={() => openAuth("register")}
              >
                <span className={styles.authLabelShort}>Join</span>
                <span className={styles.authLabel}>Register</span>
              </button>
            </>
          ) : (
            <div className={styles.loadingPulse} aria-hidden />
          )}
        </div>
      </div>
    </header>
  );
}
