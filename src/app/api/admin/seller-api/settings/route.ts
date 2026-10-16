import { jsonError, jsonOk } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/admin";
import {
  getPlatformApiSettings,
  savePlatformApiSettings,
  type ApiAllowedRoles,
} from "@/lib/seller-api/settings";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return jsonError("UNAUTHORIZED", "Admin only.", 401);
  }
  return jsonOk(await getPlatformApiSettings());
}

export async function PATCH(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return jsonError("UNAUTHORIZED", "Admin only.", 401);
  }

  let body: {
    platformEnabled?: boolean;
    allowedRoles?: ApiAllowedRoles;
    defaultRateLimitRpm?: number;
    burstLimit?: number;
    maxKeysPerUser?: number;
    sandboxEnabled?: boolean;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return jsonError("INVALID_BODY", "JSON required.", 400);
  }

  const data = await savePlatformApiSettings(body);
  return jsonOk(data);
}
