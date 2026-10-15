import { getApiPricing, sandboxSkus } from "@/lib/seller-api/catalog";
import { withPublicApi } from "@/lib/seller-api/handler";
import {
  calcApiPurchaseFee,
  getApiPurchaseFeePercent,
} from "@/lib/seller-api/settings";
import { microcentsToUsdString } from "@/lib/currencies";
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
            "Query param sku is required (items[].apiCode from GET /api/v1/products). Alias: duration.",
          status: 400,
        },
      };
    }

    const feePercent =
      ctx.auth?.purchaseFeePercent ?? (await getApiPurchaseFeePercent());
    const role = ctx.auth?.user.role as UserRole | undefined;

    if (ctx.auth?.isSandbox) {
      const items = await sandboxSkus(role, ctx.auth?.user.id);
      const matched =
        items.find((i) => i.apiCode.toLowerCase() === sku.toLowerCase()) ||
        items[0]!;
      const fee = calcApiPurchaseFee(matched.price, feePercent);
      return {
        data: {
          apiCode: matched.apiCode,
          name: matched.name,
          product: matched.product,
          productApiCode: matched.productApiCode,
          label: matched.label,
          price: matched.price,
          priceUsd: matched.priceUsd,
          feePercent,
          fee,
          feeUsd: microcentsToUsdString(fee),
          total: matched.price + fee,
          totalUsd: microcentsToUsdString(matched.price + fee),
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
      feePercent,
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
