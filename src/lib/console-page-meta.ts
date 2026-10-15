import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Clock,
  Code2,
  Crown,
  FileBarChart,
  FileText,
  Flag,
  FolderTree,
  Gem,
  Gift,
  HelpCircle,
  History,
  Home,
  Image,
  Images,
  KeyRound,
  LayoutDashboard,
  Megaphone,
  Package,
  Palette,
  PieChart,
  ScanSearch,
  ScrollText,
  Settings,
  ShoppingBag,
  Star,
  Store,
  Tag,
  Trophy,
  Truck,
  User,
  UserPlus,
  Users,
  UsersRound,
  Wallet,
  Zap,
  BadgeDollarSign,
} from "lucide-react";

export type ConsolePageMeta = {
  title: string;
  subtitle: string;
  icon?: LucideIcon;
};

type RouteEntry = ConsolePageMeta & {
  path: string;
  exact?: boolean;
};

const APP_ROUTES: RouteEntry[] = [
  {
    path: "/app",
    exact: true,
    title: "Home",
    subtitle: "Shop mods & tools",
    icon: Home,
  },
  {
    path: "/app/keys",
    title: "Key vault",
    subtitle: "Reveal, copy, or download your licenses",
    icon: KeyRound,
  },
  {
    path: "/app/leaderboard",
    title: "Leaderboard",
    subtitle: "Top customers by total spend",
    icon: Trophy,
  },
  {
    path: "/app/deposit",
    title: "Deposit",
    subtitle: "Top up wallet balance for checkout",
    icon: Wallet,
  },
  {
    path: "/app/gift-codes",
    title: "Gift codes",
    subtitle: "Claim USD gift codes to your wallet",
    icon: Gift,
  },
  {
    path: "/app/profile",
    title: "Profile",
    subtitle: "Name, photo, password, and preferences",
    icon: User,
  },
  {
    path: "/app/history",
    title: "History",
    subtitle: "Orders, deposits, and wallet activity",
    icon: History,
  },
  {
    path: "/app/broadcast",
    title: "Broadcast",
    subtitle: "Active team announcements",
    icon: Megaphone,
  },
  {
    path: "/app/reports",
    title: "Reports",
    subtitle: "Key and deposit issue tickets",
    icon: Flag,
  },
  {
    path: "/app/referral",
    title: "Referral",
    subtitle: "Invite friends and earn rewards",
    icon: Gift,
  },
  {
    path: "/app/development",
    title: "Platform API",
    subtitle: "One credential · calls · purchases · webhooks",
    icon: Code2,
  },
  {
    path: "/app/become-seller",
    title: "Become a Seller",
    subtitle: "Apply for wholesale seller access",
    icon: Store,
  },
  {
    path: "/app/seller/leaderboard",
    title: "Seller board",
    subtitle: "Private seller rankings by earnings",
    icon: Trophy,
  },
  {
    path: "/app/seller",
    title: "Seller panel",
    subtitle: "Manage resellers and wholesale tools",
    icon: UsersRound,
  },
];

