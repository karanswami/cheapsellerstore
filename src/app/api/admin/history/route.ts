import { jsonError, jsonOk } from "@/lib/api";
import {
  getHistoryEvents,
  type AdminHistoryKind,
} from "@/lib/admin-stats";
import { requireAdmin } from "@/lib/auth/admin";

const KINDS = new Set<AdminHistoryKind | "all">([
  "all",
  "order",
  "deposit",
  "transaction",
  "key",
  "reseller",
]);

export async function GET(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return jsonError("UNAUTHORIZED", "Admin required.", 401);
  }

  const url = new URL(req.url);
  const rawKind = url.searchParams.get("kind") ?? "all";
  const kind = KINDS.has(rawKind as AdminHistoryKind | "all")
    ? (rawKind as AdminHistoryKind | "all")
    : "all";
  const page = Number(url.searchParams.get("page") ?? "1");
  const limit = Number(url.searchParams.get("limit") ?? "15");
  const q = url.searchParams.get("q")?.trim() ?? "";

  const data = await getHistoryEvents({
    kind,
    page: Number.isFinite(page) ? page : 1,
    limit: Number.isFinite(limit) ? limit : 15,
    q: q || undefined,
  });

  return jsonOk(data);
}
