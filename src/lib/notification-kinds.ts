/*
  Notification categories (client-safe). Every Notification.type maps to one category,
  which drives the icon, colour and filter chip in the bell + /app/notifications.
  Add new types to TYPE_CATEGORY when you add a new notifyUser() call.
*/

export const NOTIFICATION_CATEGORIES = ["wallet", "orders", "support", "rewards", "offers", "news", "account"] as const;
export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

export const CATEGORY_LABEL: Record<NotificationCategory, string> = {
  wallet: "Wallet",
  orders: "Orders",
  support: "Support",
  rewards: "Rewards",
  offers: "Offers",
  news: "Announcements",
  account: "Account",
};

const TYPE_CATEGORY: Record<string, NotificationCategory> = {
  deposit_credited: "wallet",
  deposit_rejected: "wallet",
  deposit_review: "wallet",
  wallet_credit: "wallet",
  wallet_debit: "wallet",
  reseller_credit: "wallet",
  order_fulfilled: "orders",
  issue_report_update: "support",
  support_reply: "support",
  referral_spin: "rewards",
  referral_spin_win: "rewards",
  referral_commission: "rewards",
  REFERRAL: "rewards",
  flash_sale: "offers",
  promo: "offers",
  broadcast: "news",
  SELLER_ANNOUNCEMENT: "news",
  seller_approved: "account",
  seller_rejected: "account",
  role_changed: "account",
  deposit_access: "account",
  MIGRATION_ROLE_UPGRADE: "account",
  security: "account",
  welcome: "account",
};

export function notificationCategory(type: string): NotificationCategory {
  return TYPE_CATEGORY[type] ?? "news";
}

/** Types in each category, for server-side filtering. */
export function typesForCategory(category: NotificationCategory): string[] {
  return Object.entries(TYPE_CATEGORY)
    .filter(([, c]) => c === category)
    .map(([t]) => t);
}

export type NotificationView = {
  id: string;
  type: string;
  category: NotificationCategory;
  title: string;
  message: string;
  actionUrl: string | null;
  read: boolean;
  createdAt: string;
};

export type NotificationPage = {
  items: NotificationView[];
  unread: number;
  nextCursor: string | null;
};
