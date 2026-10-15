import { jsonError, jsonOk } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/admin";
import {
  notifyFlashSaleAudience,
  parseFlashExpiresAt,
  parseFlashStartsAt,
} from "@/lib/flash-sales";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const patchSchema = z
  .object({
    title: z.string().trim().min(1).max(120).optional(),
    discountPercent: z.number().min(1).max(100).optional(),
    scope: z.enum(["GLOBAL", "PRODUCT", "DURATION"]).optional(),
    targetRole: z.enum(["ALL", "USER", "SELLER"]).optional(),
    productId: z.string().optional().nullable(),
    durationId: z.string().optional().nullable(),
    active: z.boolean().optional(),
    showBanner: z.boolean().optional(),
    bannerDescription: z.string().trim().max(240).optional().nullable(),
    displayPromoCode: z.string().trim().max(64).optional().nullable(),
    startsAt: z.string().optional().nullable(),
    expiresAt: z.string().optional().nullable(),
    sendNotification: z.boolean().optional().default(false),
  })
  .superRefine((data, ctx) => {
    if (data.scope === "PRODUCT" && data.productId === null) {
      ctx.addIssue({
        code: "custom",
        message: "Select a product for product-scoped flash sales.",
        path: ["productId"],
      });
    }
    if (data.scope === "DURATION" && data.durationId === null) {
      ctx.addIssue({
        code: "custom",
        message: "Select a duration for duration-scoped flash sales.",
        path: ["durationId"],
      });
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

  const existing = await prisma.flashSale.findUnique({ where: { id } });
  if (!existing) {
    return jsonError("NOT_FOUND", "Flash sale not found.", 404);
  }

  const data = parsed.data;
  const scope = data.scope ?? existing.scope;
  const productId =
    data.productId !== undefined ? data.productId : existing.productId;
  const durationId =
    data.durationId !== undefined ? data.durationId : existing.durationId;

  if (scope === "PRODUCT" && !productId) {
    return jsonError(
      "VALIDATION",
      "Select a product for product-scoped flash sales.",
      400,
    );
  }
  if (scope === "DURATION" && !durationId) {
    return jsonError(
      "VALIDATION",
      "Select a duration for duration-scoped flash sales.",
      400,
    );
  }

  const sale = await prisma.flashSale.update({
    where: { id },
    data: {
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.discountPercent !== undefined
        ? { discountPercent: data.discountPercent }
        : {}),
      scope,
      ...(data.targetRole !== undefined ? { targetRole: data.targetRole } : {}),
      productId: scope === "PRODUCT" ? productId : null,
      durationId: scope === "DURATION" ? durationId : null,
      ...(data.active !== undefined ? { active: data.active } : {}),
      ...(data.showBanner !== undefined ? { showBanner: data.showBanner } : {}),
      ...(data.bannerDescription !== undefined
        ? { bannerDescription: data.bannerDescription?.trim() || null }
        : {}),
      ...(data.displayPromoCode !== undefined
        ? {
            displayPromoCode:
              data.displayPromoCode?.trim().toUpperCase() || null,
          }
        : {}),
      ...(data.startsAt !== undefined
        ? { startsAt: parseFlashStartsAt(data.startsAt) }
        : {}),
      ...(data.expiresAt !== undefined
        ? { expiresAt: parseFlashExpiresAt(data.expiresAt) }
        : {}),
    },
  });

  let notified = 0;
  if (data.sendNotification && sale.active) {
    notified = await notifyFlashSaleAudience({
      title: sale.title,
      discountPercent: sale.discountPercent,
      targetRole: sale.targetRole,
      scope: sale.scope,
    });
  }

  return jsonOk({ sale, notified });
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    await requireAdmin();
  } catch {
    return jsonError("UNAUTHORIZED", "Admin required.", 401);
  }
  const { id } = await params;
  await prisma.flashSale.delete({ where: { id } });
  return jsonOk({ ok: true });
}
