import { jsonError, jsonOk } from "@/lib/api";
import { requireCustomer } from "@/lib/auth/customer";
import { getUserKeysPage } from "@/lib/orders";

export async function GET(request: Request) {
  try {
    const user = await requireCustomer();
    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get("page") ?? "1");
    const limit = Number(searchParams.get("limit") ?? "25");
    const q = searchParams.get("q") ?? undefined;

    if (!Number.isFinite(page) || page < 1) {
      return jsonError("VALIDATION_ERROR", "Invalid page.", 400);
    }
    if (!Number.isFinite(limit) || limit < 1 || limit > 100) {
      return jsonError("VALIDATION_ERROR", "Invalid limit.", 400);
    }

    const data = await getUserKeysPage(user.id, { page, limit, q });
    return jsonOk(data);
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return jsonError("UNAUTHORIZED", "Login required.", 401);
    }
    return jsonError("INTERNAL_ERROR", "Could not load keys.", 500);
  }
}
