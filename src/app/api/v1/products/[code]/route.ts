import {
  API_MONEY_HINT,
  getApiProduct,
  resolvePriceTier,
  sandboxCatalogProduct,
} from "@/lib/seller-api/catalog";
import { normalizeApiCode } from "@/lib/seller-api/codes";
import { withPublicApi } from "@/lib/seller-api/handler";
import type { UserRole } from "@prisma/client";
import type { NextRequest } from "next/server";

type Ctx = { params: Promise<{ code: string }> };

export async function GET(req: NextRequest, ctxRoute: Ctx) {
  const { code } = await ctxRoute.params;
  return withPublicApi(req, async (ctx) => {
    const role = ctx.auth?.user.role as UserRole | undefined;

    if (ctx.auth?.isSandbox) {
      const sandbox = await sandboxCatalogProduct(code, role, ctx.auth?.user.id);
      return {
        data: {
          ...sandbox,
          money: API_MONEY_HINT,
          priceTier: resolvePriceTier(role, null),
          sandbox: true,
        },
      };
    }

    const product = await getApiProduct(code, role, ctx.auth?.user.id);
    if (!product) {
      return {
        error: {
          code: "NOT_FOUND",
          message:
            "Not found. Use a product apiCode or SKU from GET /api/v1/products.",
          status: 404,
        },
      };
    }
    return {
      data: {
        ...product,
        money: API_MONEY_HINT,
        priceTier: resolvePriceTier(role, null),
      },
    };
  });
}
