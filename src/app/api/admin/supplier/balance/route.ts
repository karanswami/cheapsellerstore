import { jsonError, jsonOk } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/admin";
import { setCachedSupplierBalance } from "@/lib/supplier/catalog-cache";
import { getSupplierBalance } from "@/lib/supplier/client";
import { isSupplierConfigured } from "@/lib/supplier/config";

export async function GET() {
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

  const result = await getSupplierBalance();
  if (!result.ok) {
    return jsonError(
      result.errorCode.toUpperCase(),
      result.errorMessage,
      result.httpStatus >= 400 ? result.httpStatus : 502,
    );
  }

  await setCachedSupplierBalance(result.data);

  return jsonOk(result.data);
}
