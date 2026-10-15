import { jsonError, jsonOk } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth/customer";
import { assertUserCanManageApi } from "@/lib/seller-api/keys";
import {
  createUserWebhook,
  listUserWebhooks,
} from "@/lib/seller-api/webhooks";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return jsonError("UNAUTHORIZED", "Sign in required.", 401);
  const gate = await assertUserCanManageApi(user);
  if (!gate.ok) return jsonError(gate.code, gate.message, 403);
  return jsonOk({ webhooks: await listUserWebhooks(user.id) });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonError("UNAUTHORIZED", "Sign in required.", 401);
  const gate = await assertUserCanManageApi(user);
  if (!gate.ok) return jsonError(gate.code, gate.message, 403);

  let body: { url?: string; events?: string[] };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return jsonError("INVALID_BODY", "JSON required.", 400);
  }

  const result = await createUserWebhook({
    userId: user.id,
    url: body.url ?? "",
    events: body.events,
  });
  if (!result.ok) return jsonError(result.code, result.message, 400);
  return jsonOk({ webhook: result.webhook, secret: result.secret });
}
