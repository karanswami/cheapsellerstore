import { jsonError, jsonOk } from "@/lib/api";
import { getCronOverview } from "@/lib/admin-cron";
import { requireAdmin } from "@/lib/auth/admin";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return jsonError("UNAUTHORIZED", "Admin required.", 401);
  }

  return jsonOk(await getCronOverview());
}
