import { getApiPricing, sandboxSkus } from "@/lib/seller-api/catalog";
import { withPublicApi } from "@/lib/seller-api/handler";
import type { UserRole } from "@prisma/client";
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
            "Query param sku is required (items[].sku from GET /api/v1/products). Alias: duration.",
          status: 400,
        },
      };
    }

    const role = ctx.auth?.user.role as UserRole | undefined;

    if (ctx.auth?.isSandbox) {
      const items = await sandboxSkus(role, ctx.auth?.user.id);
      const matched =
        items.find((i) => String(i.sku) === sku) ||
        items[0]!;
      return {
        data: {
          sku: matched.sku,
          name: matched.name,
          product: matched.product,
          productNumber: matched.productNumber,
          label: matched.label,
          price: matched.price,
          priceUsd: matched.priceUsd,
          currency: "USD",
          stock: matched.stock,
          inStock: matched.inStock,
          priceTier: matched.priceTier,
          money: { unit: "USD_MICROCENTS", perUsd: 100_000_000 },
          sandbox: true,
        },
      };
    }

    const pricing = await getApiPricing(
      sku,
      role,
      ctx.auth?.user.id,
    );
    if (!pricing.ok) {
      return {
        error: {
          code: pricing.code,
          message: pricing.message,
          status: pricing.code === "DURATION_REQUIRED" ? 400 : 404,
        },
      };
    }
    return { data: pricing.data };
  });
}
