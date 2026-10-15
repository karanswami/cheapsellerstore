import { jsonError, jsonOk } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/admin";
import { getAdminOrder } from "@/lib/orders";
import type { NextRequest } from "next/server";

export async function GET(
  _request: NextRequest,
  context: RouteContext<"/api/admin/orders/[id]">,
) {
  try {
    await requireAdmin();
  } catch {
    return jsonError("UNAUTHORIZED", "Admin required.", 401);
  }

  const { id } = await context.params;
  const order = await getAdminOrder(id);
  if (!order) return jsonError("NOT_FOUND", "Order not found.", 404);
  return jsonOk(order);
}
