import { jsonError, jsonOk } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/admin";
import { listAdminIssueReports } from "@/lib/issue-reports";
import type { IssueReportKind, IssueReportStatus } from "@prisma/client";

export async function GET(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return jsonError("UNAUTHORIZED", "Admin required.", 401);
  }

  const url = new URL(request.url);
  const page = Number(url.searchParams.get("page") || "1");
  const limit = Number(url.searchParams.get("limit") || "20");
  const statusParam = url.searchParams.get("status") || "open";
  const kindParam = url.searchParams.get("kind") || "ALL";
  const q = url.searchParams.get("q") || undefined;

  const status =
    statusParam === "ALL" ||
    statusParam === "open" ||
    statusParam === "OPEN" ||
    statusParam === "IN_PROGRESS" ||
    statusParam === "RESOLVED" ||
    statusParam === "CLOSED"
      ? (statusParam as IssueReportStatus | "open" | "ALL")
      : "open";

  const kind =
    kindParam === "KEY" || kindParam === "DEPOSIT" || kindParam === "GENERAL" || kindParam === "ALL"
      ? (kindParam as IssueReportKind | "ALL")
      : "ALL";

  const result = await listAdminIssueReports({
    page,
    limit,
    status,
    kind,
    q,
  });
  return jsonOk(result);
}
