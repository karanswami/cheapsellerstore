import { jsonError, jsonOk } from "@/lib/api";
import { getOrderByAccessToken } from "@/lib/orders";
import type { NextRequest } from "next/server";

export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/orders/[orderId]">,
) {
  const { orderId } = await context.params;
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return jsonError("UNAUTHORIZED", "Missing token.", 401);
  }

  const order = await getOrderByAccessToken(orderId, token);
  if (!order) {
    return jsonError("NOT_FOUND", "Order not found.", 404);
  }

  return jsonOk({
    id: order.id,
    status: order.status,
    total: order.total,
    currency: order.currency,
    buyerEmail: order.buyerEmail,
    createdAt: order.createdAt.toISOString(),
    items: order.items.map((item) => ({
      id: item.id,
      productTitle: item.productTitle,
      durationLabel: item.durationLabel,
      unitPrice: item.unitPrice,
      keyCode: item.key?.code ?? null,
    })),
  });
}
