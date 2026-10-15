import { jsonError, jsonOk } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth/customer";
import { assertUserCanManageApi } from "@/lib/seller-api/keys";
import { deleteUserWebhook } from "@/lib/seller-api/webhooks";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_req: Request, ctx: Ctx) {
  const user = await getCurrentUser();
  if (!user) return jsonError("UNAUTHORIZED", "Sign in required.", 401);
  const gate = await assertUserCanManageApi(user);
  if (!gate.ok) return jsonError(gate.code, gate.message, 403);
  const { id } = await ctx.params;
  const result = await deleteUserWebhook(user.id, id);
  if (!result.ok) return jsonError(result.code, result.message, 404);
  return jsonOk({ ok: true });
}
