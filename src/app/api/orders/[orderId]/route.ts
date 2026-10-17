import { jsonError, jsonOk } from "@/lib/api";
import { getOrderByAccessToken } from "@/lib/orders";
import { clientIpFromHeaders, rateLimitAll, tooManyRequests } from "@/lib/rate-limit";
import type { NextRequest } from "next/server";

export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/orders/[orderId]">,
) {
  const { orderId } = await context.params;
  // Prefer the header (never lands in access logs / Referer); query kept for old share links.
  const token =
    request.headers.get("x-order-token")?.trim() || request.nextUrl.searchParams.get("token");
  const limited = await rateLimitAll([
    { key: `order-token:${clientIpFromHeaders(request.headers)}`, limit: 60, windowMs: 60_000 },
  ]);
  if (limited) return tooManyRequests(limited);
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
