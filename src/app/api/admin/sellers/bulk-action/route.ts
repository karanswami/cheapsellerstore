import { jsonError, jsonOk } from "@/lib/api";
import {
  BulkSellersActionPayloadSchema,
  BulkSellersTargetSchema,
  executeBulkSellersAction,
  getBulkSellersStats,
} from "@/lib/admin-bulk-sellers";
import { requireAdmin } from "@/lib/auth/admin";

export async function GET(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return jsonError("UNAUTHORIZED", "Admin login required.", 401);
  }

  const { searchParams } = new URL(request.url);
  const rawTarget = searchParams.get("target") || "SELLERS";
  const parsedTarget = BulkSellersTargetSchema.safeParse(rawTarget);
  const target = parsedTarget.success ? parsedTarget.data : "SELLERS";

  try {
    const stats = await getBulkSellersStats(target);
    return jsonOk({ stats });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to fetch stats";
    return jsonError("INTERNAL_ERROR", msg, 500);
  }
}

export async function POST(request: Request) {
  let adminUser;
  try {
    adminUser = await requireAdmin();
  } catch {
    return jsonError("UNAUTHORIZED", "Admin login required.", 401);
  }

  const body = await request.json().catch(() => null);
  const parsed = BulkSellersActionPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      "VALIDATION",
      parsed.error.issues[0]?.message ?? "Invalid payload.",
      400,
    );
  }

  try {
    const result = await executeBulkSellersAction({
      payload: parsed.data,
      adminUser: {
        id: adminUser.id,
        username: adminUser.username,
        email: adminUser.email,
      },
      request,
    });

    return jsonOk(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Bulk action execution failed.";
    return jsonError("EXECUTION_FAILED", msg, 500);
  }
}
