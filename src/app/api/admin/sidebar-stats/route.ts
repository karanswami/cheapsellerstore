import { jsonError, jsonOk } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/admin";
import { getAdminSidebarStats } from "@/lib/sidebar-stats";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return jsonError("UNAUTHORIZED", "Admin required.", 401);
  }

  try {
    const stats = await getAdminSidebarStats();
    return jsonOk(stats);
  } catch (err) {
    console.error("[admin/sidebar-stats]", err);
    return jsonError("INTERNAL", "Failed to fetch admin sidebar stats.", 500);
  }
}
