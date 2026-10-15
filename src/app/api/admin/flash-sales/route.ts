import { jsonError, jsonOk } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/admin";
import {
  notifyFlashSaleAudience,
  parseFlashExpiresAt,
  parseFlashStartsAt,
} from "@/lib/flash-sales";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z
  .object({
    title: z.string().trim().min(1).max(120),
    discountPercent: z.number().min(1).max(100),
    scope: z.enum(["GLOBAL", "PRODUCT", "DURATION"]).default("GLOBAL"),
    targetRole: z.enum(["ALL", "USER", "SELLER"]).default("ALL"),
    productId: z.string().optional().nullable(),
    durationId: z.string().optional().nullable(),
    active: z.boolean().default(true),
    showBanner: z.boolean().default(true),
    bannerDescription: z.string().trim().max(240).optional().nullable(),
    displayPromoCode: z.string().trim().max(64).optional().nullable(),
    startsAt: z.string().optional().nullable(),
    expiresAt: z.string().optional().nullable(),
    sendNotification: z.boolean().optional().default(false),
  })
  .superRefine((data, ctx) => {
    if (data.scope === "PRODUCT" && !data.productId) {
      ctx.addIssue({
        code: "custom",
        message: "Select a product for product-scoped flash sales.",
        path: ["productId"],
      });
    }
    if (data.scope === "DURATION" && !data.durationId) {
      ctx.addIssue({
        code: "custom",
        message: "Select a duration for duration-scoped flash sales.",
        path: ["durationId"],
      });
    }
  });

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return jsonError("UNAUTHORIZED", "Admin required.", 401);
  }
  const sales = await prisma.flashSale.findMany({
    orderBy: { createdAt: "desc" },
  });
  return jsonOk({ sales });
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
  const d = parsed.data;
  const sale = await prisma.flashSale.create({
    data: {
      title: d.title,
      discountPercent: d.discountPercent,
      scope: d.scope,
      targetRole: d.targetRole,
      productId: d.scope === "PRODUCT" ? (d.productId ?? null) : null,
      durationId: d.scope === "DURATION" ? (d.durationId ?? null) : null,
      active: d.active,
      showBanner: d.showBanner,
      bannerDescription: d.bannerDescription?.trim() || null,
      displayPromoCode: d.displayPromoCode?.trim().toUpperCase() || null,
      startsAt: parseFlashStartsAt(d.startsAt),
      expiresAt: parseFlashExpiresAt(d.expiresAt),
    },
  });

  let notified = 0;
  if (d.sendNotification && sale.active) {
    notified = await notifyFlashSaleAudience({
      title: sale.title,
      discountPercent: sale.discountPercent,
      targetRole: sale.targetRole,
      scope: sale.scope,
    });
  }

  return jsonOk({ sale, notified });
}
