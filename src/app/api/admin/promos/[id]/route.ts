import { jsonError, jsonOk } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/admin";
import { usdToMicrocents } from "@/lib/currencies";
import {
  normalizePromoCode,
  notifyPromoAudience,
  parsePromoExpiresAt,
  parsePromoStartsAt,
} from "@/lib/promos";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const patchSchema = z
  .object({
    code: z.string().trim().min(1).max(64).optional(),
    description: z.string().trim().max(200).optional().nullable(),
    discountPercent: z.number().min(0).max(100).optional(),
    /** Flat off in USD dollars; stored as microcents. */
    discountAmount: z.number().min(0).optional(),
    scope: z.enum(["GLOBAL", "PRODUCT", "DURATION"]).optional(),
    targetRole: z.enum(["ALL", "USER", "SELLER"]).optional(),
    productId: z.string().optional().nullable(),
    durationId: z.string().optional().nullable(),
    maxRedemptions: z.number().int().positive().optional().nullable(),
    perUserLimit: z.number().int().positive().optional(),
    active: z.boolean().optional(),
    showBanner: z.boolean().optional(),
    startsAt: z.string().optional().nullable(),
    expiresAt: z.string().optional().nullable(),
    sendNotification: z.boolean().optional().default(false),
  })
  .superRefine((data, ctx) => {
    if (
      data.discountPercent !== undefined &&
      data.discountAmount !== undefined &&
      data.discountPercent <= 0 &&
      data.discountAmount <= 0
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Set a percent or flat USD discount.",
        path: ["discountPercent"],
      });
    }
    if (data.scope === "PRODUCT" && data.productId === null) {
      ctx.addIssue({
        code: "custom",
        message: "Select a product for product-scoped promos.",
        path: ["productId"],
      });
    }
    if (data.scope === "DURATION" && data.durationId === null) {
      ctx.addIssue({
        code: "custom",
        message: "Select a duration for duration-scoped promos.",
        path: ["durationId"],
      });
    }
    if (data.startsAt !== undefined || data.expiresAt !== undefined) {
      const starts = parsePromoStartsAt(data.startsAt);
      const ends = parsePromoExpiresAt(data.expiresAt);
      if (starts && ends && starts > ends) {
        ctx.addIssue({
          code: "custom",
          message: "Start must be before end.",
          path: ["startsAt"],
        });
      }
    }
  });

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    await requireAdmin();
  } catch {
    return jsonError("UNAUTHORIZED", "Admin required.", 401);
  }
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      "VALIDATION",
      parsed.error.issues[0]?.message ?? "Invalid payload.",
      400,
    );
  }

  const existing = await prisma.promoCode.findUnique({ where: { id } });
  if (!existing) {
    return jsonError("NOT_FOUND", "Promo not found.", 404);
  }

  const data = parsed.data;
  if (data.code) {
    const code = normalizePromoCode(data.code);
    if (code !== existing.code) {
      const clash = await prisma.promoCode.findUnique({ where: { code } });
      if (clash) {
        return jsonError("CONFLICT", "Promo code already exists.", 409);
      }
    }
  }

  const scope = data.scope ?? existing.scope;
  const productId =
    data.productId !== undefined
      ? data.productId
      : existing.productId;
  const durationId =
    data.durationId !== undefined
      ? data.durationId
      : existing.durationId;

  if (scope === "PRODUCT" && !productId) {
    return jsonError("VALIDATION", "Select a product for product-scoped promos.", 400);
  }
  if (scope === "DURATION" && !durationId) {
    return jsonError(
      "VALIDATION",
      "Select a duration for duration-scoped promos.",
      400,
    );
  }

  const promo = await prisma.promoCode.update({
    where: { id },
    data: {
      ...(data.code ? { code: normalizePromoCode(data.code) } : {}),
      ...(data.description !== undefined
        ? { description: data.description?.trim() || null }
        : {}),
      ...(data.discountPercent !== undefined
        ? { discountPercent: data.discountPercent }
        : {}),
      ...(data.discountAmount !== undefined
        ? { discountAmount: usdToMicrocents(data.discountAmount) }
        : {}),
      scope,
      ...(data.targetRole !== undefined ? { targetRole: data.targetRole } : {}),
      productId: scope === "PRODUCT" ? productId : null,
      durationId: scope === "DURATION" ? durationId : null,
      ...(data.maxRedemptions !== undefined
        ? { maxRedemptions: data.maxRedemptions }
        : {}),
      ...(data.perUserLimit !== undefined
        ? { perUserLimit: data.perUserLimit }
        : {}),
      ...(data.active !== undefined ? { active: data.active } : {}),
      ...(data.showBanner !== undefined ? { showBanner: data.showBanner } : {}),
      ...(data.startsAt !== undefined
        ? { startsAt: parsePromoStartsAt(data.startsAt) }
        : {}),
      ...(data.expiresAt !== undefined
        ? { expiresAt: parsePromoExpiresAt(data.expiresAt) }
        : {}),
    },
  });

  let notified = 0;
  if (data.sendNotification && promo.active) {
    notified = await notifyPromoAudience({
      code: promo.code,
      description: promo.description,
      targetRole: promo.targetRole,
      discountPercent: promo.discountPercent,
      discountAmount: promo.discountAmount,
    });
  }

  return jsonOk({ promo, notified });
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    await requireAdmin();
  } catch {
    return jsonError("UNAUTHORIZED", "Admin required.", 401);
  }
  const { id } = await params;
  await prisma.promoRedemption.deleteMany({ where: { promoCodeId: id } });
  await prisma.promoCode.delete({ where: { id } });
  return jsonOk({ ok: true });
}
