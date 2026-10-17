import { jsonError, jsonOk } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/prisma";
import { Currency, usdToMicrocents } from "@/lib/currencies";
import { KeyStatus } from "@prisma/client";
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
  days: z.number().int().positive().nullable().optional(),
  hours: z.number().int().positive().nullable().optional(),
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

  if (parsed.data.label !== undefined && parsed.data.label !== existing.label) {
    const clash = await prisma.duration.findFirst({
      where: { productId: existing.productId, label: parsed.data.label, NOT: { id } },
    });
    if (clash) {
      return jsonError("CONFLICT", "This product already has a duration with that label.", 409);
    }
  }

  if (
    parsed.data.label !== undefined ||
    parsed.data.days !== undefined ||
    parsed.data.hours !== undefined ||
    parsed.data.requiresAndroidId !== undefined ||
    parsed.data.deviceIdName !== undefined
  ) {
    try {
      await prisma.duration.update({
        where: { id },
        data: {
          ...(parsed.data.label !== undefined ? { label: parsed.data.label } : {}),
          ...(parsed.data.days !== undefined ? { days: parsed.data.days } : {}),
          ...(parsed.data.hours !== undefined ? { hours: parsed.data.hours } : {}),
          ...(parsed.data.requiresAndroidId !== undefined
            ? { requiresAndroidId: parsed.data.requiresAndroidId }
            : {}),
          ...(parsed.data.deviceIdName !== undefined
            ? { deviceIdName: parsed.data.deviceIdName }
            : {}),
        },
      });
    } catch {
      return jsonError("CONFLICT", "This product already has a duration with that label.", 409);
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

  // Safe delete: never remove a duration that has purchase history.
  const [soldKeys, orderItems] = await Promise.all([
    prisma.key.count({ where: { durationId: id, status: KeyStatus.SOLD } }),
    prisma.orderItem.count({ where: { durationId: id } }),
  ]);
  if (soldKeys > 0 || orderItems > 0) {
    return jsonError(
      "CONFLICT",
      "This duration has purchase history and cannot be deleted. Hide the whole product instead.",
      409,
    );
  }

  const purged = await prisma.key.deleteMany({ where: { durationId: id } });
  await prisma.$transaction([
    prisma.userSpecialPrice.deleteMany({ where: { durationId: id } }),
    prisma.durationPrice.deleteMany({ where: { durationId: id } }),
    prisma.duration.delete({ where: { id } }),
  ]);
  return jsonOk({ ok: true, purgedKeys: purged.count });
}
