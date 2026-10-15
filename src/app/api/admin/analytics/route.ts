import { jsonError, jsonOk } from "@/lib/api";
import { getAnalyticsStats } from "@/lib/admin-stats";
import { requireAdmin } from "@/lib/auth/admin";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return jsonError("UNAUTHORIZED", "Admin required.", 401);
  }

  const data = await getAnalyticsStats();
  return jsonOk(data);
}
