export type ReviewStatusValue = "PENDING" | "APPROVED" | "DISABLED";

export type ReviewSort = "newest" | "highest" | "lowest";

export type ProductReviewPublic = {
  id: string;
  rating: number;
  body: string;
  verifiedBuyer: boolean;
  createdAt: string;
  author: {
    username: string;
    name: string;
    avatarUrl: string | null;
  };
};

/** Counts of APPROVED reviews per star (1–5). */
export type ReviewDistribution = {
  1: number;
  2: number;
  3: number;
  4: number;
  5: number;
};

export type ProductReviewsPayload = {
  reviews: ProductReviewPublic[];
  page: number;
  limit: number;
  hasMore: boolean;
  averageRating: number;
  reviewCount: number;
  distribution: ReviewDistribution;
  canReview: boolean;
  alreadyReviewed: boolean;
  /** True when the viewer has a review awaiting admin approval. */
  pendingReview: boolean;
  verifiedBuyer: boolean;
};

export type AdminReviewRow = {
  id: string;
  rating: number;
  body: string;
  verifiedBuyer: boolean;
  status: ReviewStatusValue;
  createdAt: string;
  updatedAt: string;
  product: {
    id: string;
    title: string;
    imageUrl: string | null;
  };
  user: {
    id: string;
    username: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  } | null;
  customAuthorName?: string | null;
  customAvatarUrl?: string | null;
};

export type AdminReviewBuyerOption = {
  id: string;
  username: string;
  name: string;
  email: string;
  alreadyReviewed: boolean;
};
