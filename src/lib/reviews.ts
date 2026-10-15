import { prisma } from "@/lib/prisma";
import { maskUsername } from "@/lib/username";
import type {
  AdminReviewBuyerOption,
  AdminReviewRow,
  ProductReviewPublic,
  ProductReviewsPayload,
  ReviewDistribution,
  ReviewSort,
  ReviewStatusValue,
} from "@/types/review";
import { OrderStatus, type Prisma, type ReviewStatus } from "@prisma/client";

const EMPTY_DISTRIBUTION: ReviewDistribution = {
  1: 0,
  2: 0,
  3: 0,
  4: 0,
  5: 0,
};

const DEFAULT_PAGE_LIMIT = 10;
const MAX_PAGE_LIMIT = 20;

function clampLimit(limit: number | undefined) {
  if (limit == null || !Number.isFinite(limit)) return DEFAULT_PAGE_LIMIT;
  return Math.min(MAX_PAGE_LIMIT, Math.max(1, Math.floor(limit)));
}

function clampPage(page: number | undefined) {
  if (page == null || !Number.isFinite(page)) return 1;
  return Math.max(1, Math.floor(page));
}

function reviewOrderBy(
  sort: ReviewSort,
): Prisma.ProductReviewOrderByWithRelationInput[] {
  if (sort === "highest") {
    return [{ rating: "desc" }, { createdAt: "desc" }];
  }
  if (sort === "lowest") {
    return [{ rating: "asc" }, { createdAt: "desc" }];
  }
  return [{ createdAt: "desc" }];
}

const BUYER_STATUSES: OrderStatus[] = [
  OrderStatus.FULFILLED,
  OrderStatus.PAID,
];

const PUBLIC_STATUS = "APPROVED" as const satisfies ReviewStatus;

function toPublic(review: {
  id: string;
  rating: number;
  body: string;
  verifiedBuyer: boolean;
  createdAt: Date;
  customAuthorName?: string | null;
  customAvatarUrl?: string | null;
  user?: { username: string; name: string; avatarUrl: string | null } | null;
}): ProductReviewPublic {
  const authorName = review.user
    ? review.user.name
    : (review.customAuthorName || "Verified Customer");
  const authorUsername = review.user
    ? maskUsername(review.user.username)
    : authorName;
  const avatarUrl = review.user
    ? review.user.avatarUrl
    : (review.customAvatarUrl || null);

  return {
    id: review.id,
    rating: review.rating,
    body: review.body,
    verifiedBuyer: review.verifiedBuyer,
    createdAt: review.createdAt.toISOString(),
    author: {
      username: authorUsername,
      name: authorName,
      avatarUrl,
    },
  };
}

function toAdminRow(review: {
  id: string;
  rating: number;
  body: string;
  verifiedBuyer: boolean;
  status: ReviewStatus;
  createdAt: Date;
  updatedAt: Date;
  product: { id: string; title: string; imageUrl: string | null };
  customAuthorName?: string | null;
  customAvatarUrl?: string | null;
  user?: {
    id: string;
    username: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  } | null;
}): AdminReviewRow {
  return {
    id: review.id,
    rating: review.rating,
    body: review.body,
    verifiedBuyer: review.verifiedBuyer,
    status: review.status,
    createdAt: review.createdAt.toISOString(),
    updatedAt: review.updatedAt.toISOString(),
    product: review.product,
    user: review.user ?? null,
    customAuthorName: review.customAuthorName,
    customAvatarUrl: review.customAvatarUrl,
  };
}

export async function isVerifiedBuyer(userId: string, productId: string) {
  const hit = await prisma.orderItem.findFirst({
    where: {
      duration: { productId },
      order: {
        userId,
        status: { in: BUYER_STATUSES },
      },
    },
    select: { id: true },
  });
  return Boolean(hit);
}

export async function refreshProductRating(productId: string) {
  const agg = await prisma.productReview.aggregate({
    where: { productId, status: PUBLIC_STATUS },
    _avg: { rating: true },
    _count: { _all: true },
  });
  const average =
    agg._count._all > 0 && agg._avg.rating != null
      ? Math.round(agg._avg.rating * 10) / 10
      : 0;
  await prisma.product.update({
    where: { id: productId },
    data: { rating: average },
  });
  return { averageRating: average, reviewCount: agg._count._all };
}

const reviewUserSelect = {
  username: true,
  name: true,
  avatarUrl: true,
} satisfies Prisma.UserSelect;

