import { jsonError, jsonOk } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import { z } from "zod";

const schema = z.object({
  name: z.string().trim().min(1).max(80),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  icon: z.string().trim().max(50).nullable().optional(),
  sortOrder: z.number().int().optional(),
});

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return jsonError("UNAUTHORIZED", "Admin required.", 401);
  }
  const categories = await prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      _count: { select: { products: true } },
    },
  });
  return jsonOk(categories);
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return jsonError("UNAUTHORIZED", "Admin required.", 401);
  }
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return jsonError("VALIDATION", "Invalid category.", 400);
  }
  const slug = parsed.data.slug?.trim() || slugify(parsed.data.name);
  if (!slug) {
    return jsonError("VALIDATION", "Could not build a slug from the name.", 400);
  }
  try {
    const category = await prisma.category.create({
      data: {
        name: parsed.data.name,
        slug,
        icon: parsed.data.icon ? parsed.data.icon.trim() : null,
        sortOrder: parsed.data.sortOrder ?? 0,
      },
      include: { _count: { select: { products: true } } },
    });

    try {
      const { getRedis } = await import("@/lib/redis");
      const redis = await getRedis();
      if (redis) await redis.del("drip:cache:categories");
    } catch {
      // ignore
    }

    return jsonOk(category);
  } catch {
    return jsonError("CONFLICT", "Slug may already exist.", 409);
  }
}
