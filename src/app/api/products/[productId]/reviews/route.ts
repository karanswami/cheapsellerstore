import { jsonError, jsonOk } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth/customer";
import { createProductReview, getProductReviews } from "@/lib/reviews";
import { productReviewSchema } from "@/lib/validations";
import type { ReviewSort } from "@/types/review";
import type { NextRequest } from "next/server";

type RouteContext = { params: Promise<{ productId: string }> };

const SORTS = new Set<ReviewSort>(["newest", "highest", "lowest"]);

function parseSort(raw: string | null): ReviewSort {
  if (raw && SORTS.has(raw as ReviewSort)) return raw as ReviewSort;
  return "newest";
}

function parsePositiveInt(raw: string | null, fallback: number) {
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : fallback;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { productId } = await context.params;
  const user = await getCurrentUser();
  const { searchParams } = request.nextUrl;
  const payload = await getProductReviews(productId, user?.id ?? null, {
    page: parsePositiveInt(searchParams.get("page"), 1),
    limit: parsePositiveInt(searchParams.get("limit"), 10),
    sort: parseSort(searchParams.get("sort")),
  });
  if (!payload) {
    return jsonError("NOT_FOUND", "Product not found.", 404);
  }
  return jsonOk(payload);
}

export async function POST(request: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return jsonError("UNAUTHORIZED", "Sign in to leave a review.", 401);
  }

  const { productId } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = productReviewSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      "VALIDATION",
      parsed.error.issues[0]?.message ?? "Invalid review.",
      400,
    );
  }

  const result = await createProductReview({
    productId,
    userId: user.id,
    rating: parsed.data.rating,
    body: parsed.data.body,
  });

  if (!result.ok) {
    const status =
      result.code === "NOT_FOUND"
        ? 404
        : result.code === "FORBIDDEN"
          ? 403
          : result.code === "CONFLICT"
            ? 409
            : 400;
    return jsonError(result.code, result.message, status);
  }

  return jsonOk({
    pending: true,
    averageRating: result.averageRating,
    reviewCount: result.reviewCount,
  });
}
