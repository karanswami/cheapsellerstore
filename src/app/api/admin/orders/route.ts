import { jsonError, jsonOk } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/admin";
import {
  listAdminOrders,
  parseAdminOrderAudience,
  parseAdminOrderStatus,
} from "@/lib/orders";

export async function GET(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return jsonError("UNAUTHORIZED", "Admin required.", 401);
  }

  const url = new URL(req.url);
  const page = Number(url.searchParams.get("page") ?? "1");
  const limit = Number(url.searchParams.get("limit") ?? "15");
  const q = url.searchParams.get("q")?.trim() ?? "";
  const status = parseAdminOrderStatus(url.searchParams.get("status"));
  const audience = parseAdminOrderAudience(url.searchParams.get("audience"));

  const data = await listAdminOrders({
    page: Number.isFinite(page) ? page : 1,
    limit: Number.isFinite(limit) ? limit : 15,
    q: q || undefined,
    status,
    audience,
  });

  return jsonOk(data);
}
