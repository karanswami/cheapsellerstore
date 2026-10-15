export type AdminPremiumUserRow = {
  id: string;
  name: string;
  username: string;
  email: string;
  role: string;
  walletBalance: number;
  banned: boolean;
  emailVerified: boolean;
  isPremium: boolean;
  premiumPurchasedAt: string | null;
  createdAt: string;
};

export type AdminPremiumListResult = {
  users: AdminPremiumUserRow[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  premiumCount: number;
};
