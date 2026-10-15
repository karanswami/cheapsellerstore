"use client";

import { ConsoleBrand } from "@/components/layout/console-brand";
import {
  ConsoleNav,
  type ConsoleNavSection,
} from "@/components/layout/console-nav";
import {
  ConsoleHeroProfile,
  ConsoleProfileCard,
  ConsoleQuickStats,
} from "@/components/layout/console-profile";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import { roleAccessLine, roleLabel } from "@/lib/roles";
import type { AdminSidebarBadges, ConsoleSidebarStats } from "@/lib/sidebar-stats";
import type { SafeUser } from "@/types/user";
import {
  BadgeDollarSign,
  BarChart3,
  Clock,
  Code2,
  FileBarChart,
  FileText,
  FolderTree,
  Gem,
  Gift,
  HelpCircle,
  History,
  Image,
  Images,
  KeyRound,
  Layers,
  LayoutDashboard,
  Megaphone,
  Package,
  Palette,
  QrCode,
  PieChart,
  ScanSearch,
  ScrollText,
  Settings,
  ShoppingBag,
  Star,
  Tag,
  Truck,
  UserPlus,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useMemo } from "react";

function buildAdminNavSections(
  badges?: AdminSidebarBadges,
): ConsoleNavSection[] {
  const pendingDev = badges?.pendingDevSettlements ?? 0;
  const pendingPrem = badges?.pendingPremiumSettlements ?? 0;
  const pendingSpec = badges?.pendingSpecialSettlements ?? 0;
  const pendingOrders = badges?.pendingOrders ?? 0;
  const pendingDeposits = badges?.pendingDeposits ?? 0;
  const openReports = badges?.openReports ?? 0;
  const pendingSellers = badges?.pendingSellers ?? 0;
  const pendingReviews = badges?.pendingReviews ?? 0;

  return [
    {
      label: "Dashboard",
      items: [
        {
          title: "Overview",
          description: "Health snapshot",
          href: "/admin",
          icon: LayoutDashboard,
          exact: true,
        },
        {
          title: "Statistics",
          description: "Sales charts",
          href: "/admin/statistics",
          icon: BarChart3,
        },
        {
          title: "Development",
          description: "Developer settlements",
          href: "/admin/development",
          icon: Code2,
          ...(pendingDev > 0
            ? { badge: { label: `${pendingDev} PENDING`, tone: "warning" as const } }
            : {}),
        },
        {
          title: "Premium settlements",
          description: "Premium developer share",
          href: "/admin/premium-settlements",
          icon: Gem,
          ...(pendingPrem > 0
            ? { badge: { label: `${pendingPrem} PENDING`, tone: "warning" as const } }
            : {}),
        },
        {
          title: "History",
          description: "All activity",
          href: "/admin/history",
          icon: History,
        },
        {
          title: "Logs",
          description: "Login & user activity",
          href: "/admin/logs",
          icon: ScrollText,
        },
      ],
    },
    {
      label: "Store",
      items: [
        {
          title: "Categories",
          description: "Catalog folders",
          href: "/admin/categories",
          icon: FolderTree,
        },
        {
          title: "Products",
          description: "Catalog & prices",
          href: "/admin/products",
          icon: Package,
        },
        {
          title: "Keys",
          description: "Stock & import",
          href: "/admin/keys",
          icon: KeyRound,
        },
        {
          title: "Supplier",
          description: "Upstream key API",
          href: "/admin/supplier",
          icon: Truck,
        },
        {
          title: "Keys Check",
          description: "Lookup & edit",
          href: "/admin/key-check",
          icon: ScanSearch,
        },
        {
          title: "Special Stock",
          description: "Isolated bot inventory",
          href: "/admin/special-inventory",
          icon: Layers,
          ...(pendingSpec > 0
            ? { badge: { label: `${pendingSpec} PENDING`, tone: "warning" as const } }
            : {}),
        },
        {
          title: "Orders",
          description: "Purchases & delivery",
          href: "/admin/orders",
          icon: ShoppingBag,
          ...(pendingOrders > 0
            ? { badge: { label: `${pendingOrders} PENDING`, tone: "info" as const } }
            : {}),
        },
        {
          title: "Promos",
          description: "Discount codes",
          href: "/admin/promos",
          icon: Tag,
        },
        {
          title: "Flash Sale",
          description: "Timed discounts",
          href: "/admin/flash-sales",
          icon: Zap,
        },
      ],
    },
    {
      label: "Payments",
      items: [
        {
          title: "Deposits",
          description: "Manual payment requests",
          href: "/admin/deposits",
          icon: Wallet,
          ...(pendingDeposits > 0
            ? { badge: { label: `${pendingDeposits} PENDING`, tone: "warning" as const } }
            : {}),
        },
        {
          title: "QRIS deposits",
          description: "AutoGoPay IDR analytics",
          href: "/admin/qris",
          icon: QrCode,
        },
        {
          title: "Gift codes",
          description: "USD redeem codes + claims",
          href: "/admin/gift-codes",
          icon: Gift,
        },
        {
          title: "Reports",
          description: "Key and deposit issue tickets",
          href: "/admin/reports",
          icon: FileBarChart,
          ...(openReports > 0
            ? { badge: { label: `${openReports} OPEN`, tone: "destructive" as const } }
            : {}),
        },
      ],
    },
    {
      label: "Users",
      items: [
        {
          title: "Users",
          description: "Roles, Premium, wallets",
          href: "/admin/users",
          icon: Users,
        },
        {
          title: "Special prices",
          description: "Per-user duration overrides",
          href: "/admin/special-prices",
          icon: BadgeDollarSign,
        },
        {
          title: "Sellers",
          description: "Applications and reviews",
          href: "/admin/sellers",
          icon: UserPlus,
          ...(pendingSellers > 0
            ? { badge: { label: `${pendingSellers} PENDING`, tone: "warning" as const } }
            : {}),
        },
      ],
    },
    {
      label: "Content",
      items: [
        {
          title: "Banners",
          description: "Home image carousel",
          href: "/admin/banners",
          icon: Image,
        },
        {
          title: "Reviews",
          description: "Approve & moderate",
          href: "/admin/reviews",
          icon: Star,
          ...(pendingReviews > 0
            ? { badge: { label: `${pendingReviews} PENDING`, tone: "warning" as const } }
            : {}),
        },
        {
          title: "FAQs",
          description: "Help articles",
          href: "/admin/faqs",
          icon: HelpCircle,
        },
        {
          title: "Static Pages",
          description: "Legal & info CMS",
          href: "/admin/static-pages",
          icon: FileText,
        },
      ],
    },
    {
      label: "System",
      items: [
        {
          title: "Platform API",
          description: "Keys, fees, developer margin",
          href: "/admin/seller-api",
          icon: Code2,
        },
        {
          title: "Settings",
          description: "Referral rates and program",
          href: "/admin/settings",
          icon: Settings,
        },
        {
          title: "Site Config",
          description: "Brand, colours, assets",
          href: "/admin/site-config",
          icon: Palette,
        },
        {
          title: "Icons",
          description: "Replace site icons",
          href: "/admin/icons",
          icon: Images,
        },
        {
          title: "Cron",
          description: "Jobs & run history",
          href: "/admin/cron",
          icon: Clock,
        },
        {
          title: "Broadcast",
          description: "Pinned announcements",
          href: "/admin/broadcast",
          icon: Megaphone,
        },
        {
          title: "Analytics",
          description: "Composition charts",
          href: "/admin/analytics",
          icon: PieChart,
        },
      ],
    },
  ];
}

