import { jsonError, jsonOk } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/prisma";
import { KeyStatus } from "@prisma/client";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return jsonError("UNAUTHORIZED", "Admin required.", 401);
  }

  const [durations, statusCounts] = await Promise.all([
    prisma.duration.findMany({
      include: {
        product: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.key.groupBy({
      by: ["durationId", "status"],
      _count: { _all: true },
    }),
  ]);

  const byDuration = new Map<
    string,
    { available: number; sold: number; disabled: number; total: number }
  >();

  for (const row of statusCounts) {
    const cur = byDuration.get(row.durationId) ?? {
      available: 0,
      sold: 0,
      disabled: 0,
      total: 0,
    };
    const n = row._count._all;
    cur.total += n;
    if (row.status === KeyStatus.AVAILABLE) cur.available = n;
    else if (row.status === KeyStatus.SOLD) cur.sold = n;
    else if (row.status === KeyStatus.DISABLED) cur.disabled = n;
    byDuration.set(row.durationId, cur);
  }

  const rows = durations.map((d) => {
    const counts = byDuration.get(d.id) ?? {
      available: 0,
      sold: 0,
      disabled: 0,
      total: 0,
    };
    return {
      id: d.id,
      label: d.label,
      productId: d.product.id,
      productTitle: d.product.title,
      available: counts.available,
      sold: counts.sold,
      disabled: counts.disabled,
      total: counts.total,
    };
  });

  return jsonOk({ rows });
}
