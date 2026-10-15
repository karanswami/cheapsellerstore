import { prisma } from "@/lib/prisma";

export type AdminDeveloperStatusFilter = "all" | "active" | "none" | "disabled";

/**
 * Paginated Platform API developers (users with a key and/or API disabled).
 */
export async function listAdminApiDevelopers(input: {
  page?: number;
  limit?: number;
  q?: string;
  status?: AdminDeveloperStatusFilter;
}) {
  const page = Math.max(1, Math.floor(input.page ?? 1) || 1);
  const limit = Math.min(50, Math.max(1, Math.floor(input.limit ?? 20) || 20));
  const skip = (page - 1) * limit;
  const q = input.q?.trim() ?? "";
  const status = input.status ?? "all";

  const searchWhere = q
    ? {
        OR: [
          { username: { contains: q } },
          { email: { contains: q } },
          { name: { contains: q } },
        ],
      }
    : {};

  const baseAnd: Record<string, unknown>[] = [
    {
      OR: [{ sellerApiKeys: { some: {} } }, { apiEnabled: false }],
    },
  ];
  if (Object.keys(searchWhere).length) baseAnd.push(searchWhere);

  if (status === "active") {
    baseAnd.push({
      apiEnabled: { not: false },
      sellerApiKeys: { some: { status: "ACTIVE" } },
    });
  } else if (status === "none") {
    baseAnd.push({
      apiEnabled: { not: false },
      sellerApiKeys: { none: { status: "ACTIVE" } },
    });
  } else if (status === "disabled") {
    baseAnd.push({ apiEnabled: false });
  }

  const where = { AND: baseAnd };

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        role: true,
        apiEnabled: true,
        banned: true,
        sellerApiKeys: {
          where: { status: "ACTIVE" },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            keyPrefix: true,
            mode: true,
            status: true,
            lastUsedAt: true,
            createdAt: true,
          },
        },
      },
    }),
  ]);

  return {
    page,
    limit,
    total,
    pageCount: Math.max(1, Math.ceil(total / limit) || 1),
    hasMore: skip + users.length < total,
    status,
    items: users.map((u) => {
      const credentials = u.sellerApiKeys.map((k) => ({
        id: k.id,
        keyPrefix: k.keyPrefix,
        mode: k.mode,
        status: k.status,
        lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
        createdAt: k.createdAt.toISOString(),
      }));
      const lastUsed = u.sellerApiKeys
        .map((k) => k.lastUsedAt)
        .filter((d): d is Date => Boolean(d))
        .sort((a, b) => b.getTime() - a.getTime())[0];
      return {
        id: u.id,
        username: u.username,
        email: u.email,
        name: u.name,
        role: u.role,
        apiEnabled: u.apiEnabled !== false,
        banned: u.banned,
        credentials,
        lastUsedAt: lastUsed?.toISOString() ?? null,
      };
    }),
  };
}
