import { jsonError, jsonOk } from "@/lib/api";
import { requireCustomer } from "@/lib/auth/customer";
import {
  createIssueReport,
  listEligibleDepositsForReport,
  listEligibleKeysForReport,
  listUserIssueReports,
} from "@/lib/issue-reports";
import { z } from "zod";

const createSchema = z.object({
  kind: z.enum(["KEY", "DEPOSIT", "GENERAL"]),
  explanation: z.string().trim().min(10).max(4000),
  screenshotUrl: z
    .string()
    .trim()
    .max(500)
    .regex(/^\/uploads\//, "Invalid screenshot path")
    .optional()
    .nullable(),
  depositId: z.string().optional().nullable(),
  orderId: z.string().optional().nullable(),
  keyId: z.string().optional().nullable(),
  subject: z.string().trim().max(120).optional().nullable(),
});

export async function GET(request: Request) {
  let user;
  try {
    user = await requireCustomer();
  } catch {
    return jsonError("UNAUTHORIZED", "Sign in required.", 401);
  }

  const url = new URL(request.url);
  const page = Number(url.searchParams.get("page") || "1");
  const limit = Number(url.searchParams.get("limit") || "15");

  if (url.searchParams.get("eligibleDeposits") === "1") {
    const deposits = await listEligibleDepositsForReport(user.id);
    return jsonOk({ deposits });
  }

  if (url.searchParams.get("eligibleKeys") === "1") {
    const keys = await listEligibleKeysForReport(user.id);
    return jsonOk({ keys });
  }

  const statusParam = url.searchParams.get("status");
  const status = statusParam === "open" || statusParam === "done" ? statusParam : undefined;
  const result = await listUserIssueReports(user.id, { page, limit, status });
  return jsonOk(result);
}

export async function POST(request: Request) {
  let user;
  try {
    user = await requireCustomer();
  } catch {
    return jsonError("UNAUTHORIZED", "Sign in required.", 401);
  }

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("VALIDATION", "Invalid report payload.", 400);
  }

  const result = await createIssueReport({
    userId: user.id,
    kind: parsed.data.kind,
    explanation: parsed.data.explanation,
    screenshotUrl: parsed.data.screenshotUrl,
    depositId: parsed.data.depositId,
    orderId: parsed.data.orderId,
    keyId: parsed.data.keyId,
    subject: parsed.data.subject,
  });

  if (!result.ok) {
    const status =
      result.code === "NOT_FOUND"
        ? 404
        : result.code === "CONFLICT"
          ? 409
          : 400;
    return jsonError(result.code, result.message, status);
  }

  return jsonOk({ report: result.report });
}
