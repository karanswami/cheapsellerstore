import { jsonError, jsonOk } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/admin";
import {
  getDeveloperSettlements,
  markDeveloperSettlementsPaid,
} from "@/lib/developer-settlements";
import { z } from "zod";

export async function GET(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return jsonError("UNAUTHORIZED", "Admin required.", 401);
  }

  const url = new URL(req.url);
  const page = Number(url.searchParams.get("page") ?? "1");
  const q = url.searchParams.get("q") ?? "";
  const data = await getDeveloperSettlements({
    page: Number.isFinite(page) ? page : 1,
    q,
  });
  return jsonOk(data);
}

const markSchema = z.object({
  dateKeys: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).min(1).max(90),
});

export async function POST(req: Request) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return jsonError("UNAUTHORIZED", "Admin required.", 401);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("BAD_REQUEST", "Invalid JSON.", 400);
  }

  const parsed = markSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("VALIDATION", "Select at least one valid day.", 400);
  }

  const result = await markDeveloperSettlementsPaid({
    dateKeys: parsed.data.dateKeys,
    adminId: admin.id,
  });

  if (result.updated === 0) {
    return jsonError("NOT_FOUND", "No valid settlement days to mark.", 404);
  }

  return jsonOk(result);
}
