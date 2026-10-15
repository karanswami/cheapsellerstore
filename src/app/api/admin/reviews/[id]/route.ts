import { jsonError, jsonOk } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/admin";
import { adminDeleteReview, adminUpdateReview } from "@/lib/reviews";
import { productReviewSchema } from "@/lib/validations";
import { z } from "zod";

const patchSchema = z
  .object({
    rating: productReviewSchema.shape.rating.optional(),
    body: productReviewSchema.shape.body.optional(),
    status: z.enum(["PENDING", "APPROVED", "DISABLED"]).optional(),
  })
  .refine(
    (v) =>
      v.rating !== undefined || v.body !== undefined || v.status !== undefined,
    { message: "Nothing to update." },
  );

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    await requireAdmin();
  } catch {
    return jsonError("UNAUTHORIZED", "Admin required.", 401);
  }

  const { id } = await params;
  if (!/^[a-f0-9]{24}$/i.test(id)) {
    return jsonError("VALIDATION", "Invalid review id.", 400);
  }

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      "VALIDATION",
      parsed.error.issues[0]?.message ?? "Invalid payload.",
      400,
    );
  }

  const result = await adminUpdateReview(id, parsed.data);
  if (!result.ok) {
    return jsonError(
      result.code,
      result.message,
      result.code === "NOT_FOUND" ? 404 : 400,
    );
  }

  return jsonOk({ review: result.review });
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    await requireAdmin();
  } catch {
    return jsonError("UNAUTHORIZED", "Admin required.", 401);
  }

  const { id } = await params;
  if (!/^[a-f0-9]{24}$/i.test(id)) {
    return jsonError("VALIDATION", "Invalid review id.", 400);
  }

  const result = await adminDeleteReview(id);
  if (!result.ok) {
    return jsonError(
      result.code,
      result.message,
      result.code === "NOT_FOUND" ? 404 : 400,
    );
  }

  return jsonOk({ ok: true });
}
