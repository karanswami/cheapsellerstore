export type ReferralStats = {
  referralCount: number;
  orderCount: number;
  referralSales: number;
  rewardTotal: number;
  /** Normal (USER) commission % — prefer commissionRates for full breakdown */
  commissionPercent: number;
  commissionRates: {
    user: number;
    seller: number;
    reseller: number;
  };
};

export type ReferralNetworkItem = {
  id: string;
  username: string;
  name: string;
  role: string;
  orderCount: number;
  totalSpend: number;
  createdAt: string;
};

export type ReferralRewardItem = {
  id: string;
  amount: number;
  note: string | null;
  reference: string | null;
  createdAt: string;
};

export type ReferralWeeklyEntry = {
  userId: string;
  username: string;
  amount: number;
  rewardCount: number;
  rank: number;
  isCurrentUser: boolean;
};

export type ReferralDashboard = {
  username: string;
  referralCode: string;
  stats: ReferralStats;
  network: ReferralNetworkItem[];
  rewards: ReferralRewardItem[];
  weeklyLeaderboard: ReferralWeeklyEntry[];
  siteName: string;
};
