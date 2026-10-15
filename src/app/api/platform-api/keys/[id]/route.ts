import { jsonError, jsonOk } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth/customer";
import {
  assertUserCanManageApi,
  revokeUserApiKey,
  rotateUserApiKey,
} from "@/lib/seller-api/keys";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const user = await getCurrentUser();
  if (!user) return jsonError("UNAUTHORIZED", "Sign in required.", 401);
  const gate = await assertUserCanManageApi(user);
  if (!gate.ok) return jsonError(gate.code, gate.message, 403);

  const { id } = await ctx.params;
  let body: { action?: string };
  try {
    body = (await req.json()) as { action?: string };
  } catch {
    return jsonError("INVALID_BODY", "JSON required.", 400);
  }

  if (body.action === "rotate") {
    const result = await rotateUserApiKey(user.id, id);
    if (!result.ok) return jsonError(result.code, result.message, 400);
    return jsonOk({ key: result.key, secret: result.secret });
  }

  if (body.action === "revoke") {
    const result = await revokeUserApiKey(user.id, id);
    if (!result.ok) return jsonError(result.code, result.message, 404);
    return jsonOk({ ok: true });
  }

  return jsonError("INVALID_ACTION", "action must be rotate or revoke.", 400);
}
