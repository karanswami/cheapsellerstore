/** Stable keys for replaceable site / admin / deposit icons. */
export const SITE_ICON_KEYS = [
  "overview",
  "statistics",
  "development",
  "history",
  "categories",
  "products",
  "keys",
  "key-check",
  "orders",
  "cart",
  "promo",
  "flash-sale",
  "deposits",
  "reports",
  "users",
  "resellers",
  "premium",
  "support",
  "banners",
  "reviews",
  "support-routes",
  "faqs",
  "static-pages",
  "settings",
  "site-config",
  "cron",
  "broadcast",
  "analytics",
  "icons",
  "home",
  "leaderboard",
  "profile",
  "referral",
  "admin-panel",
  "theme",
  "success",
  "deposit-qris",
  "deposit-binance",
  "deposit-inr",
  "deposit-npr",
  "deposit-manual",
] as const;

export type SiteIconKey = (typeof SITE_ICON_KEYS)[number];

export type SiteIconMeta = {
  key: SiteIconKey;
  label: string;
  description: string;
  group: "admin" | "customer" | "deposit" | "general";
  /** Built-in PNG under /public/icons */
  defaultUrl: string;
};

export const SITE_ICON_META: SiteIconMeta[] = [
  {
    key: "overview",
    label: "Overview",
    description: "Admin dashboard overview",
    group: "admin",
    defaultUrl: "/icons/overview.png",
  },
  {
    key: "statistics",
    label: "Statistics",
    description: "Admin sales charts",
    group: "admin",
    defaultUrl: "/icons/statistics.png",
  },
  {
    key: "development",
    label: "Development",
    description: "Developer settlements",
    group: "admin",
    defaultUrl: "/icons/development.png",
  },
  {
    key: "history",
    label: "History",
    description: "Activity history",
    group: "admin",
    defaultUrl: "/icons/history.png",
  },
  {
    key: "categories",
    label: "Categories",
    description: "Catalog folders",
    group: "admin",
    defaultUrl: "/icons/categories.png",
  },
  {
    key: "products",
    label: "Products",
    description: "Catalog products",
    group: "admin",
    defaultUrl: "/icons/products.png",
  },
  {
    key: "keys",
    label: "Keys",
    description: "Key inventory / purchased keys",
    group: "admin",
    defaultUrl: "/icons/keys.png",
  },
  {
    key: "key-check",
    label: "Key Check",
    description: "Lookup & edit keys",
    group: "admin",
    defaultUrl: "/icons/key-check.png",
  },
  {
    key: "orders",
    label: "Orders",
    description: "Purchases & delivery",
    group: "admin",
    defaultUrl: "/icons/orders.png",
  },
  {
    key: "cart",
    label: "Cart",
    description: "Shopping cart",
    group: "general",
    defaultUrl: "/icons/cart.png",
  },
  {
    key: "promo",
    label: "Promos",
    description: "Discount codes",
    group: "admin",
    defaultUrl: "/icons/promo.png",
  },
  {
    key: "flash-sale",
    label: "Flash Sale",
    description: "Timed discounts",
    group: "admin",
    defaultUrl: "/icons/flash-sale.png",
  },
  {
    key: "deposits",
    label: "Deposits",
    description: "Wallet top-up",
    group: "admin",
    defaultUrl: "/icons/deposits.png",
  },
  {
    key: "reports",
    label: "Reports",
    description: "Deposit reports / alerts",
    group: "admin",
    defaultUrl: "/icons/reports.png",
  },
  {
    key: "users",
    label: "Users",
    description: "Accounts desk",
    group: "admin",
    defaultUrl: "/icons/users.png",
  },
  {
    key: "resellers",
    label: "Resellers",
    description: "Reseller desk / seller panel",
    group: "admin",
    defaultUrl: "/icons/resellers.png",
  },
  {
    key: "premium",
    label: "Premium",
    description: "Premium membership",
    group: "admin",
    defaultUrl: "/icons/premium.png",
  },
  {
    key: "support",
    label: "Support",
    description: "Support chats / FAB",
    group: "admin",
    defaultUrl: "/icons/support.png",
  },
  {
    key: "banners",
    label: "Banners",
    description: "Home carousel",
    group: "admin",
    defaultUrl: "/icons/banners.png",
  },
  {
    key: "reviews",
    label: "Reviews",
    description: "Product reviews",
    group: "admin",
    defaultUrl: "/icons/reviews.png",
  },
  {
    key: "support-routes",
    label: "Support training",
    description: "Keyword routes",
    group: "admin",
    defaultUrl: "/icons/support-routes.png",
  },
  {
    key: "faqs",
    label: "FAQs",
    description: "Help articles",
    group: "admin",
    defaultUrl: "/icons/faqs.png",
  },
  {
    key: "static-pages",
    label: "Static Pages",
    description: "Legal & info CMS",
    group: "admin",
    defaultUrl: "/icons/static-pages.png",
  },
  {
    key: "settings",
    label: "Settings",
    description: "App settings",
    group: "admin",
    defaultUrl: "/icons/settings.png",
  },
  {
    key: "site-config",
    label: "Site Config",
    description: "Brand, colours, assets",
    group: "admin",
    defaultUrl: "/icons/site-config.png",
  },
  {
    key: "cron",
    label: "Cron",
    description: "Jobs & run history",
    group: "admin",
    defaultUrl: "/icons/cron.png",
  },
  {
    key: "broadcast",
    label: "Broadcast",
    description: "Broadcast messages",
    group: "admin",
    defaultUrl: "/icons/broadcast.png",
  },
  {
    key: "analytics",
    label: "Analytics",
    description: "Composition charts",
    group: "admin",
    defaultUrl: "/icons/analytics.png",
  },
  {
    key: "icons",
    label: "Icons",
    description: "Icon manager nav",
    group: "admin",
    defaultUrl: "/icons/icons.png",
  },
  {
    key: "home",
    label: "Home",
    description: "Customer store home",
    group: "customer",
    defaultUrl: "/icons/home.png",
  },
  {
    key: "leaderboard",
    label: "Leaderboard",
    description: "Top spend ranks",
    group: "customer",
    defaultUrl: "/icons/leaderboard.png",
  },
  {
    key: "profile",
    label: "Profile",
    description: "Account profile",
    group: "customer",
    defaultUrl: "/icons/profile.png",
  },
  {
    key: "referral",
    label: "Referral",
    description: "Invite & earn",
    group: "customer",
    defaultUrl: "/icons/referral.png",
  },
  {
    key: "admin-panel",
    label: "Admin panel",
    description: "Link to admin console",
    group: "customer",
    defaultUrl: "/icons/admin-panel.png",
  },
  {
    key: "theme",
    label: "Theme",
    description: "Theme / appearance",
    group: "general",
    defaultUrl: "/icons/theme.png",
  },
  {
    key: "success",
    label: "Success",
    description: "Success / completed states",
    group: "general",
    defaultUrl: "/icons/success.png",
  },
  {
    key: "deposit-qris",
    label: "QRIS",
    description: "Indonesia QRIS + IDR manual default",
    group: "deposit",
    defaultUrl: "/icons/deposit-qris.png",
  },
  {
    key: "deposit-binance",
    label: "Binance",
    description: "Binance Pay + USD manual default",
    group: "deposit",
    defaultUrl: "/icons/deposit-binance.png",
  },
  {
    key: "deposit-inr",
    label: "INR",
    description: "Cashfree INR + INR manual default",
    group: "deposit",
    defaultUrl: "/icons/deposit-inr.png",
  },
  {
    key: "deposit-npr",
    label: "NPR",
    description: "eSewa / NPR manual default",
    group: "deposit",
    defaultUrl: "/icons/deposit-npr.png",
  },
  {
    key: "deposit-manual",
    label: "Manual",
    description: "Generic manual deposit method logo",
    group: "deposit",
    defaultUrl: "/icons/deposit-manual.png",
  },
];

export type SiteIconsMap = Record<SiteIconKey, string>;

export function defaultSiteIconsMap(): SiteIconsMap {
  const map = {} as SiteIconsMap;
  for (const meta of SITE_ICON_META) {
    map[meta.key] = meta.defaultUrl;
  }
  return map;
}

export function isSiteIconKey(value: string): value is SiteIconKey {
  return (SITE_ICON_KEYS as readonly string[]).includes(value);
}

export type AdminSiteIconRow = {
  key: SiteIconKey;
  label: string;
  description: string;
  group: SiteIconMeta["group"];
  defaultUrl: string;
  customUrl: string;
  url: string;
  isCustom: boolean;
};
