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

const createSchema = z
  .object({
    code: z.string().trim().min(1).max(64),
    description: z.string().trim().max(200).optional().nullable(),
    discountPercent: z.number().min(0).max(100).default(0),
    /** Flat off in USD dollars; stored as microcents. */
    discountAmount: z.number().min(0).default(0),
    scope: z.enum(["GLOBAL", "PRODUCT", "DURATION"]).default("GLOBAL"),
    targetRole: z.enum(["ALL", "USER", "SELLER"]).default("ALL"),
    productId: z.string().optional().nullable(),
    durationId: z.string().optional().nullable(),
    maxRedemptions: z.number().int().positive().optional().nullable(),
    perUserLimit: z.number().int().positive().default(1),
    active: z.boolean().default(true),
    showBanner: z.boolean().default(false),
    startsAt: z.string().optional().nullable(),
    expiresAt: z.string().optional().nullable(),
    sendNotification: z.boolean().optional().default(false),
  })
  .superRefine((data, ctx) => {
    if (data.discountPercent <= 0 && data.discountAmount <= 0) {
      ctx.addIssue({
        code: "custom",
        message: "Set a percent or flat USD discount.",
        path: ["discountPercent"],
      });
    }
    if (data.scope === "PRODUCT" && !data.productId) {
      ctx.addIssue({
        code: "custom",
        message: "Select a product for product-scoped promos.",
        path: ["productId"],
      });
    }
    if (data.scope === "DURATION" && !data.durationId) {
      ctx.addIssue({
        code: "custom",
        message: "Select a duration for duration-scoped promos.",
        path: ["durationId"],
      });
    }
    const starts = parsePromoStartsAt(data.startsAt);
    const ends = parsePromoExpiresAt(data.expiresAt);
    if (starts && ends && starts > ends) {
      ctx.addIssue({
        code: "custom",
        message: "Start must be before end.",
        path: ["startsAt"],
      });
    }
  });

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return jsonError("UNAUTHORIZED", "Admin required.", 401);
  }
  const promos = await prisma.promoCode.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { redemptions: true } } },
  });
  return jsonOk({ promos });
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return jsonError("UNAUTHORIZED", "Admin required.", 401);
  }
  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      "VALIDATION",
      parsed.error.issues[0]?.message ?? "Invalid.",
      400,
    );
  }
  const data = parsed.data;
  const code = normalizePromoCode(data.code);
  const exists = await prisma.promoCode.findUnique({ where: { code } });
  if (exists) {
    return jsonError("CONFLICT", "Promo code already exists.", 409);
  }

  const promo = await prisma.promoCode.create({
    data: {
      code,
      description: data.description?.trim() || null,
      discountPercent: data.discountPercent,
      discountAmount: usdToMicrocents(data.discountAmount),
      scope: data.scope,
      targetRole: data.targetRole,
      productId: data.scope === "PRODUCT" ? (data.productId ?? null) : null,
      durationId: data.scope === "DURATION" ? (data.durationId ?? null) : null,
      maxRedemptions: data.maxRedemptions ?? null,
      perUserLimit: data.perUserLimit,
      active: data.active,
      showBanner: data.showBanner,
      startsAt: parsePromoStartsAt(data.startsAt),
      expiresAt: parsePromoExpiresAt(data.expiresAt),
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
