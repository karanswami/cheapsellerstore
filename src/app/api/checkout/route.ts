import { jsonError, jsonOk } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth/customer";
import { maintenanceApiBlock } from "@/lib/maintenance";
import { createAndFulfillOrder } from "@/lib/orders";
import { checkoutSchema } from "@/lib/validations";

export async function POST(request: Request) {
  const maint = await maintenanceApiBlock();
  if (maint) return maint;

  const user = await getCurrentUser();
  if (!user) {
    return jsonError("UNAUTHORIZED", "Login required.", 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("INVALID_JSON", "Invalid request body.", 400);
  }

  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      "VALIDATION",
      parsed.error.issues[0]?.message ?? "Invalid cart.",
      400,
    );
  }

  try {
    const result = await createAndFulfillOrder({
      userId: user.id,
      buyerEmail: user.email,
      buyerDiscord: parsed.data.discord,
      currency: "USD",
      items: parsed.data.items,
      role: user.role,
      promoCode: parsed.data.promoCode,
    });

    if (!result.ok) {
      const status =
        result.code === "STOCK_UNAVAILABLE"
          ? 409
          : result.code === "INSUFFICIENT_BALANCE"
            ? 402
            : 400;
      return jsonError(result.code, result.message, status);
    }

    return jsonOk({
      orderId: result.orderId,
      accessToken: result.accessToken,
    });
  } catch (error) {
    console.error("[checkout] fatal order error:", error);
    try {
      const { reportDatabaseError } = await import("@/lib/system-alert");
      void reportDatabaseError("checkout_order_fulfill", error, {
        user: { id: user.id, email: user.email, role: user.role },
        metadata: { itemsCount: parsed.data.items.length },
      }).catch(() => undefined);
    } catch {
      // ignore alert delivery failures
    }
    return jsonError(
      "CHECKOUT_FAILED",
      "An unexpected database or processing error occurred. Please try again.",
      500,
    );
  }
}
