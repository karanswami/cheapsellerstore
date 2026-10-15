import { prisma } from "@/lib/prisma";
import { KeyStatus, OrderStatus } from "@prisma/client";

/**
 * Atomically claim one AVAILABLE key for a duration.
 * Returns null if stock is gone (race / sold out).
 */
export async function claimKey(durationId: string, orderId: string) {
  const available = await prisma.key.findFirst({
    where: { durationId, status: KeyStatus.AVAILABLE },
    select: { id: true },
  });

  if (!available) return null;

  const result = await prisma.key.updateMany({
    where: { id: available.id, status: KeyStatus.AVAILABLE },
    data: {
      status: KeyStatus.SOLD,
      soldAt: new Date(),
      orderId,
    },
  });

  if (result.count === 0) return null;

  return prisma.key.findUnique({ where: { id: available.id } });
}

export async function countAvailableKeys(durationId: string) {
  return prisma.key.count({
    where: { durationId, status: KeyStatus.AVAILABLE },
  });
}

/** Available counts for many durations (one query). Missing ids → 0. */
export async function countAvailableKeysByDuration(
  durationIds: string[],
): Promise<Map<string, number>> {
  const isObjectId = (id: string) => /^[a-f\d]{24}$/i.test(id);
  const unique = [...new Set(durationIds.filter(Boolean))];
  const map = new Map<string, number>(unique.map((id) => [id, 0]));
  const validObjectIds = unique.filter((id) => isObjectId(id));
  if (validObjectIds.length === 0) return map;

  const rows = await prisma.key.groupBy({
    by: ["durationId"],
    where: { durationId: { in: validObjectIds }, status: KeyStatus.AVAILABLE },
    _count: { _all: true },
  });

  for (const row of rows) {
    map.set(row.durationId, row._count._all);
  }
  return map;
}

/** Release a claimed key back to AVAILABLE (API fulfill rollback). */
export async function releaseKey(keyId: string) {
  await prisma.key.updateMany({
    where: { id: keyId, status: KeyStatus.SOLD },
    data: {
      status: KeyStatus.AVAILABLE,
      soldAt: null,
      orderId: null,
    },
  });
}

/** Release every SOLD key still linked to an order (checkout / API rollback). */
export async function releaseKeysForOrder(orderId: string) {
  await prisma.key.updateMany({
    where: { orderId, status: KeyStatus.SOLD },
    data: {
      status: KeyStatus.AVAILABLE,
      soldAt: null,
      orderId: null,
    },
  });
}

/**
 * Return SOLD keys stuck on FAILED orders to AVAILABLE.
 * Fixes stock leaks from older checkout rollbacks that did not release claims.
 */
export async function releaseOrphanedSoldKeys() {
  const failed = await prisma.order.findMany({
    where: { status: OrderStatus.FAILED },
    select: { id: true },
  });
  if (failed.length === 0) return 0;

  const result = await prisma.key.updateMany({
    where: {
      orderId: { in: failed.map((o) => o.id) },
      status: KeyStatus.SOLD,
    },
    data: {
      status: KeyStatus.AVAILABLE,
      soldAt: null,
      orderId: null,
    },
  });
  return result.count;
}
