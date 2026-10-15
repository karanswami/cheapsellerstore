"use client";

import { ConsoleUserMenu } from "@/components/app/console-user-menu";
import { CustomerSidebar } from "@/components/app/customer-sidebar";
import { ImpersonationBanner } from "@/components/app/impersonation-banner";
import { useAuth } from "@/components/auth/auth-provider";
import { SiteFooter } from "@/components/landing/site-footer";
import { ConsoleHeader } from "@/components/layout/console-header";
import { PageTransitionShell } from "@/components/layout/page-transition-shell";
import { SupportFab } from "@/components/layout/support-fab";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useCart } from "@/hooks/use-cart";
import {
  consoleSubtitle,
  consoleTitle,
  roleBadge,
} from "@/lib/roles";
import type { SafeUser } from "@/types/user";
import { usePathname } from "next/navigation";

type AppShellProps = {
  user: SafeUser;
  giftCodesEnabled?: boolean;
  children: React.ReactNode;
};

export function AppShell({
  user: serverUser,
  giftCodesEnabled = false,
  children,
}: AppShellProps) {
  const { user: liveUser, pagesEnabled } = useAuth();
  const pathname = usePathname();
  // Prefer live wallet/profile once auth has loaded, but keep the same user id
  // as the SSR snapshot so sidebar nav structure cannot diverge on hydrate.
  const user =
    liveUser && liveUser.id === serverUser.id ? liveUser : serverUser;
  const giftOn =
    liveUser && liveUser.id === serverUser.id
      ? pagesEnabled.giftCodes
      : giftCodesEnabled;
  const { itemCount, openCart } = useCart();
  const showStoreFooter = pathname === "/app";

  return (
    <TooltipProvider>
      <SidebarProvider
        className="min-h-svh flex-1"
        style={
          {
            "--sidebar-width": "20rem",
          } as React.CSSProperties
        }
      >
        <CustomerSidebar
          user={user}
          giftCodesEnabled={giftOn}
        />
        <SidebarInset>
          <ImpersonationBanner />
          <ConsoleHeader
            title={consoleTitle(user.role)}
            subtitle={consoleSubtitle(user.role)}
            brandBadge={roleBadge(user.role)}
            storeHref="/app"
            storeLabel="Home"
            trailing={
              <ConsoleUserMenu
                user={user}
                cartCount={itemCount}
                onOpenCart={openCart}
              />
            }
          />
          <PageTransitionShell className="flex min-w-0 flex-1 flex-col overflow-x-clip">
            {children}
            {showStoreFooter ? <SiteFooter /> : null}
          </PageTransitionShell>
        </SidebarInset>
        <SupportFab />
      </SidebarProvider>
    </TooltipProvider>
  );
}
