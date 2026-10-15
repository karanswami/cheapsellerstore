import { countAvailableKeysByDuration } from "@/lib/keys";
import { prisma } from "@/lib/prisma";
import { getSupplierStockInfoMap } from "@/lib/supplier/catalog-cache";
import {
  isSupplierApiEnabled,
  isSupplierConfigured,
} from "@/lib/supplier/config";

/** Extra virtual units when supplier can fulfill (cart/checkout must not block). */
export const SUPPLIER_VIRTUAL_STOCK = 999_999;

/**
 * Effective sellable stock: local AVAILABLE + supplier units when eligible.
 * For durations with no supplier (direct upload), returns pure local AVAILABLE count.
 */
export async function getEffectiveStockByDuration(
  durationIds: string[],
): Promise<Map<string, number>> {
  const unique = [...new Set(durationIds.filter(Boolean))];
  const local = await countAvailableKeysByDuration(unique);
  const map = new Map<string, number>(
    unique.map((id) => [id, local.get(id) ?? 0]),
  );

  if (unique.length === 0) return map;

  const [enabled, configured] = await Promise.all([
    isSupplierApiEnabled(),
    isSupplierConfigured(),
  ]);
  if (!enabled || !configured) return map;

  const durations = await prisma.duration.findMany({
    where: {
      id: { in: unique },
      supplierProductId: { not: null },
    },
    select: { id: true, supplierProductId: true },
  });
  if (durations.length === 0) return map;

  const stockInfoMap = await getSupplierStockInfoMap();

  for (const d of durations) {
    const pid = d.supplierProductId;
    if (pid == null) continue;

    const supplierInfo = stockInfoMap.get(pid);
    if (supplierInfo) {
      if (
        !supplierInfo.inStock ||
        (supplierInfo.stockCount != null && supplierInfo.stockCount <= 0)
      ) {
        // Supplier is out of stock -> stock is purely local available keys
        continue;
      }
      if (supplierInfo.stockCount != null && supplierInfo.stockCount > 0) {
        // Supplier provided explicit stock count
        map.set(d.id, (map.get(d.id) ?? 0) + supplierInfo.stockCount);
        continue;
      }
    }

    // Default when supplier item is in stock (or catalog not yet indexed): add virtual stock
    map.set(d.id, (map.get(d.id) ?? 0) + SUPPLIER_VIRTUAL_STOCK);
  }

  return map;
}
