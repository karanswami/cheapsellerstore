import { jsonError, jsonOk } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/prisma";
import { isProductImageUrl } from "@/lib/public-uploads";
import { allocateProductApiCode } from "@/lib/seller-api/ensure-api-code";
import { slugify } from "@/lib/slug";
import { KeyStatus } from "@prisma/client";
import { z } from "zod";

const createSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(2000),
  apiCode: z.string().trim().max(64).optional().nullable(),
  categoryId: z.string().min(1).nullable().optional(),
  /** When set and categoryId is empty, create/find category by name. */
  categoryName: z.string().trim().min(1).max(80).optional(),
  features: z.array(z.string()).default([]),
  imageUrl: z
    .string()
    .optional()
    .nullable()
    .refine((v) => v == null || v === "" || isProductImageUrl(v) || /^https?:\/\//i.test(v), {
      message: "Invalid image URL",
    }),
  demoUrl: z
    .string()
    .trim()
    .max(500)
    .optional()
    .nullable()
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
}): Promise<string | null> {
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

export async function GET(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return jsonError("UNAUTHORIZED", "Admin required.", 401);
  }

  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const categoryId = url.searchParams.get("categoryId");
  const active = url.searchParams.get("active");

  const products = await prisma.product.findMany({
    where: {
      ...(q
        ? {
            OR: [
              { title: { contains: q } },
              { description: { contains: q } },
            ],
          }
        : {}),
      ...(categoryId === "none"
        ? { categoryId: null }
        : categoryId
          ? { categoryId }
          : {}),
      ...(active === "true"
        ? { isActive: true }
        : active === "false"
          ? { isActive: false }
          : {}),
    },
    include: {
      category: true,
      durations: {
        include: {
          prices: true,
          _count: { select: { keys: true } },
          keys: { select: { status: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: [
      { isPinned: "desc" },
      { isBestSeller: "desc" },
      { createdAt: "desc" },
    ],
  });

  const rows = products.map((p) => {
    let keyTotal = 0;
    let keyAvailable = 0;
    let keySold = 0;
    const durations = p.durations.map((d) => {
      const available = d.keys.filter((k) => k.status === KeyStatus.AVAILABLE).length;
      const sold = d.keys.filter((k) => k.status === KeyStatus.SOLD).length;
      const disabled = d.keys.filter((k) => k.status === KeyStatus.DISABLED).length;
      keyTotal += d.keys.length;
      keyAvailable += available;
      keySold += sold;
      const { keys: _keys, ...rest } = d;
      return {
        ...rest,
        available,
        sold,
        disabled,
        keyCount: d.keys.length,
      };
    });
    return {
      ...p,
      durations,
      keyTotal,
      keyAvailable,
      keySold,
    };
  });

  return jsonOk(rows);
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return jsonError("UNAUTHORIZED", "Admin required.", 401);
  }
  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return jsonError("VALIDATION", "Invalid product.", 400);

  const categoryId = await resolveCategoryId({
    categoryId: parsed.data.categoryId,
    categoryName: parsed.data.categoryName,
  });

  const apiCode = await allocateProductApiCode(
    parsed.data.title,
    parsed.data.apiCode,
  );

  const product = await prisma.product.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description,
      apiCode,
      categoryId,
      features: parsed.data.features,
      imageUrl: parsed.data.imageUrl || null,
      demoUrl: parsed.data.demoUrl?.trim() || null,
      isBestSeller: parsed.data.isBestSeller ?? false,
      isNew: parsed.data.isNew ?? false,
      isPinned: parsed.data.isPinned ?? false,
      isMaintenance: parsed.data.isMaintenance ?? false,
      isActive: parsed.data.isActive ?? true,
    },
    include: {
      category: true,
      durations: { include: { prices: true } },
    },
  });
  return jsonOk(product);
}
