import { jsonError, jsonOk } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/prisma";

/** Dashboard numbers + users that currently hold special prices. */
export async function GET(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return jsonError("UNAUTHORIZED", "Admin required.", 401);
  }
  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";

  const rows = await prisma.userSpecialPrice.findMany({
    take: 5000,
    select: {
      userId: true,
      price: true,
      updatedAt: true,
      duration: { select: { prices: { where: { currency: "USD" }, take: 1, select: { price: true } } } },
    },
  });

  const perUser = new Map<string, { count: number; savedMc: number; last: Date }>();
  for (const r of rows) {
    const retail = r.duration.prices[0]?.price ?? null;
    const u = perUser.get(r.userId) ?? { count: 0, savedMc: 0, last: r.updatedAt };
    u.count++;
    if (retail && retail > 0) {
      u.savedMc += retail - r.price;
    }
    if (r.updatedAt > u.last) u.last = r.updatedAt;
    perUser.set(r.userId, u);
  }

  const users = await prisma.user.findMany({
    where: {
      id: { in: [...perUser.keys()] },
      ...(q
        ? { OR: [{ username: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] }
        : {}),
    },
    select: { id: true, username: true, email: true, role: true },
  });

  return jsonOk({
    stats: { total: rows.length, users: perUser.size },
    users: users
      .map((u) => ({ ...u, count: perUser.get(u.id)!.count, savedMc: perUser.get(u.id)!.savedMc, updatedAt: perUser.get(u.id)!.last.toISOString() }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 60),
  });
}
