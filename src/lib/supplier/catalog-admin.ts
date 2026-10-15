import { prisma } from "@/lib/prisma";
import type { SupplierCatalogItem } from "@/lib/supplier/client";
import type {
  SupplierCatalogDto,
  SupplierCatalogMappingDto,
  SupplierCatalogSummaryDto,
} from "@/types/admin-supplier";

export function summarizeSupplierCatalog(
  items: SupplierCatalogItem[],
  balance?: number | null,
): SupplierCatalogSummaryDto {
  const groupNames = new Set<string>();
  let inStock = 0;
  let outOfStock = 0;
  for (const item of items) {
    if (item.group_name?.trim()) groupNames.add(item.group_name.trim());
    const itemPrice = Number.parseFloat(item.price) || 0;
    const hasEnoughBalance =
      balance !== null && balance !== undefined
        ? balance > 0 && balance >= itemPrice
        : true;
    if (item.in_stock !== false && hasEnoughBalance) inStock += 1;
    else outOfStock += 1;
  }
  return {
    totalProducts: items.length,
    totalGroups: groupNames.size,
    inStock,
    outOfStock,
  };
}

export async function getSupplierCatalogMappings(): Promise<
  SupplierCatalogMappingDto[]
> {
  const rows = await prisma.duration.findMany({
    where: { supplierProductId: { not: null } },
    select: {
      id: true,
      label: true,
      supplierProductId: true,
      product: { select: { id: true, title: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return rows
    .filter((r) => r.supplierProductId != null)
    .map((r) => ({
      supplierProductId: r.supplierProductId as number,
      durationId: r.id,
      durationLabel: r.label,
      productId: r.product.id,
      productTitle: r.product.title,
    }));
}

export async function buildSupplierCatalogDto(
  items: SupplierCatalogItem[],
  fetchedAt: string | null,
  balance?: number | null,
): Promise<SupplierCatalogDto> {
  const [summary, mappings] = await Promise.all([
    Promise.resolve(summarizeSupplierCatalog(items, balance)),
    getSupplierCatalogMappings(),
  ]);
  return {
    items,
    fetchedAt,
    summary,
    mappings,
  };
}
