import { logActivity } from "@/lib/activity-log";
import { jsonError, jsonOk } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/admin";
import { usdToMicrocents } from "@/lib/currencies";
import { prisma } from "@/lib/prisma";
import { recordSpecialPriceHistory } from "@/lib/special-price-history";
import { z } from "zod";

const upsertSchema = z.object({
  userId: z.string().min(1),
  durationId: z.string().min(1),
  /** USD dollars (e.g. 9.99) — stored as microcents. */
  priceUsd: z.number().finite().min(0),
});

const deleteSchema = z.object({
  userId: z.string().min(1),
  durationId: z.string().min(1),
});

/**
 * - `active=1` → paginated live specials (`page`, `limit`, optional `q`)
 * - `q` → username search for picker
 * - `userId` → all overrides for one user
 */
export async function GET(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return jsonError("UNAUTHORIZED", "Admin required.", 401);
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const userId = searchParams.get("userId")?.trim() ?? "";
  const active = searchParams.get("active") === "1";

  if (active) {
    const page = Math.max(1, Number(searchParams.get("page") ?? 1) || 1);
    const limit = Math.min(
      48,
      Math.max(1, Number(searchParams.get("limit") ?? 20) || 20),
    );
    const filter = q;

    const matchingUserIds =
      filter.length > 0
        ? (
            await prisma.user.findMany({
              where: {
                OR: [
                  { username: { contains: filter, mode: "insensitive" } },
                  { email: { contains: filter, mode: "insensitive" } },
                  { name: { contains: filter, mode: "insensitive" } },
                ],
              },
              take: 40,
              select: { id: true },
            })
          ).map((u) => u.id)
        : null;

    const matchingDurationIds =
      filter.length > 0
        ? (
            await prisma.duration.findMany({
              where: {
                OR: [
                  { label: { contains: filter, mode: "insensitive" } },
                  {
                    product: {
                      title: { contains: filter, mode: "insensitive" },
                    },
                  },
                ],
              },
              take: 80,
              select: { id: true },
            })
          ).map((d) => d.id)
        : null;

    const where =
      filter.length > 0
        ? {
            OR: [
              ...(matchingUserIds && matchingUserIds.length > 0
                ? [{ userId: { in: matchingUserIds } }]
                : []),
              ...(matchingDurationIds && matchingDurationIds.length > 0
                ? [{ durationId: { in: matchingDurationIds } }]
                : []),
            ],
          }
        : {};

    // No matches for a non-empty filter → empty page
    if (
      filter.length > 0 &&
      (!("OR" in where) || (where.OR as unknown[]).length === 0)
    ) {
      return jsonOk({
        items: [],
        page,
        limit,
        total: 0,
        hasMore: false,
      });
    }

    const [total, rows] = await Promise.all([
      prisma.userSpecialPrice.count({ where }),
      prisma.userSpecialPrice.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              email: true,
              role: true,
              banned: true,
            },
          },
          duration: {
            select: {
              id: true,
              label: true,
              product: { select: { id: true, title: true, imageUrl: true } },
              prices: {
                where: { currency: "USD" },
                take: 1,
                select: { price: true, resellerPrice: true },
              },
            },
          },
        },
      }),
    ]);

    return jsonOk({
      items: rows.map((row) => ({
        id: row.id,
        userId: row.userId,
        durationId: row.durationId,
        price: row.price,
        updatedAt: row.updatedAt.toISOString(),
        user: {
          id: row.user.id,
          name: row.user.name,
          username: row.user.username,
          email: row.user.email,
          role: row.user.role,
          banned: row.user.banned,
        },
        productId: row.duration.product.id,
        productTitle: row.duration.product.title,
        productImageUrl: row.duration.product.imageUrl,
        durationLabel: row.duration.label,
        retailPrice: row.duration.prices[0]?.price ?? null,
        resellerPrice: row.duration.prices[0]?.resellerPrice ?? null,
      })),
      page,
      limit,
      total,
      hasMore: page * limit < total,
    });
  }

  if (searchParams.get("pick") === "1") {
    const page = Math.max(1, Number(searchParams.get("page") ?? 1) || 1);
    const limit = 30;
    const where = q
      ? {
          OR: [
            { username: { contains: q, mode: "insensitive" as const } },
            { email: { contains: q, mode: "insensitive" as const } },
            { name: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {};
    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        orderBy: { username: "asc" },
        skip: (page - 1) * limit,
        take: limit,
        select: { id: true, username: true, email: true, role: true, _count: { select: { specialPrices: true } } },
      }),
    ]);
    return jsonOk({
      total,
      hasMore: page * limit < total,
      users: users.map((u) => ({ id: u.id, username: u.username, email: u.email, role: u.role, specialPriceCount: u._count.specialPrices })),
    });
  }

  if (searchParams.get("all") === "1") {
    const users = await prisma.user.findMany({
      take: 1000,
      orderBy: { username: "asc" },
      select: { id: true, username: true, email: true, role: true },
    });
    return jsonOk({ users });
  }

  if (q) {
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { name: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 20,
      orderBy: { username: "asc" },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        role: true,
        banned: true,
        _count: { select: { specialPrices: true } },
      },
    });
    return jsonOk({
      users: users.map((u) => ({
        id: u.id,
        name: u.name,
        username: u.username,
        email: u.email,
        role: u.role,
        banned: u.banned,
        specialPriceCount: u._count.specialPrices,
      })),
    });
  }

  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        role: true,
        banned: true,
      },
    });
    if (!user) {
      return jsonError("NOT_FOUND", "User not found.", 404);
    }

    const overrides = await prisma.userSpecialPrice.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      include: {
        duration: {
          select: {
            id: true,
            label: true,
            product: { select: { id: true, title: true } },
            prices: {
              where: { currency: "USD" },
              take: 1,
              select: { price: true, resellerPrice: true },
            },
          },
        },
      },
    });

    return jsonOk({
      user,
      overrides: overrides.map((row) => ({
        id: row.id,
        durationId: row.durationId,
        price: row.price,
        productId: row.duration.product.id,
        productTitle: row.duration.product.title,
        durationLabel: row.duration.label,
        retailPrice: row.duration.prices[0]?.price ?? null,
        resellerPrice: row.duration.prices[0]?.resellerPrice ?? null,
        updatedAt: row.updatedAt,
      })),
    });
  }

  return jsonError(
    "VALIDATION",
    "Provide active=1, q (username search), or userId.",
    400,
  );
}

