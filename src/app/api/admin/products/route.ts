import { jsonError, jsonOk } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/prisma";
import { isProductImageUrl } from "@/lib/public-uploads";
import { nextCatalogNumber } from "@/lib/catalog-numbers";
import { Currency, usdToMicrocents } from "@/lib/currencies";
import { slugify } from "@/lib/slug";
import { KeyStatus } from "@prisma/client";
import { z } from "zod";

const durationInput = z.object({
  label: z.string().trim().min(1).max(80),
  days: z.number().int().positive().nullable().optional(),
  hours: z.number().int().positive().nullable().optional(),
  requiresAndroidId: z.boolean().optional().default(false),
  deviceIdName: z.string().trim().max(80).optional().default(""),
  /** USD decimals; stored as microcents. */
  price: z.number().positive(),
  resellerPrice: z.number().min(0).optional(),
  buyPrice: z.number().min(0).optional(),
});

const createSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(2000),
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
  /** Durations created together with the product (admin "New product" page). */
  durations: z.array(durationInput).max(40).default([]),
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
              ...(/^\d{1,9}$/.test(q) ? [{ number: Number(q) }] : []),
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
        orderBy: { number: "asc" },
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

  const labels = parsed.data.durations.map((d) => d.label.toLowerCase());
  if (new Set(labels).size !== labels.length) {
    return jsonError("CONFLICT", "Duplicate duration labels.", 409);
  }

  const number = await nextCatalogNumber("product");
  const durations = [];
  for (const d of parsed.data.durations) {
    durations.push({ ...d, number: await nextCatalogNumber("duration") });
  }

  const product = await prisma.product.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description,
      number,
      categoryId,
      features: parsed.data.features,
      imageUrl: parsed.data.imageUrl || null,
      demoUrl: parsed.data.demoUrl?.trim() || null,
      isBestSeller: parsed.data.isBestSeller ?? false,
      isNew: parsed.data.isNew ?? false,
      isPinned: parsed.data.isPinned ?? false,
      isMaintenance: parsed.data.isMaintenance ?? false,
      isActive: parsed.data.isActive ?? true,
      durations: {
        create: durations.map((d) => ({
          number: d.number,
          label: d.label,
          days: d.days ?? null,
          hours: d.hours ?? null,
          requiresAndroidId: d.requiresAndroidId,
          deviceIdName: d.deviceIdName,
          prices: {
            create: {
              currency: Currency.USD,
              price: usdToMicrocents(d.price),
              resellerPrice: usdToMicrocents(d.resellerPrice ?? 0),
              buyPrice: usdToMicrocents(d.buyPrice ?? 0),
            },
          },
        })),
      },
    },
    include: {
      category: true,
      durations: { include: { prices: true } },
    },
  });
  return jsonOk(product);
}
