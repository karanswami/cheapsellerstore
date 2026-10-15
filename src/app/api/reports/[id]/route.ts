import { jsonError, jsonOk } from "@/lib/api";
import { requireCustomer } from "@/lib/auth/customer";
import { getUserIssueReport } from "@/lib/issue-reports";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  let user;
  try {
    user = await requireCustomer();
  } catch {
    return jsonError("UNAUTHORIZED", "Sign in required.", 401);
  }

  const { id } = await params;
  const report = await getUserIssueReport(user.id, id);
  if (!report) return jsonError("NOT_FOUND", "Report not found.", 404);
  return jsonOk({ report });
}
