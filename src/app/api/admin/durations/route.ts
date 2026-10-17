import { jsonError, jsonOk } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/admin";
import { nextCatalogNumber } from "@/lib/catalog-numbers";
import { prisma } from "@/lib/prisma";
import { Currency, usdToMicrocents } from "@/lib/currencies";
import { z } from "zod";

const priceRow = z.object({
  currency: z.literal("USD").default("USD"),
  price: z.number().positive(),
  resellerPrice: z.number().min(0).optional(),
  buyPrice: z.number().min(0).optional(),
});

const schema = z.object({
  productId: z.string().min(1),
  label: z.string().trim().min(1).max(80),
  days: z.number().int().positive().nullable().optional(),
  hours: z.number().int().positive().nullable().optional(),
  requiresAndroidId: z.boolean().optional().default(false),
  deviceIdName: z.string().trim().max(80).optional().default(""),
  /** Admin sends USD decimals; stored as microcents. */
  prices: z.array(priceRow).min(1),
});

export async function POST(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return jsonError("UNAUTHORIZED", "Admin required.", 401);
  }
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError("VALIDATION", "Invalid duration.", 400);

  const product = await prisma.product.findUnique({
    where: { id: parsed.data.productId },
    select: { id: true },
  });
  if (!product) return jsonError("NOT_FOUND", "Product not found.", 404);

  const labelClash = await prisma.duration.findFirst({
    where: { productId: parsed.data.productId, label: parsed.data.label },
  });
  if (labelClash) {
    return jsonError("CONFLICT", "This product already has a duration with that label.", 409);
  }

  const row = parsed.data.prices[0]!;
  try {
    const duration = await prisma.duration.create({
      data: {
        productId: parsed.data.productId,
        number: await nextCatalogNumber("duration"),
        label: parsed.data.label,
        days: parsed.data.days ?? null,
        hours: parsed.data.hours ?? null,
        requiresAndroidId: parsed.data.requiresAndroidId,
        deviceIdName: parsed.data.deviceIdName ?? "",
        prices: {
          create: {
            currency: Currency.USD,
            price: usdToMicrocents(row.price),
            resellerPrice: usdToMicrocents(row.resellerPrice ?? 0),
            buyPrice: usdToMicrocents(row.buyPrice ?? 0),
          },
        },
      },
      include: { prices: true, _count: { select: { keys: true } } },
    });
    return jsonOk(duration);
  } catch {
    return jsonError("CONFLICT", "This product already has a duration with that label.", 409);
  }
}
