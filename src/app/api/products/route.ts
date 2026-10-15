import { jsonError, jsonOk } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth/customer";
import { getProductsPage } from "@/lib/products";

/** Public catalog page — role-aware + special prices when logged in. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category") ?? undefined;
  const page = Number(searchParams.get("page") ?? "1");
  const limit = Number(searchParams.get("limit") ?? "12");

  if (!Number.isFinite(page) || page < 1) {
    return jsonError("VALIDATION_ERROR", "Invalid page.", 400);
  }
  if (!Number.isFinite(limit) || limit < 1 || limit > 48) {
    return jsonError("VALIDATION_ERROR", "Invalid limit.", 400);
  }

  const user = await getCurrentUser();
  const role = user?.role ?? "USER";

  try {
    const data = await getProductsPage({
      categorySlug: category || undefined,
      role,
      userId: user?.id,
      page,
      limit,
    });
    return jsonOk(data);
  } catch {
    return jsonError("INTERNAL_ERROR", "Could not load products.", 500);
  }
}
