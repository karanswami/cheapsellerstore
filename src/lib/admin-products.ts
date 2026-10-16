import "server-only";

import { prisma } from "@/lib/prisma";
import { KeyStatus } from "@prisma/client";

export type ArchiveOrDeleteProductResult =
  | {
      mode: "deleted";
      id: string;
      purgedAvailable: number;
    }
  | {
      mode: "archived";
      id: string;
      purgedAvailable: number;
      soldKeysKept: number;
    };

/**
 * Removes AVAILABLE (and DISABLED unused) stock, then either:
 * - hard-deletes the product when no sold history remains, or
 * - archives it (`isActive: false`) so SOLD keys + order history stay linked.
 */
export async function archiveOrDeleteProduct(
  productId: string,
): Promise<ArchiveOrDeleteProductResult> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true },
  });
  if (!product) throw new Error("NOT_FOUND");

  const durationIds = (
    await prisma.duration.findMany({
      where: { productId },
      select: { id: true },
    })
  ).map((d) => d.id);

  let purgedAvailable = 0;
  if (durationIds.length > 0) {
    const purged = await prisma.key.deleteMany({
      where: {
        durationId: { in: durationIds },
        status: { in: [KeyStatus.AVAILABLE, KeyStatus.DISABLED] },
      },
    });
    purgedAvailable = purged.count;
  }

  const soldKeysKept =
    durationIds.length === 0
      ? 0
      : await prisma.key.count({
          where: {
            durationId: { in: durationIds },
            status: KeyStatus.SOLD,
          },
        });

  const orderItemCount =
    durationIds.length === 0
      ? 0
      : await prisma.orderItem.count({
          where: { durationId: { in: durationIds } },
        });

  const hasHistory = soldKeysKept > 0 || orderItemCount > 0;

  if (hasHistory) {
    await prisma.product.update({
      where: { id: productId },
      data: { isActive: false, isPinned: false },
    });
    return {
      mode: "archived",
      id: productId,
      purgedAvailable,
      soldKeysKept,
    };
  }

  // Clean catalog row — no purchase history left.
  await prisma.$transaction([
    prisma.userSpecialPrice.deleteMany({
      where: { durationId: { in: durationIds } },
    }),
    prisma.productLike.deleteMany({ where: { productId } }),
    prisma.durationPrice.deleteMany({
      where: { durationId: { in: durationIds } },
    }),
    prisma.duration.deleteMany({ where: { productId } }),
    prisma.product.delete({ where: { id: productId } }),
  ]);

  return {
    mode: "deleted",
    id: productId,
    purgedAvailable,
  };
}
