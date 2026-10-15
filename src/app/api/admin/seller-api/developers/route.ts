import { jsonError, jsonOk } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/admin";
import {
  listAdminApiDevelopers,
  type AdminDeveloperStatusFilter,
} from "@/lib/seller-api/admin-developers";

export async function GET(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return jsonError("UNAUTHORIZED", "Admin only.", 401);
  }

  const url = new URL(req.url);
  const page = Number(url.searchParams.get("page") ?? "1");
  const limit = Number(url.searchParams.get("limit") ?? "20");
  const q = url.searchParams.get("q") ?? undefined;
  const statusRaw = url.searchParams.get("status") ?? "all";
  const status = (
    ["all", "active", "none", "disabled"].includes(statusRaw)
      ? statusRaw
      : "all"
  ) as AdminDeveloperStatusFilter;

  return jsonOk(await listAdminApiDevelopers({ page, limit, q, status }));
}
