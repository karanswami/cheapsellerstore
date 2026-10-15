"use client";

import {
  SideBalance,
  SideProfile,
} from "@/components/sidebar/side-account";
import { SideBrand } from "@/components/sidebar/side-brand";
import { SideNav, type SideNavGroup } from "@/components/sidebar/side-nav";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/components/auth/auth-provider";
import { roleLabel } from "@/lib/roles";
import type { SafeUser } from "@/types/user";
import {
  BookOpen,
  Code2,
  Flag,
  Gift,
  History,
  Home,
  KeyRound,
  LayoutDashboard,
  Megaphone,
  Ticket,
  Trophy,
  User,
  UserPlus,
  UsersRound,
  Wallet,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useMemo } from "react";

import type { CustomerSidebarBadges } from "@/lib/sidebar-stats";

function buildNavSections(
  role: SafeUser["role"],
  caps: {
    canCreateResellers: boolean;
    canManageResellers: boolean;
    canFundResellers: boolean;
  },
  depositsEnabled: boolean,
  giftCodesEnabled: boolean,
  badges?: CustomerSidebarBadges,
): SideNavGroup[] {
  const sections: SideNavGroup[] = [
    {
      label: "Store",
      items: [
        {
          title: "Home",
          hint: "Shop mods & tools",
          href: "/app",
          icon: Home,
          exact: true,
        },
        {
          title: "Keys",
          hint: "Purchased licenses and codes",
          href: "/app/keys",
          icon: KeyRound,
        },
        {
          title: "Leaderboard",
          hint: "Top customers by spend",
          href: "/app/leaderboard",
          icon: Trophy,
          badge: { label: "TOP 100", tone: "primary" },
        },
      ],
    },
  ];

  const walletItems: SideNavGroup["items"] = [];
  if (depositsEnabled) {
    const pendingDeposits = badges?.pendingDeposits ?? 0;
    walletItems.push({
      title: "Deposit",
      hint: "Top up balance for checkout",
      href: "/app/deposit",
      icon: Wallet,
      badge:
        pendingDeposits > 0
          ? { label: `${pendingDeposits} PENDING`, tone: "warning" }
          : { label: "NEW", tone: "info" },
    });
  }
  if (giftCodesEnabled) {
    walletItems.push({
      title: "Gift codes",
      hint: "Claim USD gift codes",
      href: "/app/gift-codes",
      icon: Ticket,
    });
  }
  if (walletItems.length > 0) {
    sections.push({
      label: "Wallet",
      items: walletItems,
    });
  }

  const activeReports = badges?.activeReports ?? 0;
  sections.push({
    label: "Account",
    items: [
      {
        title: "Profile",
        hint: "Name, photo, password",
        href: "/app/profile",
        icon: User,
      },
      {
        title: "History",
        hint: "Orders, deposits, wallet activity",
        href: "/app/history",
        icon: History,
      },
      {
        title: "Referral",
        hint: "Invite friends and earn rewards",
        href: "/app/referral",
        icon: Gift,
      },
      {
        title: "Broadcast",
        hint: "Active team announcements",
        href: "/app/broadcast",
        icon: Megaphone,
      },
      {
        title: "Reports",
        hint: "Key and deposit issue tickets",
        href: "/app/reports",
        icon: Flag,
        ...(activeReports > 0
          ? { badge: { label: `${activeReports} OPEN`, tone: "danger" as const } }
          : {}),
      },
    ],
  });

  if (role === "SELLER" || role === "RESELLER" || role === "ADMIN") {
    sections.push({
      label: "Development",
      items: [
        {
          title: "Platform API",
          hint: "API keys · usage · webhooks",
          href: "/app/development",
          icon: Code2,
        },
        {
          title: "Docs",
          hint: "Public API reference + live test",
          href: "/developers",
          icon: BookOpen,
        },
      ],
    });
  }

  if (role === "SELLER" || role === "RESELLER") {
    const sellerItems: SideNavGroup["items"] = [
      {
        title: "Seller board",
        hint: "Private seller rankings",
        href: "/app/seller/leaderboard",
        icon: Trophy,
      },
    ];
    if (
      role === "SELLER" &&
      (caps.canCreateResellers ||
        caps.canManageResellers ||
        caps.canFundResellers)
    ) {
      sellerItems.unshift({
        title: "Seller panel",
        hint: "Manage resellers",
        href: "/app/seller",
        icon: UsersRound,
      });
    }
    sections.splice(1, 0, {
      label: "Seller",
      items: sellerItems,
    });
  }

  if (role === "ADMIN") {
    sections.unshift({
      label: "Administration",
      items: [
        {
          title: "Admin panel",
          hint: "Catalog, keys and orders",
          href: "/admin",
          icon: LayoutDashboard,
        },
        {
          title: "Create resellers",
          hint: "Admin reseller tools",
          href: "/admin/users",
          icon: UserPlus,
        },
      ],
    });
  }

  return sections;
}

type CustomerSidebarProps = React.ComponentProps<typeof Sidebar> & {
  user: SafeUser;
  /** SSR store flag; live AuthProvider pagesEnabled overrides when synced. */
  giftCodesEnabled?: boolean;
};

export function CustomerSidebar({
  user,
  giftCodesEnabled: giftCodesEnabledProp = false,
  ...props
}: CustomerSidebarProps) {
  const pathname = usePathname();
  const { setOpenMobile, isMobile } = useSidebar();
  const { pagesEnabled, user: liveUser, sidebarBadges } = useAuth();
  const giftCodesEnabled =
    liveUser && liveUser.id === user.id
      ? pagesEnabled.giftCodes
      : giftCodesEnabledProp;

  useEffect(() => {
    if (isMobile) setOpenMobile(false);
  }, [pathname, isMobile, setOpenMobile]);

  const sections = useMemo(
    () =>
      buildNavSections(
        user.role,
        {
          canCreateResellers: user.canCreateResellers,
          canManageResellers: user.canManageResellers,
          canFundResellers: user.canFundResellers,
        },
        user.depositsEnabled,
        giftCodesEnabled,
        sidebarBadges,
      ),
    [
      user.role,
      user.canCreateResellers,
      user.canManageResellers,
      user.canFundResellers,
      user.depositsEnabled,
      giftCodesEnabled,
      sidebarBadges,
    ],
  );

  const tag =
    user.role === "SELLER"
      ? "Seller"
      : user.role === "RESELLER"
        ? "Reseller"
        : user.role === "ADMIN"
          ? "Admin"
          : "Customer";

  const displayName = user.name.trim() || user.username;

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader className="gap-0 border-b border-sidebar-border p-0">
        <SideBrand
          href="/app"
          tag={tag}
          onClose={isMobile ? () => setOpenMobile(false) : undefined}
        />
      </SidebarHeader>
      <SidebarContent className="min-h-0 flex-1 gap-0 overflow-x-hidden overflow-y-auto">
        <SideNav groups={sections} />
      </SidebarContent>
      <SidebarFooter className="gap-2 border-t border-sidebar-border p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <SideBalance
          balanceMicrocents={user.walletBalance}
          action={
            user.depositsEnabled
              ? { href: "/app/deposit", label: "Top up" }
              : undefined
          }
        />
        <SideProfile
          name={displayName}
          handle={`@${user.username}`}
          role={roleLabel(user.role)}
          imageUrl={user.avatarUrl}
          crown={user.role === "ADMIN"}
        />
      </SidebarFooter>
    </Sidebar>
  );
}
