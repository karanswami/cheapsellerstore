import { jsonError, jsonOk } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return jsonError("UNAUTHORIZED", "Admin only.", 401);
  }

  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1") || 1);
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") ?? "20") || 20));
  const q = url.searchParams.get("q")?.trim() ?? "";
  const skip = (page - 1) * limit;

  const where = q
    ? {
        OR: [
          { name: { contains: q, mode: "insensitive" as const } },
          { keyPrefix: { contains: q, mode: "insensitive" as const } },
          { user: { username: { contains: q, mode: "insensitive" as const } } },
          { user: { email: { contains: q, mode: "insensitive" as const } } },
        ],
      }
    : {};

  // Mongo Prisma may not support mode insensitive — fallback without mode
  const whereSafe = q
    ? {
        OR: [
          { name: { contains: q } },
          { keyPrefix: { contains: q } },
          { user: { username: { contains: q } } },
          { user: { email: { contains: q } } },
        ],
      }
    : {};

  const [total, rows] = await Promise.all([
    prisma.sellerApiKey.count({ where: whereSafe }),
    prisma.sellerApiKey.findMany({
      where: whereSafe,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        user: {
          select: { id: true, username: true, email: true, role: true },
        },
      },
    }),
  ]);

  void where;

  return jsonOk({
    page,
    limit,
    total,
    pageCount: Math.max(1, Math.ceil(total / limit) || 1),
    hasMore: skip + rows.length < total,
    keys: rows.map((k) => ({
      id: k.id,
      name: k.name,
      keyPrefix: k.keyPrefix,
      mode: k.mode,
      status: k.status,
      rateLimitRpm: k.rateLimitRpm,
      lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
      createdAt: k.createdAt.toISOString(),
      user: k.user,
    })),
  });
}
