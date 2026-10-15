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
import { roleLabel } from "@/lib/roles";
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
): SideNavGroup[] {
  const pendingDev = badges?.pendingDevSettlements ?? 0;
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
          hint: "Health snapshot",
          href: "/admin",
          icon: LayoutDashboard,
          exact: true,
        },
        {
          title: "Statistics",
          hint: "Sales charts",
          href: "/admin/statistics",
          icon: BarChart3,
        },
        {
          title: "Development",
          hint: "Developer settlements",
          href: "/admin/development",
          icon: Code2,
          ...(pendingDev > 0
            ? { badge: { label: `${pendingDev} PENDING`, tone: "warning" as const } }
            : {}),
        },
        {
          title: "History",
          hint: "All activity",
          href: "/admin/history",
          icon: History,
        },
        {
          title: "Logs",
          hint: "Login & user activity",
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
          hint: "Catalog folders",
          href: "/admin/categories",
          icon: FolderTree,
        },
        {
          title: "Products",
          hint: "Catalog & prices",
          href: "/admin/products",
          icon: Package,
        },
        {
          title: "Keys",
          hint: "Stock & import",
          href: "/admin/keys",
          icon: KeyRound,
        },
        {
          title: "Supplier",
          hint: "Upstream key API",
          href: "/admin/supplier",
          icon: Truck,
        },
        {
          title: "Keys Check",
          hint: "Lookup & edit",
          href: "/admin/key-check",
          icon: ScanSearch,
        },
        {
          title: "Special Stock",
          hint: "Isolated bot inventory",
          href: "/admin/special-inventory",
          icon: Layers,
          ...(pendingSpec > 0
            ? { badge: { label: `${pendingSpec} PENDING`, tone: "warning" as const } }
            : {}),
        },
        {
          title: "Orders",
          hint: "Purchases & delivery",
          href: "/admin/orders",
          icon: ShoppingBag,
          ...(pendingOrders > 0
            ? { badge: { label: `${pendingOrders} PENDING`, tone: "info" as const } }
            : {}),
        },
        {
          title: "Promos",
          hint: "Discount codes",
          href: "/admin/promos",
          icon: Tag,
        },
        {
          title: "Flash Sale",
          hint: "Timed discounts",
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
          hint: "Manual payment requests",
          href: "/admin/deposits",
          icon: Wallet,
          ...(pendingDeposits > 0
            ? { badge: { label: `${pendingDeposits} PENDING`, tone: "warning" as const } }
            : {}),
        },
        {
          title: "QRIS deposits",
          hint: "AutoGoPay IDR analytics",
          href: "/admin/qris",
          icon: QrCode,
        },
        {
          title: "Gift codes",
          hint: "USD redeem codes + claims",
          href: "/admin/gift-codes",
          icon: Gift,
        },
        {
          title: "Reports",
          hint: "Key and deposit issue tickets",
          href: "/admin/reports",
          icon: FileBarChart,
          ...(openReports > 0
            ? { badge: { label: `${openReports} OPEN`, tone: "danger" as const } }
            : {}),
        },
      ],
    },
    {
      label: "Users",
      items: [
        {
          title: "Users",
          hint: "Roles, wallets",
          href: "/admin/users",
          icon: Users,
        },
        {
          title: "Special prices",
          hint: "Per-user duration overrides",
          href: "/admin/special-prices",
          icon: BadgeDollarSign,
        },
        {
          title: "Sellers",
          hint: "Applications and reviews",
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
          hint: "Home image carousel",
          href: "/admin/banners",
          icon: Image,
        },
        {
          title: "Reviews",
          hint: "Approve & moderate",
          href: "/admin/reviews",
          icon: Star,
          ...(pendingReviews > 0
            ? { badge: { label: `${pendingReviews} PENDING`, tone: "warning" as const } }
            : {}),
        },
        {
          title: "FAQs",
          hint: "Help articles",
          href: "/admin/faqs",
          icon: HelpCircle,
        },
        {
          title: "Static Pages",
          hint: "Legal & info CMS",
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
          hint: "Keys, fees, developer margin",
          href: "/admin/seller-api",
          icon: Code2,
        },
        {
          title: "Settings",
          hint: "Referral rates and program",
          href: "/admin/settings",
          icon: Settings,
        },
        {
          title: "Site Config",
          hint: "Brand, colours, assets",
          href: "/admin/site-config",
          icon: Palette,
        },
        {
          title: "Icons",
          hint: "Replace site icons",
          href: "/admin/icons",
          icon: Images,
        },
        {
          title: "Cron",
          hint: "Jobs & run history",
          href: "/admin/cron",
          icon: Clock,
        },
        {
          title: "Broadcast",
          hint: "Pinned announcements",
          href: "/admin/broadcast",
          icon: Megaphone,
        },
        {
          title: "Analytics",
          hint: "Composition charts",
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

  const sections = useMemo(
    () => buildAdminNavSections(stats.adminBadges),
    [stats.adminBadges],
  );

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader className="gap-0 border-b border-sidebar-border p-0">
        <SideBrand
          href="/admin"
          tag="Admin"
          onClose={isMobile ? () => setOpenMobile(false) : undefined}
        />
      </SidebarHeader>
      <SidebarContent className="min-h-0 flex-1 gap-0 overflow-x-hidden overflow-y-auto">
        <SideNav groups={sections} />
      </SidebarContent>
      <SidebarFooter className="gap-2 border-t border-sidebar-border p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <SideBalance balanceMicrocents={user.walletBalance} />
        <SideProfile
          name={displayName}
          handle={`@${user.username}`}
          role={roleLabel(user.role)}
          imageUrl={user.avatarUrl}
          crown
        />
      </SidebarFooter>
    </Sidebar>
  );
}
