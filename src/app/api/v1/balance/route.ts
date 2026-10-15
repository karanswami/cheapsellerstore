import { withSellerApi } from "@/lib/seller-api/handler";
import { getWalletBalance } from "@/lib/wallet";
import { microcentsToUsdString } from "@/lib/currencies";
import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  return withSellerApi(req, "balance:read", async (ctx) => {
    const balance = await getWalletBalance(ctx.user.id);
    return {
      data: {
        balance,
        balanceUsd: microcentsToUsdString(balance),
        currency: "USD",
        // Soft-compat
        balanceMicrocents: balance,
      },
    };
  });
}
