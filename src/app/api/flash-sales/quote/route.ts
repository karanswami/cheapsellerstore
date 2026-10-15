import { jsonError, jsonOk } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth/customer";
import {
  applyFlashPercent,
  listActiveFlashSales,
  pickFlashSale,
  toPublicFlashSale,
} from "@/lib/flash-sales";
import { getSpecialPricesForUser, resolveUnitPrice } from "@/lib/pricing";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  items: z
    .array(
      z.object({
        durationId: z.string().min(1),
        quantity: z.number().int().positive().optional(),
      }),
    )
    .min(1)
    .max(50),
});

/** Quote flash-adjusted unit prices for cart lines (role-aware + special prices). */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  const role = user?.role ?? "USER";

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return jsonError("VALIDATION", "Invalid cart lines.", 400);
  }

  const durationIds = [...new Set(parsed.data.items.map((i) => i.durationId))];
  const [durations, sales, specialPrices] = await Promise.all([
    prisma.duration.findMany({
      where: { id: { in: durationIds } },
      include: {
        product: { select: { id: true, title: true } },
        prices: {
          where: { currency: "USD" },
          take: 1,
          select: { price: true, resellerPrice: true },
        },
      },
    }),
    listActiveFlashSales(),
    getSpecialPricesForUser(user?.id, durationIds),
  ]);

  const byId = new Map(durations.map((d) => [d.id, d]));

  const lines = parsed.data.items.map((item) => {
    const duration = byId.get(item.durationId);
    if (!duration) {
      return {
        durationId: item.durationId,
        found: false as const,
      };
    }
    const priceRow = duration.prices[0];
    const special = specialPrices.get(duration.id);
    const isSpecial = special != null;
    const listPrice = priceRow
      ? resolveUnitPrice({ role, priceRow, specialPrice: special })
      : null;
    const flash =
      isSpecial || listPrice == null
        ? null
        : pickFlashSale(sales, {
            role,
            productId: duration.productId,
            durationId: duration.id,
          });
    const unitPrice =
      listPrice != null && flash
        ? applyFlashPercent(listPrice, flash.discountPercent)
        : listPrice;

    return {
      durationId: item.durationId,
      found: true as const,
      productId: duration.productId,
      title: duration.product.title,
      durationLabel: duration.label,
      listPrice,
      unitPrice,
      flashSale: flash ? toPublicFlashSale(flash) : null,
      specialPrice: isSpecial,
    };
  });

  return jsonOk({ lines, role });
}
