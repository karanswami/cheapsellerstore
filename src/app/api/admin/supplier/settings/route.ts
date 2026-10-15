import { jsonError, jsonOk } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/admin";
import { getSupplierAdminSettings } from "@/lib/supplier/config";
import { upsertSetting, SETTING_KEYS } from "@/lib/settings";
import { z } from "zod";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return jsonError("UNAUTHORIZED", "Admin required.", 401);
  }
  const settings = await getSupplierAdminSettings();
  return jsonOk(settings);
}

const patchSchema = z.object({
  enabled: z.boolean().optional(),
  apiKey: z.string().optional(),
  baseUrl: z.string().url().optional().or(z.literal("")),
  /** When true and apiKey empty, clear stored key. */
  clearApiKey: z.boolean().optional(),
});

export async function PATCH(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return jsonError("UNAUTHORIZED", "Admin required.", 401);
  }

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("VALIDATION", "Invalid supplier settings.", 400);
  }

  if (parsed.data.enabled !== undefined) {
    await upsertSetting({
      key: SETTING_KEYS.supplierApiEnabled,
      textValue: parsed.data.enabled ? "1" : "0",
    });
  }

  if (parsed.data.clearApiKey) {
    await upsertSetting({
      key: SETTING_KEYS.supplierApiKey,
      textValue: "",
    });
  } else if (parsed.data.apiKey !== undefined) {
    const key = parsed.data.apiKey.trim();
    if (key) {
      await upsertSetting({
        key: SETTING_KEYS.supplierApiKey,
        textValue: key,
      });
    }
  }

  if (parsed.data.baseUrl !== undefined) {
    const url = parsed.data.baseUrl.trim().replace(/\/$/, "");
    await upsertSetting({
      key: SETTING_KEYS.supplierApiBaseUrl,
      textValue: url || null,
    });
  }

  const settings = await getSupplierAdminSettings();
  return jsonOk(settings);
}
