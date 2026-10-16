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
  const skip = (page - 1) * limit;
  const q = url.searchParams.get("q")?.trim() ?? "";
  const filter = url.searchParams.get("filter") ?? "all";

  const where: Record<string, unknown> = {};

  if (filter === "ok") where.statusCode = { lt: 400 };
  else if (filter === "error") where.statusCode = { gte: 400 };
  else if (filter === "busy") where.statusCode = 429;
  else if (filter === "purchases") {
    where.AND = [
      { method: "POST" },
      {
        OR: [
          { path: { contains: "/orders" } },
          { path: { endsWith: "/orders" } },
        ],
      },
    ];
  }

  if (q) {
    where.OR = [
      { path: { contains: q } },
      { user: { username: { contains: q } } },
      { apiKey: { keyPrefix: { contains: q } } },
    ];
  }

  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [total, rows, last24, rateLimited, errors24, activeKeys] = await Promise.all([
    prisma.sellerApiUsage.count({ where }),
    prisma.sellerApiUsage.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        user: { select: { username: true } },
        apiKey: { select: { keyPrefix: true } },
      },
    }),
    prisma.sellerApiUsage.count({ where: { createdAt: { gte: since24h } } }),
    prisma.sellerApiUsage.count({
      where: { createdAt: { gte: since24h }, statusCode: 429 },
    }),
    prisma.sellerApiUsage.count({
      where: { createdAt: { gte: since24h }, statusCode: { gte: 400 } },
    }),
    prisma.sellerApiKey.count({ where: { status: "ACTIVE" } }),
  ]);

  return jsonOk({
    page,
    limit,
    total,
    pageCount: Math.max(1, Math.ceil(total / limit) || 1),
    hasMore: skip + rows.length < total,
    filter,
    kpis: {
      requests24h: last24,
      rateLimited24h: rateLimited,
      errors24h: errors24,
      activeKeys,
    },
    items: rows.map((r) => ({
      id: r.id,
      method: r.method,
      path: r.path,
      statusCode: r.statusCode,
      durationMs: r.durationMs,
      errorCode: r.errorCode,
      username: r.user.username,
      keyPrefix: r.apiKey.keyPrefix,
      createdAt: r.createdAt.toISOString(),
    })),
  });
}
