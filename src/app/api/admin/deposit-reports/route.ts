import { jsonError, jsonOk } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/admin";
import { listAdminIssueReports } from "@/lib/issue-reports";

/** Legacy alias — prefer `/api/admin/issue-reports`. */
export async function GET(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return jsonError("UNAUTHORIZED", "Admin required.", 401);
  }

  const url = new URL(request.url);
  const page = Number(url.searchParams.get("page") || "1");
  const limit = Number(url.searchParams.get("limit") || "20");
  const result = await listAdminIssueReports({
    page,
    limit,
    status: "open",
    kind: "DEPOSIT",
  });
  return jsonOk({
    deposits: result.reports.map((r) => ({
      id: r.depositId ?? r.id,
      reportId: r.id,
      amount: r.deposit?.amount ?? 0,
      currency: "USD" as const,
      status: r.deposit?.status ?? r.status,
      adminNote: r.explanation,
      user: r.user ?? { name: "", email: "", username: "" },
    })),
    ...result,
  });
}