type AdminSidebarProps = React.ComponentProps<typeof Sidebar> & {
  user: SafeUser;
  stats: ConsoleSidebarStats;
};

export function AdminSidebar({
  user,
  stats,
  ...props
}: AdminSidebarProps) {
  const pathname = usePathname();
  const { setOpenMobile, isMobile } = useSidebar();

  useEffect(() => {
    if (isMobile) setOpenMobile(false);
  }, [pathname, isMobile, setOpenMobile]);

  const displayName = user.name.trim() || user.username;
  const initial =
    displayName.charAt(0).toUpperCase() ||
    user.username.charAt(0).toUpperCase() ||
    "?";

  const sections = useMemo(
    () => buildAdminNavSections(stats.adminBadges),
    [stats.adminBadges],
  );

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader className="gap-0 border-b border-sidebar-border p-0 pb-2">
        <ConsoleBrand
          href="/admin"
          subtitle="Admin console"
          onClose={isMobile ? () => setOpenMobile(false) : undefined}
        />
        <ConsoleHeroProfile
          name={displayName}
          roleLabel={roleLabel(user.role)}
          accessLine={roleAccessLine(user.role)}
          balanceMicrocents={user.walletBalance}
          initial={initial}
          imageUrl={user.avatarUrl}
          showCrown
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
          showCrown
        />
        <ConsoleQuickStats
          orders={stats.orders}
          keys={stats.keys}
          deposits={stats.deposits}
        />
      </SidebarFooter>
    </Sidebar>
  );
}
