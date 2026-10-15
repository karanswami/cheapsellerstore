import { jsonError, jsonOk } from "@/lib/api";
import {
  getStatisticsStats,
  type StatisticsPeriod,
} from "@/lib/admin-stats";
import { requireAdmin } from "@/lib/auth/admin";

function parsePeriod(raw: string | null): StatisticsPeriod {
  if (raw === "today" || raw === "7" || raw === "30" || raw === "90") return raw;
  return "today";
}

export async function GET(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return jsonError("UNAUTHORIZED", "Admin required.", 401);
  }

  const url = new URL(req.url);
  const period = parsePeriod(url.searchParams.get("period"));
  const data = await getStatisticsStats(period);
  return jsonOk(data);
}
