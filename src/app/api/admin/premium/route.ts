import { jsonError, jsonOk } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/admin";
import { listAdminPremiumUsers } from "@/lib/premium";

export async function GET(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return jsonError("UNAUTHORIZED", "Admin required.", 401);
  }

  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get("page") ?? "1") || 1;
  const limit = Number(searchParams.get("limit") ?? "20") || 20;
  const q = searchParams.get("q") ?? "";
  const rawFilter = searchParams.get("filter") ?? "premium";
  const filter =
    rawFilter === "all" || rawFilter === "non_premium" || rawFilter === "premium"
      ? rawFilter
      : "premium";

  try {
    const data = await listAdminPremiumUsers({ page, limit, q, filter });
    return jsonOk(data);
  } catch (err) {
    console.error("[admin/premium]", err);
    return jsonError("INTERNAL_ERROR", "Could not load Premium users.", 500);
  }
}