const adminReviewInclude = {
  product: { select: { id: true, title: true, imageUrl: true } },
  user: {
    select: {
      id: true,
      username: true,
      name: true,
      email: true,
      avatarUrl: true,
    },
  },
} as const satisfies Prisma.ProductReviewInclude;

export async function getProductReviews(
  productId: string,
  viewerId: string | null,
  input?: {
    page?: number;
    limit?: number;
    sort?: ReviewSort;
  },
): Promise<ProductReviewsPayload | null> {
  const product = await prisma.product.findFirst({
    where: { id: productId, isActive: true },
    select: { id: true, rating: true },
  });
  if (!product) return null;

  const page = clampPage(input?.page);
  const limit = clampLimit(input?.limit);
  const sort = input?.sort ?? "newest";
  const where = { productId, status: PUBLIC_STATUS } as const;

  const [reviewCount, grouped, reviews] = await Promise.all([
    prisma.productReview.count({ where }),
    prisma.productReview.groupBy({
      by: ["rating"],
      where,
      _count: { _all: true },
    }),
    prisma.productReview.findMany({
      where,
      orderBy: reviewOrderBy(sort),
      skip: (page - 1) * limit,
      take: limit,
      include: {
        user: { select: reviewUserSelect },
      },
    }),
  ]);

  const distribution: ReviewDistribution = { ...EMPTY_DISTRIBUTION };
  for (const row of grouped) {
    const star = row.rating;
    if (star >= 1 && star <= 5) {
      distribution[star as keyof ReviewDistribution] = row._count._all;
    }
  }

  const averageRating =
    reviewCount > 0
      ? product.rating > 0
        ? product.rating
        : Math.round(
            ((distribution[1] * 1 +
              distribution[2] * 2 +
              distribution[3] * 3 +
              distribution[4] * 4 +
              distribution[5] * 5) /
              reviewCount) *
              10,
          ) / 10
      : 0;

  let alreadyReviewed = false;
  let pendingReview = false;
  let verifiedBuyer = false;
  if (viewerId) {
    const own = await prisma.productReview.findFirst({
      where: {
        productId,
        userId: viewerId,
      },
      select: { status: true },
    });
    alreadyReviewed = Boolean(own);
    pendingReview = own?.status === "PENDING";
    verifiedBuyer = await isVerifiedBuyer(viewerId, productId);
  }

  return {
    reviews: reviews.map(toPublic),
    page,
    limit,
    hasMore: page * limit < reviewCount,
    averageRating,
    reviewCount,
    distribution,
    canReview: Boolean(viewerId && verifiedBuyer && !alreadyReviewed),
    alreadyReviewed,
    pendingReview,
    verifiedBuyer,
  };
}

export async function createProductReview(input: {
  productId: string;
  userId: string;
  rating: number;
  body: string;
}): Promise<
  | {
      ok: true;
      pending: true;
      averageRating: number;
      reviewCount: number;
    }
  | { ok: false; code: string; message: string }
> {
  const product = await prisma.product.findFirst({
    where: { id: input.productId, isActive: true },
    select: { id: true },
  });
  if (!product) {
    return { ok: false, code: "NOT_FOUND", message: "Product not found." };
  }

  const verifiedBuyer = await isVerifiedBuyer(input.userId, input.productId);
  if (!verifiedBuyer) {
    return {
      ok: false,
      code: "FORBIDDEN",
      message: "Only verified buyers can leave a review for this product.",
    };
  }

  const existing = await prisma.productReview.findFirst({
    where: {
      productId: input.productId,
      userId: input.userId,
    },
    select: { id: true },
  });
  if (existing) {
    return {
      ok: false,
      code: "CONFLICT",
      message: "You already reviewed this product.",
    };
  }

  await prisma.productReview.create({
    data: {
      productId: input.productId,
      userId: input.userId,
      rating: input.rating,
      body: input.body.trim(),
      verifiedBuyer: true,
      status: "PENDING",
    },
  });

  const { averageRating, reviewCount } = await refreshProductRating(
    input.productId,
  );

  return {
    ok: true,
    pending: true,
    averageRating,
    reviewCount,
  };
}

