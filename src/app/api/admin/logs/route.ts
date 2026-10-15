import { jsonError, jsonOk } from "@/lib/api";
import { getActivityLogsPage } from "@/lib/activity-log";
import { requireAdmin } from "@/lib/auth/admin";
import { ACTIVITY_LOG_CATEGORIES } from "@/types/activity-log";

export async function GET(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return jsonError("UNAUTHORIZED", "Admin required.", 401);
  }

  const url = new URL(req.url);
  const page = Number(url.searchParams.get("page") ?? "1");
  const limit = Number(url.searchParams.get("limit") ?? "20");
  const q = url.searchParams.get("q")?.trim() ?? "";
  const rawCategory = url.searchParams.get("category")?.trim() ?? "all";
  const action = url.searchParams.get("action")?.trim() ?? "";
  const successRaw = url.searchParams.get("success")?.trim();

  const categorySet = new Set<string>(["all", ...ACTIVITY_LOG_CATEGORIES]);
  const category = categorySet.has(rawCategory) ? rawCategory : "all";

  let success: boolean | null = null;
  if (successRaw === "true") success = true;
  if (successRaw === "false") success = false;

  const data = await getActivityLogsPage({
    page: Number.isFinite(page) ? page : 1,
    limit: Number.isFinite(limit) ? limit : 20,
    category,
    action: action || null,
    q: q || null,
    success,
  });

  return jsonOk(data);
}
