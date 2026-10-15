import type { Currency } from "@/lib/currencies";
import type { UserRole } from "@/lib/roles";

export type AdminUserRow = {
  id: string;
  name: string;
  username: string;
  email: string;
  currency: Currency;
  role: UserRole;
  walletBalance: number;
  banned: boolean;
  /** Admin-only note; null when active. */
  banReason: string | null;
  resellerDiscount: number;
  canCreateResellers: boolean;
  canManageResellers: boolean;
  canFundResellers: boolean;
  apiEnabled: boolean;
  depositsEnabled: boolean;
  emailVerified: boolean;
  referredById: string | null;
  referralCode: string | null;
  createdAt: string;
  referredBy?: {
    id: string;
    username: string;
    name: string;
    role: string;
  } | null;
};

export type AdminUserActivityItem = {
  id: string;
  kind: string;
  label: string;
  amount: number;
  meta: string;
  createdAt: string;
};
