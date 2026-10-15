import { jsonError, jsonOk } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth/customer";
import {
  assertUserCanManageApi,
  createUserApiKey,
  getUserActiveCredentials,
} from "@/lib/seller-api/keys";
import { API_SCOPES } from "@/lib/seller-api/auth";
import type { SellerApiKeyMode } from "@prisma/client";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return jsonError("UNAUTHORIZED", "Sign in required.", 401);
  const gate = await assertUserCanManageApi(user);
  if (!gate.ok) return jsonError(gate.code, gate.message, 403);
  const credentials = await getUserActiveCredentials(user.id);
  return jsonOk({
    credentials,
    scopes: API_SCOPES,
  });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonError("UNAUTHORIZED", "Sign in required.", 401);
  const gate = await assertUserCanManageApi(user);
  if (!gate.ok) return jsonError(gate.code, gate.message, 403);

  let body: {
    name?: string;
    mode?: string;
    scopes?: string[];
    ipAllowlist?: string[];
    rateLimitRpm?: number | null;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return jsonError("INVALID_BODY", "JSON required.", 400);
  }

  const mode = (body.mode === "SANDBOX" ? "SANDBOX" : "LIVE") as SellerApiKeyMode;
  const result = await createUserApiKey({
    userId: user.id,
    name: body.name?.trim() || "API Key",
    mode,
    scopes: body.scopes ?? [...API_SCOPES],
    ipAllowlist: body.ipAllowlist,
    rateLimitRpm: body.rateLimitRpm,
  });

  if (!result.ok) return jsonError(result.code, result.message, 400);
  return jsonOk({ key: result.key, secret: result.secret });
}
