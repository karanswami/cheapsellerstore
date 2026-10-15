import { jsonError, jsonOk } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/admin";
import {
  getSpecialInventoryData,
  importSpecialInventoryKeys,
} from "@/lib/special-inventory";
import { z } from "zod";

export async function GET(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return jsonError("UNAUTHORIZED", "Admin required.", 401);
  }

  const url = new URL(req.url);
  const page = Number(url.searchParams.get("page") ?? "1");
  const limit = Number(url.searchParams.get("limit") ?? "30");
  const q = url.searchParams.get("q") ?? "";
  const statusParam = url.searchParams.get("status") ?? "all";
  const productId = url.searchParams.get("productId") ?? "";

  const status =
    statusParam === "AVAILABLE" || statusParam === "SOLD"
      ? statusParam
      : "all";

  const data = await getSpecialInventoryData({
    page: Number.isFinite(page) ? page : 1,
    limit: Number.isFinite(limit) ? limit : 30,
    q,
    status,
    productId,
  });

  return jsonOk(data);
}

const importSchema = z.object({
  durationId: z.string().min(1, "Duration is required"),
  rawKeys: z.string().min(1, "Keys are required"),
  batchTag: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return jsonError("UNAUTHORIZED", "Admin required.", 401);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("BAD_REQUEST", "Invalid JSON body.", 400);
  }

  const parsed = importSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      "VALIDATION",
      parsed.error.issues[0]?.message ?? "Invalid payload",
      400,
    );
  }

  const result = await importSpecialInventoryKeys({
    durationId: parsed.data.durationId,
    rawKeys: parsed.data.rawKeys,
    batchTag: parsed.data.batchTag,
  });

  return jsonOk(result);
}