export async function listAdminReviews(input?: {
  status?: ReviewStatusValue | "all";
  q?: string;
}): Promise<AdminReviewRow[]> {
  const status = input?.status && input.status !== "all" ? input.status : undefined;
  const q = input?.q?.trim();

  const reviews = await prisma.productReview.findMany({
    where: {
      ...(status ? { status: status as ReviewStatus } : {}),
      ...(q
        ? {
            OR: [
              { body: { contains: q } },
              { customAuthorName: { contains: q } },
              { product: { title: { contains: q } } },
              { user: { is: { username: { contains: q } } } },
              { user: { is: { name: { contains: q } } } },
              { user: { is: { email: { contains: q } } } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: adminReviewInclude,
  });

  return reviews.map(toAdminRow);
}

export async function listProductBuyersForReview(
  productId: string,
): Promise<AdminReviewBuyerOption[] | null> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true },
  });
  if (!product) return null;

  const items = await prisma.orderItem.findMany({
    where: {
      duration: { productId },
      order: { status: { in: BUYER_STATUSES }, userId: { not: null } },
    },
    select: {
      order: {
        select: {
          user: {
            select: {
              id: true,
              username: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
  });

  const byId = new Map<
    string,
    { id: string; username: string; name: string; email: string }
  >();
  for (const item of items) {
    const user = item.order.user;
    if (user) byId.set(user.id, user);
  }

  const buyers = [...byId.values()];
  if (buyers.length === 0) return [];

  const existing = await prisma.productReview.findMany({
    where: {
      productId,
      userId: { in: buyers.map((b) => b.id) },
    },
    select: { userId: true },
  });
  const reviewed = new Set(existing.map((r) => r.userId));

  return buyers
    .map((b) => ({
      ...b,
      alreadyReviewed: reviewed.has(b.id),
    }))
    .sort((a, b) => a.username.localeCompare(b.username));
}

export async function adminCreateReview(input: {
  productId: string;
  userId?: string | null;
  customAuthorName?: string | null;
  customAvatarUrl?: string | null;
  verifiedBuyer?: boolean;
  rating: number;
  body: string;
}): Promise<
  | { ok: true; review: AdminReviewRow }
  | { ok: false; code: string; message: string }
> {
  const product = await prisma.product.findUnique({
    where: { id: input.productId },
    select: { id: true },
  });
  if (!product) {
    return { ok: false, code: "NOT_FOUND", message: "Product not found." };
  }

  let finalUserId: string | null = null;
  let customAuthorName: string | null = null;
  let customAvatarUrl: string | null = null;
  let verifiedBuyer = input.verifiedBuyer ?? true;

  if (input.userId) {
    const user = await prisma.user.findUnique({
      where: { id: input.userId },
      select: { id: true },
    });
    if (!user) {
      return { ok: false, code: "NOT_FOUND", message: "User not found." };
    }
    finalUserId = input.userId;
    const existing = await prisma.productReview.findFirst({
      where: {
        productId: input.productId,
        userId: input.userId,
      },
      select: { id: true },
    });
    if (existing) {
      return {
        ok: false,
        code: "CONFLICT",
        message: "That user already has a review for this product.",
      };
    }
  } else {
    customAuthorName = input.customAuthorName?.trim() || "Verified Customer";
    customAvatarUrl = input.customAvatarUrl?.trim() || null;
  }

  const created = await prisma.productReview.create({
    data: {
      productId: input.productId,
      userId: finalUserId,
      customAuthorName,
      customAvatarUrl,
      rating: input.rating,
      body: input.body.trim(),
      verifiedBuyer,
      status: "APPROVED",
    },
    include: adminReviewInclude,
  });

  await refreshProductRating(input.productId);

  return { ok: true, review: toAdminRow(created) };
}

export async function adminUpdateReview(
  id: string,
  input: {
    rating?: number;
    body?: string;
    status?: ReviewStatusValue;
  },
): Promise<
  | { ok: true; review: AdminReviewRow }
  | { ok: false; code: string; message: string }
> {
  const existing = await prisma.productReview.findUnique({
    where: { id },
    select: { id: true, productId: true },
  });
  if (!existing) {
    return { ok: false, code: "NOT_FOUND", message: "Review not found." };
  }

  const data: Prisma.ProductReviewUpdateInput = {};
  if (input.rating !== undefined) data.rating = input.rating;
  if (input.body !== undefined) data.body = input.body.trim();
  if (input.status !== undefined) data.status = input.status as ReviewStatus;

  const updated = await prisma.productReview.update({
    where: { id },
    data,
    include: adminReviewInclude,
  });

  await refreshProductRating(existing.productId);

  return { ok: true, review: toAdminRow(updated) };
}

export async function adminDeleteReview(
  id: string,
): Promise<
  | { ok: true }
  | { ok: false; code: string; message: string }
> {
  const existing = await prisma.productReview.findUnique({
    where: { id },
    select: { id: true, productId: true },
  });
  if (!existing) {
    return { ok: false, code: "NOT_FOUND", message: "Review not found." };
  }

  await prisma.productReview.delete({ where: { id } });
  await refreshProductRating(existing.productId);
  return { ok: true };
}
