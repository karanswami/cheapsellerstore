import { logActivity } from "@/lib/activity-log";
import { jsonError, jsonOk } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/admin";
import { usdToMicrocents } from "@/lib/currencies";
import { prisma } from "@/lib/prisma";
import { recordSpecialPriceHistory } from "@/lib/special-price-history";
import { z } from "zod";

const schema = z.object({
  userId: z.string().min(1),
  set: z
    .array(z.object({ durationId: z.string().min(1), priceUsd: z.number().finite().min(0) }))
    .max(500)
    .optional(),
  clear: z.array(z.string().min(1)).max(500).optional(),
  /** Remove every special price this user has. */
  clearAll: z.boolean().optional(),
});

/** Apply many special-price changes for one user in a single call. */
export async function POST(request: Request) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return jsonError("UNAUTHORIZED", "Admin required.", 401);
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return jsonError("VALIDATION", parsed.error.issues[0]?.message ?? "Invalid payload.", 400);
  }
  const { userId, set = [], clearAll } = parsed.data;

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, username: true } });
  if (!user) return jsonError("NOT_FOUND", "User not found.", 404);

  const existingAll = await prisma.userSpecialPrice.findMany({ where: { userId }, select: { durationId: true, price: true } });
  const existingMap = new Map(existingAll.map((e) => [e.durationId, e.price]));
  const clearIds = clearAll ? existingAll.map((e) => e.durationId) : (parsed.data.clear ?? []).filter((id) => existingMap.has(id));
  const setIds = new Set(set.map((s) => s.durationId));
  const touched = [...new Set([...setIds, ...clearIds])];

  const durations = await prisma.duration.findMany({
    where: { id: { in: touched } },
    select: { id: true, label: true, product: { select: { id: true, title: true } } },
  });
  const dMap = new Map(durations.map((d) => [d.id, d]));

  let saved = 0;
  let cleared = 0;
  for (const s of set) {
    const d = dMap.get(s.durationId);
    if (!d) continue;
    const price = usdToMicrocents(s.priceUsd);
    const prev = existingMap.get(s.durationId) ?? null;
    if (prev === price) continue;
    await prisma.userSpecialPrice.upsert({
      where: { userId_durationId: { userId, durationId: s.durationId } },
      create: { userId, durationId: s.durationId, price },
      update: { price },
    });
    recordSpecialPriceHistory({
      action: prev == null ? "SET" : "UPDATE",
      target: { userId, username: user.username, durationId: d.id, durationLabel: d.label, productId: d.product.id, productTitle: d.product.title },
      previousPrice: prev,
      newPrice: price,
      admin: { id: admin.id, username: admin.username },
    });
    saved++;
  }
  for (const id of clearIds) {
    if (setIds.has(id)) continue;
    const d = dMap.get(id);
    await prisma.userSpecialPrice.deleteMany({ where: { userId, durationId: id } });
    recordSpecialPriceHistory({
      action: "CLEAR",
      target: { userId, username: user.username, durationId: id, durationLabel: d?.label ?? null, productId: d?.product.id ?? null, productTitle: d?.product.title ?? null },
      previousPrice: existingMap.get(id) ?? null,
      newPrice: null,
      admin: { id: admin.id, username: admin.username },
    });
    cleared++;
  }

  if (saved || cleared) {
    logActivity({
      request,
      action: "SPECIAL_PRICE_BULK",
      category: "ADMIN",
      message: `Bulk special prices for @${user.username}: ${saved} saved, ${cleared} cleared`,
      user,
      metadata: { saved, cleared, byAdminId: admin.id, byAdmin: admin.username },
    });
  }
  return jsonOk({ saved, cleared });
}
