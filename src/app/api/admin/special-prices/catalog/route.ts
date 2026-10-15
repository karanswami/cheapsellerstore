import { jsonError, jsonOk } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/prisma";

/**
 * Paginated product catalog for special-price picker.
 * Includes durations + base USD prices + this user's overrides.
 */
export async function GET(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return jsonError("UNAUTHORIZED", "Admin required.", 401);
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId")?.trim() ?? "";
  if (!userId) {
    return jsonError("VALIDATION", "userId is required.", 400);
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!user) {
    return jsonError("NOT_FOUND", "User not found.", 404);
  }

  const q = searchParams.get("q")?.trim() ?? "";
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const limit = Math.min(
    48,
    Math.max(1, Number(searchParams.get("limit") ?? "20") || 20),
  );

  const where = {
    isActive: true,
    ...(q
      ? { title: { contains: q, mode: "insensitive" as const } }
      : {}),
  };

  const [total, products, overrides] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy: [
        { isPinned: "desc" },
        { isBestSeller: "desc" },
        { title: "asc" },
      ],
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        title: true,
        imageUrl: true,
        isActive: true,
        durations: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            label: true,
            days: true,
            prices: {
              where: { currency: "USD" },
              take: 1,
              select: { price: true, resellerPrice: true },
            },
          },
        },
      },
    }),
    prisma.userSpecialPrice.findMany({
      where: { userId },
      select: { durationId: true, price: true },
    }),
  ]);

  const specialByDuration = new Map(
    overrides.map((o) => [o.durationId, o.price]),
  );

  return jsonOk({
    page,
    limit,
    total,
    hasMore: page * limit < total,
    products: products.map((p) => ({
      id: p.id,
      title: p.title,
      imageUrl: p.imageUrl,
      specialCount: p.durations.filter((d) =>
        specialByDuration.has(d.id),
      ).length,
      durations: p.durations.map((d) => ({
        id: d.id,
        label: d.label,
        days: d.days,
        retailPrice: d.prices[0]?.price ?? null,
        resellerPrice: d.prices[0]?.resellerPrice ?? null,
        specialPrice: specialByDuration.get(d.id) ?? null,
      })),
    })),
  });
}
