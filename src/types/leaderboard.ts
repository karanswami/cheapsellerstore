export type LeaderboardEntry = {
  rank: number;
  userId: string;
  username: string;
  name: string;
  avatarUrl: string | null;
  /** USD microcents spent on fulfilled/paid orders */
  totalSpent: number;
  /** Total keys purchased (OrderItem rows on fulfilled/paid orders) */
  keyCount: number;
  isPremium: boolean;
  emailVerified: boolean;
  emojiStatus: string | null;
};

export type LeaderboardPayload = {
  entries: LeaderboardEntry[];
  /** Viewer's rank even when outside the visible top list; null if no spend */
  viewer: LeaderboardEntry | null;
};
