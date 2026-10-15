import { jsonError, jsonOk } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/prisma";
import { KeyStatus } from "@prisma/client";
import { z } from "zod";

export async function GET(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return jsonError("UNAUTHORIZED", "Admin required.", 401);
  }

  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (!q) return jsonOk({ key: null });

  // Mongo ObjectId only — raw key codes must not be passed as `id` (P2023).
  const isObjectId = /^[a-f\d]{24}$/i.test(q);

  try {
    let key = await prisma.key.findFirst({
      where: isObjectId
        ? { OR: [{ code: q }, { id: q }] }
        : { code: q },
      include: {
        duration: {
          include: { product: { select: { id: true, title: true } } },
        },
        order: { select: { id: true, buyerEmail: true } },
      },
    });

    // Fallback: exact match ignoring surrounding whitespace differences in DB.
    if (!key && !isObjectId) {
      const candidates = await prisma.key.findMany({
        where: {
          code: { contains: q },
        },
        take: 25,
        include: {
          duration: {
            include: { product: { select: { id: true, title: true } } },
          },
          order: { select: { id: true, buyerEmail: true } },
        },
      });
      key =
        candidates.find((k) => k.code.trim() === q) ??
        candidates.find(
          (k) => k.code.trim().toLowerCase() === q.toLowerCase(),
        ) ??
        null;
    }

    if (!key) return jsonOk({ key: null });

    return jsonOk({
      key: {
        id: key.id,
        code: key.code,
        status: key.status,
        soldAt: key.soldAt,
        createdAt: key.createdAt,
        productTitle: key.duration.product.title,
        productId: key.duration.product.id,
        durationLabel: key.duration.label,
        durationId: key.durationId,
        orderId: key.orderId,
        buyerEmail: key.order?.buyerEmail ?? null,
      },
    });
  } catch {
    return jsonError("INTERNAL", "Key lookup failed.", 500);
  }
}

const patchSchema = z.object({
  status: z.enum(["AVAILABLE", "DISABLED"]).optional(),
  code: z.string().trim().min(1).max(500).optional(),
});

export async function PATCH(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return jsonError("UNAUTHORIZED", "Admin required.", 401);
  }

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return jsonError("VALIDATION", "id required.", 400);

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return jsonError("VALIDATION", "Invalid payload.", 400);

  const existing = await prisma.key.findUnique({ where: { id } });
  if (!existing) return jsonError("NOT_FOUND", "Key not found.", 404);
  if (existing.status === KeyStatus.SOLD) {
    return jsonError("CONFLICT", "Sold keys are view-only.", 409);
  }

  if (parsed.data.code && parsed.data.code !== existing.code) {
    const clash = await prisma.key.findUnique({
      where: { code: parsed.data.code },
    });
    if (clash) {
      return jsonError("CONFLICT", "That code already exists.", 409);
    }
  }

  const key = await prisma.key.update({
    where: { id },
    data: {
      ...(parsed.data.status ? { status: parsed.data.status as KeyStatus } : {}),
      ...(parsed.data.code ? { code: parsed.data.code } : {}),
    },
  });

  return jsonOk({ key });
}

export async function DELETE(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return jsonError("UNAUTHORIZED", "Admin required.", 401);
  }

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return jsonError("VALIDATION", "id required.", 400);

  const existing = await prisma.key.findUnique({ where: { id } });
  if (!existing) return jsonError("NOT_FOUND", "Key not found.", 404);
  if (existing.status === KeyStatus.SOLD) {
    return jsonError("CONFLICT", "Cannot delete a sold key.", 409);
  }

  await prisma.key.delete({ where: { id } });
  return jsonOk({ ok: true });
}
