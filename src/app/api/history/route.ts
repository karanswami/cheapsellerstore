import { jsonError, jsonOk } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth/customer";
import { getUserActivityHistoryPage } from "@/lib/history";
import type { ActivityFilter } from "@/types/history";

function parseFilter(raw: string | null): ActivityFilter {
  if (raw === "order" || raw === "deposit" || raw === "wallet" || raw === "all") {
    return raw;
  }
  return "all";
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonError("UNAUTHORIZED", "Login required.", 401);

  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get("page") ?? "1");
  const limit = Number(searchParams.get("limit") ?? "20");
  const filter = parseFilter(searchParams.get("filter"));
  const q = searchParams.get("q") ?? undefined;

  if (!Number.isFinite(page) || page < 1) {
    return jsonError("VALIDATION_ERROR", "Invalid page.", 400);
  }
  if (!Number.isFinite(limit) || limit < 1 || limit > 50) {
    return jsonError("VALIDATION_ERROR", "Invalid limit.", 400);
  }

  const data = await getUserActivityHistoryPage(user.id, {
    page,
    limit,
    filter,
    q,
  });
  return jsonOk(data);
}
