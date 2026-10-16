import "server-only";

import { prisma } from "@/lib/prisma";

export type LikeState = { count: number; liked: boolean };

/** Like counts (+ whether `userId` liked) for a set of products, in two cheap queries. */
export async function getLikeStates(
  productIds: string[],
  userId?: string | null,
): Promise<Map<string, LikeState>> {
  const out = new Map<string, LikeState>(productIds.map((id) => [id, { count: 0, liked: false }]));
  if (productIds.length === 0) return out;
  try {
    const [groups, mine] = await Promise.all([
      prisma.productLike.groupBy({
        by: ["productId"],
        where: { productId: { in: productIds } },
        _count: { _all: true },
      }),
      userId
        ? prisma.productLike.findMany({
            where: { userId, productId: { in: productIds } },
            select: { productId: true },
          })
        : Promise.resolve([]),
    ]);
    for (const g of groups) out.get(g.productId)!.count = g._count._all;
    for (const m of mine) out.get(m.productId)!.liked = true;
  } catch (error) {
    console.error("LIKE_STATES_FAILED", error);
  }
  return out;
}

/** Flip the like and return the fresh state. */
export async function toggleLike(productId: string, userId: string): Promise<LikeState> {
  const removed = await prisma.productLike.deleteMany({ where: { productId, userId } });
  if (removed.count === 0) {
    await prisma.productLike.create({ data: { productId, userId } });
  }
  const count = await prisma.productLike.count({ where: { productId } });
  return { count, liked: removed.count === 0 };
}