/** Upsert a per-user special price for a duration. */
export async function PUT(request: Request) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return jsonError("UNAUTHORIZED", "Admin required.", 401);
  }

  const body = await request.json().catch(() => null);
  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      "VALIDATION",
      parsed.error.issues[0]?.message ?? "Invalid payload.",
      400,
    );
  }

  const { userId, durationId, priceUsd } = parsed.data;
  const price = usdToMicrocents(priceUsd);

  const [user, duration, existing] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true },
    }),
    prisma.duration.findUnique({
      where: { id: durationId },
      select: {
        id: true,
        label: true,
        product: { select: { id: true, title: true } },
      },
    }),
    prisma.userSpecialPrice.findUnique({
      where: { userId_durationId: { userId, durationId } },
      select: { price: true },
    }),
  ]);
  if (!user) return jsonError("NOT_FOUND", "User not found.", 404);
  if (!duration) return jsonError("NOT_FOUND", "Duration not found.", 404);

  const row = await prisma.userSpecialPrice.upsert({
    where: {
      userId_durationId: { userId, durationId },
    },
    create: { userId, durationId, price },
    update: { price },
  });

  const action = existing ? "UPDATE" : "SET";
  const target = {
    userId: user.id,
    username: user.username,
    durationId: duration.id,
    durationLabel: duration.label,
    productId: duration.product.id,
    productTitle: duration.product.title,
  };

  recordSpecialPriceHistory({
    action,
    target,
    previousPrice: existing?.price ?? null,
    newPrice: price,
    admin: { id: admin.id, username: admin.username },
  });

  logActivity({
    request,
    action: action === "SET" ? "SPECIAL_PRICE_SET" : "SPECIAL_PRICE_UPDATE",
    category: "ADMIN",
    message:
      action === "SET"
        ? `Special price set for @${user.username} on ${duration.product.title} / ${duration.label}`
        : `Special price updated for @${user.username} on ${duration.product.title} / ${duration.label}`,
    user,
    metadata: {
      durationId,
      productId: duration.product.id,
      previousPrice: existing?.price ?? null,
      newPrice: price,
      byAdminId: admin.id,
      byAdmin: admin.username,
    },
  });

  return jsonOk({
    id: row.id,
    userId: row.userId,
    durationId: row.durationId,
    price: row.price,
  });
}

/** Remove a per-user special price. */
export async function DELETE(request: Request) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return jsonError("UNAUTHORIZED", "Admin required.", 401);
  }

  const body = await request.json().catch(() => null);
  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      "VALIDATION",
      parsed.error.issues[0]?.message ?? "Invalid payload.",
      400,
    );
  }

  const { userId, durationId } = parsed.data;

  const [user, duration, existing] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true },
    }),
    prisma.duration.findUnique({
      where: { id: durationId },
      select: {
        id: true,
        label: true,
        product: { select: { id: true, title: true } },
      },
    }),
    prisma.userSpecialPrice.findUnique({
      where: { userId_durationId: { userId, durationId } },
      select: { price: true },
    }),
  ]);

  if (!existing) {
    return jsonError("NOT_FOUND", "Special price not found.", 404);
  }

  try {
    await prisma.userSpecialPrice.delete({
      where: { userId_durationId: { userId, durationId } },
    });
  } catch {
    return jsonError("NOT_FOUND", "Special price not found.", 404);
  }

  const username = user?.username ?? null;
  const productTitle = duration?.product.title ?? null;
  const durationLabel = duration?.label ?? null;

  recordSpecialPriceHistory({
    action: "CLEAR",
    target: {
      userId,
      username,
      durationId,
      durationLabel,
      productId: duration?.product.id ?? null,
      productTitle,
    },
    previousPrice: existing.price,
    newPrice: null,
    admin: { id: admin.id, username: admin.username },
  });

  logActivity({
    request,
    action: "SPECIAL_PRICE_CLEAR",
    category: "ADMIN",
    message: username
      ? `Special price cleared for @${username}${
          productTitle ? ` on ${productTitle}` : ""
        }${durationLabel ? ` / ${durationLabel}` : ""}`
      : "Special price cleared",
    user: user ?? undefined,
    userId,
    username,
    metadata: {
      durationId,
      productId: duration?.product.id ?? null,
      previousPrice: existing.price,
      byAdminId: admin.id,
      byAdmin: admin.username,
    },
  });

  return jsonOk({ ok: true });
}
