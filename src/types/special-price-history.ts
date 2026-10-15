export const SPECIAL_PRICE_HISTORY_ACTIONS = ["SET", "UPDATE", "CLEAR"] as const;
export type SpecialPriceHistoryAction =
  (typeof SPECIAL_PRICE_HISTORY_ACTIONS)[number];

export type SpecialPriceHistoryRow = {
  id: string;
  userId: string;
  username: string | null;
  durationId: string;
  durationLabel: string | null;
  productId: string | null;
  productTitle: string | null;
  action: string;
  previousPrice: number | null;
  newPrice: number | null;
  adminId: string | null;
  adminUsername: string | null;
  createdAt: string;
};

export type SpecialPriceHistoryPage = {
  items: SpecialPriceHistoryRow[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
};
