"use client";

import { CartSheet } from "@/components/cart/cart-sheet";
import { SiteFooter } from "@/components/landing/site-footer";
import { PageTransitionShell } from "@/components/layout/page-transition-shell";
import { SiteHeader } from "@/components/layout/site-header";
import { SupportFab } from "@/components/layout/support-fab";
import { isSystemStatusPath } from "@/lib/system-status-paths";
import { usePathname } from "next/navigation";

import { isReservedProfileUsername, isStandaloneBioRoute } from "@/lib/profile";

const APP_PREFIXES = ["/app"];

function matchesPrefix(pathname: string, prefixes: string[]) {
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function SiteChrome({
  children,
  isBioInitial = false,
}: {
  children: React.ReactNode;
  isBioInitial?: boolean;
}) {
  const pathname = usePathname();
  const bare =
    pathname.startsWith("/admin") || isSystemStatusPath(pathname);
  const inApp = matchesPrefix(pathname, APP_PREFIXES);
  const isBioPage = isBioInitial || isStandaloneBioRoute(pathname);


  if (bare) {
    return <>{children}</>;
  }

  // Personal bio storefront: clean standalone experience without store header/footer/FAB
  if (isBioPage) {
    return (
      <div className="relative z-[1] flex min-h-dvh flex-col">
        {children}
        <CartSheet />
      </div>
    );
  }

  // /app uses AppShell (sidebar + inset header + SupportFab) — skip public site chrome
  if (inApp) {
    return (
      <>
        {children}
        <CartSheet />
      </>
    );
  }

  // Flex column + min-h-dvh pins SiteFooter to the viewport bottom on short
  // public pages (/pages/*, /faq, /developers) instead of floating mid-screen.
  return (
    <div className="relative z-[1] flex min-h-dvh flex-1 flex-col">
      <SiteHeader />
      <PageTransitionShell className="flex flex-1 flex-col">
        {children}
      </PageTransitionShell>
      <SiteFooter />
      <SupportFab />
      <CartSheet />
    </div>
  );
}
