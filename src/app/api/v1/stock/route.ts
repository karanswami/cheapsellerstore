import { getApiStock } from "@/lib/seller-api/catalog";
import { withPublicApi } from "@/lib/seller-api/handler";
import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  return withPublicApi(req, async (ctx) => {
    const sku =
      req.nextUrl.searchParams.get("sku")?.trim() ||
      req.nextUrl.searchParams.get("duration")?.trim() ||
      "";
    if (!sku) {
      return {
        error: {
          code: "UNKNOWN_DURATION",
          message:
            "Query param sku is required (items[].apiCode from GET /api/v1/products). Alias: duration.",
          status: 400,
        },
      };
    }

    if (ctx.auth?.isSandbox) {
      return {
        data: {
          apiCode: "SANDBOX-DEMO-30D",
          stock: 999,
          inStock: true,
          busy: false,
          sandbox: true,
        },
      };
    }

    const stock = await getApiStock(sku);
    if (!stock.ok) {
      return {
        error: {
          code: stock.code,
          message: stock.message,
          status: stock.code === "DURATION_REQUIRED" ? 400 : 404,
        },
      };
    }
    return { data: stock.data };
  });
}
