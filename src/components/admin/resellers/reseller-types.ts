export type ResellerRequestStatus = "PENDING" | "APPROVED" | "REJECTED";

export type ResellerRequestRow = {
  id: string;
  status: ResellerRequestStatus;
  fullName: string;
  phone: string;
  country: string;
  facebookUrl: string;
  telegram: string;
  youtubeUrl: string | null;
  telegramChannelUrl: string | null;
  websiteUrl: string | null;
  followerCount: string;
  experience: string | null;
  sellingPlatform: string;
  reason: string;
  adminNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    username: string;
    role: string;
    walletBalance: number;
    banned: boolean;
    canCreateResellers: boolean;
    createdAt: string;
  };
};
