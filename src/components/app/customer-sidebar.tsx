"use client";

import { ConsoleBrand } from "@/components/layout/console-brand";
import {
  ConsoleNav,
  type ConsoleNavSection,
} from "@/components/layout/console-nav";
import {
  ConsoleHeroProfile,
  ConsoleProfileCard,
} from "@/components/layout/console-profile";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/components/auth/auth-provider";
import { roleAccessLine, roleLabel } from "@/lib/roles";
import type { SafeUser } from "@/types/user";
import {
  BookOpen,
  Code2,
  Crown,
  Flag,
  Gift,
  Gem,
  Globe,
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
): ConsoleNavSection[] {
  const sections: ConsoleNavSection[] = [
    {
      label: "Store",
      items: [
        {
          title: "Home",
          description: "Shop mods & tools",
          href: "/app",
          icon: Home,
          exact: true,
        },
        {
          title: "Keys",
          description: "Purchased licenses and codes",
          href: "/app/keys",
          icon: KeyRound,
        },
        {
          title: "Leaderboard",
          description: "Top customers by spend",
          href: "/app/leaderboard",
          icon: Trophy,
          badge: { label: "TOP 100", tone: "primary" },
        },
      ],
    },
  ];

  const walletItems: ConsoleNavSection["items"] = [];
  if (depositsEnabled) {
    const pendingDeposits = badges?.pendingDeposits ?? 0;
    walletItems.push({
      title: "Deposit",
      description: "Top up balance for checkout",
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
      description: "Claim USD gift codes",
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
        description: "Name, photo, password",
        href: "/app/profile",
        icon: User,
      },
      {
        title: "VIP Access",
        description: "VIP perks, custom subdomain & bio",
        href: "/app/bio",
        icon: Crown,
        badge: { label: "VIP", tone: "primary" },
      },

      {
        title: "History",
        description: "Orders, deposits, wallet activity",
        href: "/app/history",
        icon: History,
      },
      {
        title: "Referral",
        description: "Invite friends and earn rewards",
        href: "/app/referral",
        icon: Gift,
      },
      {
        title: "Broadcast",
        description: "Active team announcements",
        href: "/app/broadcast",
        icon: Megaphone,
      },
      {
        title: "Reports",
        description: "Key and deposit issue tickets",
        href: "/app/reports",
        icon: Flag,
        ...(activeReports > 0
          ? { badge: { label: `${activeReports} OPEN`, tone: "destructive" as const } }
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
          description: "API keys · usage · webhooks",
          href: "/app/development",
          icon: Code2,
        },
        {
          title: "Docs",
          description: "Public API reference + live test",
          href: "/developers",
          icon: BookOpen,
        },
      ],
    });
  }

  if (role === "SELLER" || role === "RESELLER") {
    const sellerItems: ConsoleNavSection["items"] = [
      {
        title: "Seller board",
        description: "Private seller rankings",
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
        description: "Manage resellers",
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
          description: "Catalog, keys and orders",
          href: "/admin",
          icon: LayoutDashboard,
        },
        {
          title: "Create resellers",
          description: "Admin reseller tools",
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
  statsSlot: React.ReactNode;
  /** SSR store flag; live AuthProvider pagesEnabled overrides when synced. */
  giftCodesEnabled?: boolean;
};

export function CustomerSidebar({
  user,
  statsSlot,
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

  const subtitle =
    user.role === "SELLER"
      ? "Seller console"
      : user.role === "RESELLER"
        ? "Reseller console"
        : user.role === "ADMIN"
          ? "Admin account"
          : "Customer console";

  const displayName = user.name.trim() || user.username;
  const initial =
    displayName.charAt(0).toUpperCase() ||
    user.username.charAt(0).toUpperCase() ||
    "?";
  const showCrown = user.role === "ADMIN" || user.isPremium;

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader className="gap-0 border-b border-sidebar-border p-0 pb-2">
        <ConsoleBrand
          href="/app"
          subtitle={subtitle}
          onClose={isMobile ? () => setOpenMobile(false) : undefined}
        />
        <ConsoleHeroProfile
          name={displayName}
          roleLabel={roleLabel(user.role)}
          accessLine={roleAccessLine(user.role)}
          balanceMicrocents={user.walletBalance}
          initial={initial}
          imageUrl={user.avatarUrl}
          showCrown={showCrown}
        />
      </SidebarHeader>
      <SidebarContent className="min-h-0 flex-1 gap-0 overflow-x-hidden overflow-y-auto py-2">
        <ConsoleNav sections={sections} />
      </SidebarContent>
      <SidebarFooter className="relative z-10 gap-2 border-t border-sidebar-border bg-sidebar p-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))]">
        <ConsoleProfileCard
          handle={`@${user.username}`}
          role={roleLabel(user.role)}
          balanceMicrocents={user.walletBalance}
          initial={initial}
          imageUrl={user.avatarUrl}
          showCrown={showCrown}
        />
        {statsSlot}
      </SidebarFooter>
    </Sidebar>
  );
}
