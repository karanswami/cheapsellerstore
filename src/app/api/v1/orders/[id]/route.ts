import { withSellerApi } from "@/lib/seller-api/handler";
import { getApiOrderForUser } from "@/lib/seller-api/orders";
import type { NextRequest } from "next/server";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctxRoute: Ctx) {
  const { id } = await ctxRoute.params;
  return withSellerApi(req, "orders:read", async (ctx) => {
    if (ctx.isSandbox) {
      return {
        error: {
          code: "NOT_FOUND",
          message: "Sandbox orders are not persisted.",
          status: 404,
        },
      };
    }
    const order = await getApiOrderForUser(ctx.user.id, id);
    if (!order) {
      return {
        error: { code: "NOT_FOUND", message: "Order not found.", status: 404 },
      };
    }
    return { data: order };
  });
}
