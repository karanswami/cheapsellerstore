import { jsonError, jsonOk } from "@/lib/api";
import { getSessionUserId } from "@/lib/auth/customer";
import { maintenanceApiBlock } from "@/lib/maintenance";
import { purchasePremium } from "@/lib/premium";

export async function POST() {
  const maint = await maintenanceApiBlock();
  if (maint) return maint;

  const userId = await getSessionUserId();
  if (!userId) {
    return jsonError("UNAUTHORIZED", "Sign in to unlock Premium.", 401);
  }

  try {
    const user = await purchasePremium(userId);
    return jsonOk({ user });
  } catch (err) {
    const code = err instanceof Error ? err.message : "INTERNAL_ERROR";
    if (code === "ALREADY_PREMIUM") {
      return jsonError("ALREADY_PREMIUM", "You already have Premium.", 409);
    }
    if (code === "INSUFFICIENT_BALANCE") {
      return jsonError(
        "INSUFFICIENT_BALANCE",
        "Not enough wallet balance. Deposit and try again.",
        402,
      );
    }
    if (code === "INVALID_PRICE") {
      return jsonError(
        "INVALID_PRICE",
        "Premium is not available right now.",
        503,
      );
    }
    if (code === "USER_NOT_FOUND") {
      return jsonError("NOT_FOUND", "Account not found.", 404);
    }
    console.error("[premium/purchase]", err);
    return jsonError("INTERNAL_ERROR", "Could not unlock Premium.", 500);
  }
}
