import { jsonError, jsonOk } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import type { NextRequest } from "next/server";
import { z } from "zod";

const schema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  icon: z.string().trim().max(50).nullable().optional(),
  sortOrder: z.number().int().optional(),
  /** Replace folder membership: set these products' categoryId to this category. */
  productIds: z.array(z.string().min(1)).optional(),
});

export async function GET(
  _request: NextRequest,
  context: RouteContext<"/api/admin/categories/[id]">,
) {
  try {
    await requireAdmin();
  } catch {
    return jsonError("UNAUTHORIZED", "Admin required.", 401);
  }
  const { id } = await context.params;
  const category = await prisma.category.findUnique({
    where: { id },
    include: {
      products: {
        select: {
          id: true,
          title: true,
          isActive: true,
          imageUrl: true,
        },
        orderBy: { title: "asc" },
      },
      _count: { select: { products: true } },
    },
  });
  if (!category) return jsonError("NOT_FOUND", "Category not found.", 404);
  return jsonOk(category);
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext<"/api/admin/categories/[id]">,
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

  const existing = await prisma.category.findUnique({ where: { id } });
  if (!existing) return jsonError("NOT_FOUND", "Category not found.", 404);

  const { productIds, name, slug, icon, sortOrder } = parsed.data;

  if (productIds !== undefined) {
    const uniqueIds = [...new Set(productIds)];
    await prisma.$transaction([
      prisma.product.updateMany({
        where: { categoryId: id, id: { notIn: uniqueIds } },
        data: { categoryId: null },
      }),
      prisma.product.updateMany({
        where: { id: { in: uniqueIds } },
        data: { categoryId: id },
      }),
    ]);
  }

  const data: { name?: string; slug?: string; icon?: string | null; sortOrder?: number } = {};
  if (name !== undefined) data.name = name;
  if (icon !== undefined) data.icon = icon ? icon.trim() : null;
  if (sortOrder !== undefined) data.sortOrder = sortOrder;
  if (slug !== undefined) {
    data.slug = slug;
  } else if (name !== undefined && !parsed.data.slug) {
    data.slug = slugify(name) || existing.slug;
  }

  const category = await prisma.category.update({
    where: { id },
    data,
    include: {
      products: {
        select: { id: true, title: true, isActive: true, imageUrl: true },
        orderBy: { title: "asc" },
      },
      _count: { select: { products: true } },
    },
  });

  try {
    const { getRedis } = await import("@/lib/redis");
    const redis = await getRedis();
    if (redis) await redis.del("cheapseller:cache:categories");
  } catch {
    // ignore
  }

  return jsonOk(category);
}

export async function DELETE(
  _request: NextRequest,
  context: RouteContext<"/api/admin/categories/[id]">,
) {
  try {
    await requireAdmin();
  } catch {
    return jsonError("UNAUTHORIZED", "Admin required.", 401);
  }
  const { id } = await context.params;
  const existing = await prisma.category.findUnique({ where: { id } });
  if (!existing) return jsonError("NOT_FOUND", "Category not found.", 404);

  await prisma.$transaction([
    prisma.product.updateMany({
      where: { categoryId: id },
      data: { categoryId: null },
    }),
    prisma.category.delete({ where: { id } }),
  ]);

  try {
    const { getRedis } = await import("@/lib/redis");
    const redis = await getRedis();
    if (redis) await redis.del("cheapseller:cache:categories");
  } catch {
    // ignore
  }

  return jsonOk({ ok: true });
}
