import { jsonError, jsonOk } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/admin";
import { getSpecialPriceHistoryPage } from "@/lib/special-price-history";
import { SPECIAL_PRICE_HISTORY_ACTIONS } from "@/types/special-price-history";

/**
 * Paginated special-price audit history.
 * Optional filters: `userId`, `action` (SET|UPDATE|CLEAR), `q`, `page`, `limit`.
 */
export async function GET(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return jsonError("UNAUTHORIZED", "Admin required.", 401);
  }

  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get("page") ?? "1") || 1;
  const limit = Number(searchParams.get("limit") ?? "20") || 20;
  const userId = searchParams.get("userId")?.trim() || null;
  const q = searchParams.get("q")?.trim() || null;
  const actionRaw = searchParams.get("action")?.trim().toUpperCase() || null;
  const action =
    actionRaw &&
    SPECIAL_PRICE_HISTORY_ACTIONS.includes(
      actionRaw as (typeof SPECIAL_PRICE_HISTORY_ACTIONS)[number],
    )
      ? actionRaw
      : null;

  const data = await getSpecialPriceHistoryPage({
    page,
    limit,
    userId,
    q,
    action,
  });

  return jsonOk(data);
}