const ADMIN_ROUTES: RouteEntry[] = [
  {
    path: "/admin",
    exact: true,
    title: "Overview",
    subtitle: "Store health snapshot and queues",
    icon: LayoutDashboard,
  },
  {
    path: "/admin/statistics",
    title: "Statistics",
    subtitle: "Revenue, profit, and sales charts",
    icon: BarChart3,
  },
  {
    path: "/admin/development",
    title: "Development",
    subtitle: "Developer settlement ledger",
    icon: Code2,
  },
  {
    path: "/admin/history",
    title: "History",
    subtitle: "All platform activity",
    icon: History,
  },
  {
    path: "/admin/logs",
    title: "Logs",
    subtitle: "Login and user activity (7-day retention)",
    icon: ScrollText,
  },
  {
    path: "/admin/categories",
    title: "Categories",
    subtitle: "Catalog folders and ordering",
    icon: FolderTree,
  },
  {
    path: "/admin/products",
    title: "Products",
    subtitle: "Catalog, durations, and pricing",
    icon: Package,
  },
  {
    path: "/admin/keys",
    title: "Keys",
    subtitle: "Stock inventory and import",
    icon: KeyRound,
  },
  {
    path: "/admin/supplier",
    title: "Supplier",
    subtitle: "Upstream key API and call logs",
    icon: Truck,
  },
  {
    path: "/admin/key-check",
    title: "Key check",
    subtitle: "Lookup and edit license codes",
    icon: ScanSearch,
  },
  {
    path: "/admin/orders",
    title: "Orders",
    subtitle: "Purchases and key delivery",
    icon: ShoppingBag,
  },
  {
    path: "/admin/deposits",
    title: "Deposits",
    subtitle: "Payment tickets and approvals",
    icon: Wallet,
  },
  {
    path: "/admin/qris",
    title: "QRIS deposits",
    subtitle: "AutoGoPay IDR deposit analytics",
    icon: Wallet,
  },
  {
    path: "/admin/gift-codes",
    title: "Gift codes",
    subtitle: "Create USD codes and view claim details",
    icon: Gift,
  },
  {
    path: "/admin/users",
    title: "Users",
    subtitle: "Accounts, roles, and wallet",
    icon: Users,
  },
  {
    path: "/admin/special-prices",
    title: "Special prices",
    subtitle: "Per-user duration price overrides",
    icon: BadgeDollarSign,
  },
  {
    path: "/admin/sellers",
    title: "Sellers",
    subtitle: "Seller applications and caps",
    icon: UserPlus,
  },
  {
    path: "/admin/seller-api",
    title: "Platform API",
    subtitle: "Developers, keys, usage, and margin",
    icon: Code2,
  },
  {
    path: "/admin/settings",
    title: "Settings",
    subtitle: "Business rules and deposit rails",
    icon: Settings,
  },
  {
    path: "/admin/site-config",
    title: "Site config",
    subtitle: "Brand, SEO, and theme colours",
    icon: Palette,
  },
  {
    path: "/admin/icons",
    title: "Icons",
    subtitle: "Replaceable site icon pack",
    icon: Image,
  },
  {
    path: "/admin/cron",
    title: "Cron",
    subtitle: "Deposit poll jobs and history",
    icon: Clock,
  },
  {
    path: "/admin/banners",
    title: "Banners",
    subtitle: "Store carousel slides",
    icon: Images,
  },
  {
    path: "/admin/promos",
    title: "Promos",
    subtitle: "Discount codes and audiences",
    icon: Tag,
  },
  {
    path: "/admin/flash-sales",
    title: "Flash sales",
    subtitle: "Timed storefront discounts",
    icon: Zap,
  },
  {
    path: "/admin/reviews",
    title: "Reviews",
    subtitle: "Moderate product ratings",
    icon: Star,
  },
  {
    path: "/admin/faqs",
    title: "FAQs",
    subtitle: "Public help articles",
    icon: HelpCircle,
  },
  {
    path: "/admin/static-pages",
    title: "Static pages",
    subtitle: "Legal and info pages",
    icon: FileText,
  },
  {
    path: "/admin/analytics",
    title: "Analytics",
    subtitle: "Traffic and conversion insights",
    icon: PieChart,
  },
  {
    path: "/admin/reports",
    title: "Reports",
    subtitle: "Key and deposit issue tickets",
    icon: FileBarChart,
  },
  {
    path: "/admin/broadcast",
    title: "Broadcast",
    subtitle: "Pinned announcements",
    icon: Megaphone,
  },
];

const ALL_ROUTES = [...APP_ROUTES, ...ADMIN_ROUTES].sort(
  (a, b) => b.path.length - a.path.length,
);

function matchRoute(pathname: string, entry: RouteEntry): boolean {
  if (entry.exact) return pathname === entry.path;
  return pathname === entry.path || pathname.startsWith(`${entry.path}/`);
}

/** Resolve hub page title/subtitle/icon from the current pathname. */
export function resolveConsolePageMeta(
  pathname: string,
): ConsolePageMeta | null {
  for (const entry of ALL_ROUTES) {
    if (matchRoute(pathname, entry)) {
      return {
        title: entry.title,
        subtitle: entry.subtitle,
        icon: entry.icon,
      };
    }
  }
  return null;
}
