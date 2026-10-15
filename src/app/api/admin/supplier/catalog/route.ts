import { jsonError, jsonOk } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/admin";
import { buildSupplierCatalogDto } from "@/lib/supplier/catalog-admin";
import {
  getCachedSupplierCatalog,
  setCachedSupplierCatalog,
} from "@/lib/supplier/catalog-cache";
import { getSupplierCatalog } from "@/lib/supplier/client";
import { isSupplierConfigured } from "@/lib/supplier/config";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return jsonError("UNAUTHORIZED", "Admin required.", 401);
  }

  const [cached, balanceCache] = await Promise.all([
    getCachedSupplierCatalog(),
    import("@/lib/supplier/catalog-cache").then((m) =>
      m.getCachedSupplierBalance(),
    ),
  ]);
  return jsonOk(
    await buildSupplierCatalogDto(
      cached?.items ?? [],
      cached?.fetchedAt ?? null,
      balanceCache?.balance ?? null,
    ),
  );
}

export async function POST() {
  try {
    await requireAdmin();
  } catch {
    return jsonError("UNAUTHORIZED", "Admin required.", 401);
  }

  if (!(await isSupplierConfigured())) {
    return jsonError(
      "NOT_CONFIGURED",
      "Set a supplier API key in Supplier settings first.",
      400,
    );
  }

  const result = await getSupplierCatalog();
  if (!result.ok) {
    return jsonError(
      result.errorCode.toUpperCase(),
      result.errorMessage,
      result.httpStatus >= 400 ? result.httpStatus : 502,
    );
  }

  const [cached, balanceCache] = await Promise.all([
    setCachedSupplierCatalog(result.data),
    import("@/lib/supplier/catalog-cache").then((m) =>
      m.getCachedSupplierBalance(),
    ),
  ]);
  return jsonOk(
    await buildSupplierCatalogDto(
      cached.items,
      cached.fetchedAt,
      balanceCache?.balance ?? null,
    ),
  );
}
