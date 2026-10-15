import { jsonError, jsonOk } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth/customer";
import {
  assertUserCanManageApi,
  listUserApiPurchases,
} from "@/lib/seller-api/keys";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonError("UNAUTHORIZED", "Sign in required.", 401);
  const gate = await assertUserCanManageApi(user);
  if (!gate.ok) return jsonError(gate.code, gate.message, 403);

  const url = new URL(req.url);
  const page = Number(url.searchParams.get("page") ?? "1");
  const limit = Number(url.searchParams.get("limit") ?? "20");
  return jsonOk(await listUserApiPurchases({ userId: user.id, page, limit }));
}
