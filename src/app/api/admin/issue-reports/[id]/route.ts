import { jsonError, jsonOk } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/admin";
import { updateIssueReportStatus } from "@/lib/issue-reports";
import { z } from "zod";

const schema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]),
  note: z.string().trim().max(500).optional().nullable(),
});

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return jsonError("UNAUTHORIZED", "Admin required.", 401);
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError("VALIDATION", "Invalid payload.", 400);

  const result = await updateIssueReportStatus(id, {
    status: parsed.data.status,
    adminNote: parsed.data.note,
    reviewedById: admin.id,
  });

  if (!result.ok) return jsonError(result.code, result.message, 404);
  return jsonOk({ report: result.report });
}
