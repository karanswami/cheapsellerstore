import { jsonError, jsonOk } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/prisma";
import { Currency, usdToMicrocents } from "@/lib/currencies";
import { allocateDurationApiCode } from "@/lib/seller-api/ensure-api-code";
import type { NextRequest } from "next/server";
import { z } from "zod";

const priceRow = z.object({
  currency: z.literal("USD").default("USD"),
  price: z.number().positive(),
  resellerPrice: z.number().min(0).optional(),
  buyPrice: z.number().min(0).optional(),
});

const schema = z.object({
  label: z.string().trim().min(1).max(80).optional(),
  /** Optional version group (Lite / Brutal). Empty string clears. */
  version: z.string().trim().max(40).optional(),
  days: z.number().int().positive().nullable().optional(),
  apiCode: z.string().trim().max(64).optional().nullable(),
  supplierProductId: z.number().int().positive().nullable().optional(),
  requiresAndroidId: z.boolean().optional(),
  deviceIdName: z.string().trim().max(80).optional(),
  /** Admin sends USD decimals; stored as microcents. */
  prices: z.array(priceRow).optional(),
});

export async function PATCH(
  request: NextRequest,
  context: RouteContext<"/api/admin/durations/[id]">,
) {
  try {
    await requireAdmin();
  } catch {
    return jsonError("UNAUTHORIZED", "Admin required.", 401);
  }
  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError("VALIDATION", "Invalid data.", 400);

  const existing = await prisma.duration.findUnique({ where: { id } });
  if (!existing) return jsonError("NOT_FOUND", "Duration not found.", 404);

  const nextLabel = parsed.data.label ?? existing.label;
  const nextVersion =
    parsed.data.version !== undefined ? parsed.data.version : existing.version;
  if (nextLabel !== existing.label || nextVersion !== existing.version) {
    const clash = await prisma.duration.findFirst({
      where: {
        productId: existing.productId,
        version: nextVersion,
        label: nextLabel,
        NOT: { id },
      },
    });
    if (clash) {
      return jsonError(
        "CONFLICT",
        "Duration label must be unique for this version on the product.",
        409,
      );
    }
  }

  let apiCode: string | undefined;
  if (
    parsed.data.apiCode !== undefined ||
    !existing.apiCode ||
    parsed.data.label !== undefined ||
    parsed.data.days !== undefined
  ) {
    const product = await prisma.product.findUnique({
      where: { id: existing.productId },
      select: { apiCode: true, title: true },
    });
    apiCode = await allocateDurationApiCode({
      productApiCode: product?.apiCode ?? product?.title ?? "PRODUCT",
      label: nextLabel,
      days:
        parsed.data.days !== undefined ? parsed.data.days : existing.days,
      preferred:
        parsed.data.apiCode !== undefined
          ? parsed.data.apiCode
          : existing.apiCode,
      excludeId: id,
    });
  }

  if (
    parsed.data.label !== undefined ||
    parsed.data.version !== undefined ||
    parsed.data.days !== undefined ||
    apiCode !== undefined ||
    parsed.data.supplierProductId !== undefined ||
    parsed.data.requiresAndroidId !== undefined ||
    parsed.data.deviceIdName !== undefined
  ) {
    try {
      await prisma.duration.update({
        where: { id },
        data: {
          ...(parsed.data.label !== undefined ? { label: parsed.data.label } : {}),
          ...(parsed.data.version !== undefined
            ? { version: parsed.data.version }
            : {}),
          ...(parsed.data.days !== undefined ? { days: parsed.data.days } : {}),
          ...(apiCode !== undefined ? { apiCode } : {}),
          ...(parsed.data.supplierProductId !== undefined
            ? { supplierProductId: parsed.data.supplierProductId }
            : {}),
          ...(parsed.data.requiresAndroidId !== undefined
            ? { requiresAndroidId: parsed.data.requiresAndroidId }
            : {}),
          ...(parsed.data.deviceIdName !== undefined
            ? { deviceIdName: parsed.data.deviceIdName }
            : {}),
        },
      });
    } catch {
      return jsonError(
        "CONFLICT",
        "Duration label must be unique for this version on the product.",
        409,
      );
    }
  }

  if (parsed.data.prices) {
    try {
      for (const row of parsed.data.prices) {
        await prisma.durationPrice.upsert({
          where: {
            durationId_currency: {
              durationId: id,
              currency: Currency.USD,
            },
          },
          create: {
            durationId: id,
            currency: Currency.USD,
            price: usdToMicrocents(row.price),
            resellerPrice: usdToMicrocents(row.resellerPrice ?? 0),
            buyPrice: usdToMicrocents(row.buyPrice ?? 0),
          },
          update: {
            price: usdToMicrocents(row.price),
            resellerPrice: usdToMicrocents(row.resellerPrice ?? 0),
            buyPrice: usdToMicrocents(row.buyPrice ?? 0),
          },
        });
      }
    } catch {
      return jsonError("INTERNAL", "Failed to save duration prices.", 500);
    }
  }

  const duration = await prisma.duration.findUnique({
    where: { id },
    include: { prices: true, _count: { select: { keys: true } } },
  });
  return jsonOk(duration);
}

export async function DELETE(
  _request: NextRequest,
  context: RouteContext<"/api/admin/durations/[id]">,
) {
  try {
    await requireAdmin();
  } catch {
    return jsonError("UNAUTHORIZED", "Admin required.", 401);
  }
  const { id } = await context.params;
  const existing = await prisma.duration.findUnique({ where: { id } });
  if (!existing) return jsonError("NOT_FOUND", "Duration not found.", 404);

  const keyCount = await prisma.key.count({ where: { durationId: id } });
  if (keyCount > 0) {
    return jsonError(
      "CONFLICT",
      "Cannot delete a duration that still has keys.",
      409,
    );
  }

  await prisma.$transaction([
    prisma.durationPrice.deleteMany({ where: { durationId: id } }),
    prisma.duration.delete({ where: { id } }),
  ]);
  return jsonOk({ ok: true });
}
