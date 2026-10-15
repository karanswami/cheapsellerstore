import { jsonError, jsonOk } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth/customer";
import { getSpecialPricesForUser } from "@/lib/pricing";
import { calcCartPromoDiscount, lookupPromoDetailed } from "@/lib/promos";
import { z } from "zod";

const schema = z.object({
  code: z.string().trim().min(1),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        durationId: z.string().min(1),
        unitPrice: z.number().nonnegative().optional(),
        quantity: z.number().int().positive().default(1),
      }),
    )
    .optional(),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return jsonError("UNAUTHORIZED", "Login required to apply a promo.", 401);
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError("VALIDATION", "Code required.", 400);

  const rawItems = parsed.data.items ?? [];
  const specialPrices = await getSpecialPricesForUser(
    user.id,
    rawItems.map((i) => i.durationId),
  );
  // Special-priced durations are ineligible for promos.
  const items = rawItems.filter((i) => !specialPrices.has(i.durationId));

  if (rawItems.length > 0 && items.length === 0) {
    return jsonError(
      "SCOPE",
      "Promo codes do not apply to special-priced items.",
      400,
    );
  }

  const result = await lookupPromoDetailed(parsed.data.code, {
    role: user.role,
    userId: user.id,
    items: items.map((i) => ({
      productId: i.productId,
      durationId: i.durationId,
      quantity: i.quantity,
    })),
  });

  if (!result.ok) {
    const status =
      result.code === "NOT_FOUND" || result.code === "EXPIRED"
        ? 404
        : result.code === "AUDIENCE" || result.code === "USER_LIMIT"
          ? 403
          : 400;
    return jsonError(result.code, result.message, status);
  }

  const promo = result.promo;
  const discount =
    items.length > 0
      ? calcCartPromoDiscount(
          items.map((i) => ({
            productId: i.productId,
            durationId: i.durationId,
            unitPrice: i.unitPrice ?? 0,
            quantity: i.quantity,
          })),
          promo,
        )
      : 0;

  return jsonOk({
    promo: {
      code: promo.code,
      label: promo.label,
      percentOff: promo.percentOff,
      amountOff: promo.amountOff,
      promoCodeId: promo.promoCodeId,
      scope: promo.scope,
      productId: promo.productId,
      durationId: promo.durationId,
      maxUnits: promo.maxUnits,
    },
    discount,
  });
}
