import { jsonError, jsonOk } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/admin";
import { archiveOrDeleteProduct } from "@/lib/admin-products";
import { prisma } from "@/lib/prisma";
import { isProductImageUrl } from "@/lib/public-uploads";
import { allocateProductApiCode } from "@/lib/seller-api/ensure-api-code";
import { slugify } from "@/lib/slug";
import type { NextRequest } from "next/server";
import { z } from "zod";

const patchSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().min(1).max(2000).optional(),
  apiCode: z.string().trim().max(64).optional().nullable(),
  categoryId: z.string().min(1).nullable().optional(),
  categoryName: z.string().trim().min(1).max(80).optional(),
  features: z.array(z.string()).optional(),
  imageUrl: z
    .string()
    .nullable()
    .optional()
    .refine(
      (v) => v == null || v === "" || isProductImageUrl(v) || /^https?:\/\//i.test(v),
      { message: "Invalid image URL" },
    ),
  demoUrl: z
    .string()
    .trim()
    .max(500)
    .nullable()
    .optional()
    .refine((v) => v == null || v === "" || /^https?:\/\//i.test(v), {
      message: "Invalid demo URL",
    }),
  isBestSeller: z.boolean().optional(),
  isNew: z.boolean().optional(),
  isPinned: z.boolean().optional(),
  isMaintenance: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

async function resolveCategoryId(input: {
  categoryId?: string | null;
  categoryName?: string;
  touched: boolean;
}): Promise<string | null | undefined> {
  if (!input.touched) return undefined;
  if (input.categoryId === null && !input.categoryName) return null;
  if (input.categoryId) {
    const found = await prisma.category.findUnique({
      where: { id: input.categoryId },
      select: { id: true },
    });
    return found?.id ?? null;
  }
  const name = input.categoryName?.trim();
  if (!name) return null;

  const existing = await prisma.category.findFirst({
    where: { name },
  });
  if (existing) return existing.id;

  let slug = slugify(name) || `cat-${Date.now()}`;
  const clash = await prisma.category.findUnique({ where: { slug } });
  if (clash) slug = `${slug}-${Date.now().toString(36)}`;

  const created = await prisma.category.create({
    data: { name, slug, sortOrder: 0 },
  });
  return created.id;
}

export async function GET(
  _request: NextRequest,
  context: RouteContext<"/api/admin/products/[id]">,
) {
  try {
    await requireAdmin();
  } catch {
    return jsonError("UNAUTHORIZED", "Admin required.", 401);
  }
  const { id } = await context.params;
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      category: true,
      durations: {
        include: {
          prices: true,
          _count: { select: { keys: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!product) return jsonError("NOT_FOUND", "Product not found.", 404);
  return jsonOk({
    ...product,
    keyTotal: product.durations.reduce((n, d) => n + d._count.keys, 0),
    durations: product.durations.map((d) => ({
      ...d,
      keyCount: d._count.keys,
    })),
  });
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext<"/api/admin/products/[id]">,
) {
  try {
    await requireAdmin();
  } catch {
    return jsonError("UNAUTHORIZED", "Admin required.", 401);
  }
  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return jsonError("VALIDATION", "Invalid data.", 400);

  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) return jsonError("NOT_FOUND", "Product not found.", 404);

  const categoryTouched =
    parsed.data.categoryId !== undefined || parsed.data.categoryName !== undefined;
  const categoryId = await resolveCategoryId({
    categoryId: parsed.data.categoryId,
    categoryName: parsed.data.categoryName,
    touched: categoryTouched,
  });

  let apiCode: string | undefined;
  if (parsed.data.apiCode !== undefined) {
    apiCode = await allocateProductApiCode(
      parsed.data.title ?? existing.title,
      parsed.data.apiCode,
      id,
    );
  } else if (!existing.apiCode) {
    apiCode = await allocateProductApiCode(
      parsed.data.title ?? existing.title,
      null,
      id,
    );
  }

  const product = await prisma.product.update({
    where: { id },
    data: {
      ...(parsed.data.title !== undefined ? { title: parsed.data.title } : {}),
      ...(parsed.data.description !== undefined
        ? { description: parsed.data.description }
        : {}),
      ...(apiCode !== undefined ? { apiCode } : {}),
      ...(categoryTouched ? { categoryId: categoryId ?? null } : {}),
      ...(parsed.data.features !== undefined ? { features: parsed.data.features } : {}),
      ...(parsed.data.imageUrl !== undefined
        ? { imageUrl: parsed.data.imageUrl || null }
        : {}),
      ...(parsed.data.demoUrl !== undefined
        ? { demoUrl: parsed.data.demoUrl?.trim() || null }
        : {}),
      ...(parsed.data.isBestSeller !== undefined
        ? { isBestSeller: parsed.data.isBestSeller }
        : {}),
      ...(parsed.data.isNew !== undefined ? { isNew: parsed.data.isNew } : {}),
      ...(parsed.data.isPinned !== undefined
        ? { isPinned: parsed.data.isPinned }
        : {}),
      ...(parsed.data.isMaintenance !== undefined
        ? { isMaintenance: parsed.data.isMaintenance }
        : {}),
      ...(parsed.data.isActive !== undefined ? { isActive: parsed.data.isActive } : {}),
    },
    include: {
      category: true,
      durations: { include: { prices: true, _count: { select: { keys: true } } } },
    },
  });
  return jsonOk(product);
}

export async function DELETE(
  _request: NextRequest,
  context: RouteContext<"/api/admin/products/[id]">,
) {
  try {
    await requireAdmin();
  } catch {
    return jsonError("UNAUTHORIZED", "Admin required.", 401);
  }
  const { id } = await context.params;

  try {
    const result = await archiveOrDeleteProduct(id);
    return jsonOk(result);
  } catch (e) {
    const code = e instanceof Error ? e.message : "DELETE_FAILED";
    if (code === "NOT_FOUND") {
      return jsonError("NOT_FOUND", "Product not found.", 404);
    }
    return jsonError("DELETE_FAILED", "Failed to delete product.", 500);
  }
}
