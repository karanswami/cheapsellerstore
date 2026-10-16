import { withSellerApi } from "@/lib/seller-api/handler";
import { MICROCENTS_PER_USD } from "@/lib/currencies";
import { isWholesaleRole } from "@/lib/roles";
import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  return withSellerApi(req, undefined, async (ctx) => ({
    data: {
      username: ctx.user.username,
      role: ctx.user.role,
      priceTier: isWholesaleRole(ctx.user.role) ? "wholesale" : "retail",
      rateLimitRpm: ctx.rateLimitRpm,
      sandbox: ctx.isSandbox,
      money: {
        unit: "USD_MICROCENTS",
        perUsd: MICROCENTS_PER_USD,
      },
      key: {
        id: ctx.key.id,
        name: ctx.key.name,
        prefix: ctx.key.keyPrefix,
        mode: ctx.mode,
        scopes: ctx.key.scopes,
      },
    },
  }));
}
