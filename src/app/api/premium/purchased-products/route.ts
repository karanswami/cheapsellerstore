import { jsonError, jsonOk } from "@/lib/api";
import { getSessionUserId } from "@/lib/auth/customer";
import { getPurchasedProductsForUser } from "@/lib/premium";
import { hasPremiumAccess } from "@/lib/premium-utils";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return jsonError("UNAUTHORIZED", "Sign in required.", 401);
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isPremium: true },
  });
  if (!user) {
    return jsonError("NOT_FOUND", "Account not found.", 404);
  }
  if (!hasPremiumAccess(user)) {
    return jsonError("FORBIDDEN", "Premium required.", 403);
  }

  try {
    const products = await getPurchasedProductsForUser(userId);
    return jsonOk({ products });
  } catch (err) {
    console.error("[premium/purchased-products]", err);
    return jsonError("INTERNAL_ERROR", "Could not load products.", 500);
  }
}
