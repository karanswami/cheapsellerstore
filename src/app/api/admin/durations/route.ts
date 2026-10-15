import { jsonError, jsonOk } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/prisma";
import { Currency, usdToMicrocents } from "@/lib/currencies";
import { allocateDurationApiCode } from "@/lib/seller-api/ensure-api-code";
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
  /** Optional version group (Lite / Brutal). Empty = no storefront version step. */
  version: z.string().trim().max(40).optional().default(""),
  days: z.number().int().positive().nullable().optional(),
  apiCode: z.string().trim().max(64).optional().nullable(),
  supplierProductId: z.number().int().positive().nullable().optional(),
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
    select: { id: true, apiCode: true, title: true },
  });
  if (!product) return jsonError("NOT_FOUND", "Product not found.", 404);

  const version = parsed.data.version ?? "";
  const labelClash = await prisma.duration.findFirst({
    where: {
      productId: parsed.data.productId,
      version,
      label: parsed.data.label,
    },
  });
  if (labelClash) {
    return jsonError(
      "CONFLICT",
      "Duration label must be unique for this version on the product.",
      409,
    );
  }

  const productCode = product.apiCode ?? product.title;
  const apiCode = await allocateDurationApiCode({
    productApiCode: productCode,
    label: parsed.data.label,
    days: parsed.data.days,
    preferred: parsed.data.apiCode,
  });

  const row = parsed.data.prices[0]!;
  try {
    const duration = await prisma.duration.create({
      data: {
        productId: parsed.data.productId,
        label: parsed.data.label,
        version,
        days: parsed.data.days ?? null,
        apiCode,
        supplierProductId: parsed.data.supplierProductId ?? null,
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
    return jsonError(
      "CONFLICT",
      "Duration label must be unique for this version on the product.",
      409,
    );
  }
}
