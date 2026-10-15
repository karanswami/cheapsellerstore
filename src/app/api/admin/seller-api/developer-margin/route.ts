import { jsonError, jsonOk } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/admin";
import {
  getApiDeveloperMargins,
  markApiDeveloperMarginsPaid,
} from "@/lib/seller-api/developer-margin";

export async function GET(req: Request) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return jsonError("UNAUTHORIZED", "Admin only.", 401);
  }
  void admin;

  const url = new URL(req.url);
  const page = Number(url.searchParams.get("page") ?? "1");
  const q = url.searchParams.get("q") ?? undefined;
  return jsonOk(await getApiDeveloperMargins({ page, q }));
}

export async function POST(req: Request) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return jsonError("UNAUTHORIZED", "Admin only.", 401);
  }

  let body: { dateKeys?: string[]; note?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return jsonError("INVALID_BODY", "JSON required.", 400);
  }

  const result = await markApiDeveloperMarginsPaid({
    dateKeys: body.dateKeys ?? [],
    paidById: admin.id,
    note: body.note,
  });
  if (!result.ok) return jsonError(result.code, result.message, 400);
  return jsonOk({ marked: result.marked });
}
