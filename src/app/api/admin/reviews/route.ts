import { jsonError, jsonOk } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/admin";
import {
  adminCreateReview,
  listAdminReviews,
  listProductBuyersForReview,
} from "@/lib/reviews";
import { productReviewSchema } from "@/lib/validations";
import { z } from "zod";

const listSchema = z.object({
  status: z.enum(["all", "PENDING", "APPROVED", "DISABLED"]).optional(),
  q: z.string().trim().max(120).optional(),
});

const createSchema = productReviewSchema.extend({
  productId: z.string().min(1),
  userId: z.string().optional().nullable(),
  customAuthorName: z.string().trim().max(80).optional().nullable(),
  customAvatarUrl: z.string().trim().optional().nullable(),
  verifiedBuyer: z.boolean().optional(),
});

export async function GET(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return jsonError("UNAUTHORIZED", "Admin required.", 401);
  }

  const url = new URL(request.url);
  const productId = url.searchParams.get("productId")?.trim();

  if (productId) {
    if (!/^[a-f0-9]{24}$/i.test(productId)) {
      return jsonError("VALIDATION", "Invalid product id.", 400);
    }
    const buyers = await listProductBuyersForReview(productId);
    if (!buyers) {
      return jsonError("NOT_FOUND", "Product not found.", 404);
    }
    return jsonOk({ buyers });
  }

  const parsed = listSchema.safeParse({
    status: url.searchParams.get("status") ?? undefined,
    q: url.searchParams.get("q") ?? undefined,
  });
  if (!parsed.success) {
    return jsonError("VALIDATION", "Invalid query.", 400);
  }

  const reviews = await listAdminReviews(parsed.data);
  return jsonOk({ reviews });
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return jsonError("UNAUTHORIZED", "Admin required.", 401);
  }

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      "VALIDATION",
      parsed.error.issues[0]?.message ?? "Invalid review.",
      400,
    );
  }

  const result = await adminCreateReview(parsed.data);
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

  return jsonOk({ review: result.review });
}
