import { getSettingText, SETTING_KEYS } from "@/lib/settings";
import { cache } from "react";

const DEFAULT_BASE_URL = "https://licencedashboard.shop/api/v1";

function envText(name: string, fallback = "") {
  return process.env[name]?.trim() || fallback;
}

async function settingOrEnv(settingKey: string, envName: string, fallback = "") {
  const fromDb = (await getSettingText(settingKey, "")).trim();
  if (fromDb) return fromDb;
  return envText(envName, fallback);
}

export const getSupplierApiKey = cache(async (): Promise<string> => {
  const fromDb =
    (await getSettingText(SETTING_KEYS.supplierApiKey, "")).trim() ||
    (await getSettingText("api_token", "")).trim() ||
    (await getSettingText("api_token_vendor", "")).trim();
  if (fromDb) return fromDb;

  return (
    process.env.SUPPLIER_API_KEY?.trim() ||
    process.env.API_TOKEN_VENDOR?.trim() ||
    process.env.API_TOKEN?.trim() ||
    ""
  );
});

export const getSupplierApiBaseUrl = cache(async (): Promise<string> => {
  const value = await settingOrEnv(
    SETTING_KEYS.supplierApiBaseUrl,
    "SUPPLIER_API_BASE_URL",
    DEFAULT_BASE_URL,
  );
  return value.replace(/\/$/, "") || DEFAULT_BASE_URL;
});

export const isSupplierApiEnabled = cache(async (): Promise<boolean> => {
  const raw = (
    await getSettingText(SETTING_KEYS.supplierApiEnabled, "0")
  ).trim();
  if (raw === "1" || raw.toLowerCase() === "true") return true;
  return false;
});

export async function isSupplierConfigured(): Promise<boolean> {
  return Boolean(await getSupplierApiKey());
}

/** True when master switch is on, API key present, and duration has a product id. */
export async function isSupplierEligible(
  supplierProductId: number | null | undefined,
): Promise<boolean> {
  if (supplierProductId == null || !Number.isFinite(supplierProductId)) {
    return false;
  }
  if (!(await isSupplierApiEnabled())) return false;
  return isSupplierConfigured();
}

export function maskApiKey(key: string): string {
  const t = key.trim();
  if (!t) return "";
  if (t.length <= 8) return "••••••••";
  return `${t.slice(0, 4)}…${t.slice(-4)}`;
}

export async function getSupplierAdminSettings() {
  const [enabled, apiKey, baseUrl] = await Promise.all([
    isSupplierApiEnabled(),
    getSupplierApiKey(),
    getSupplierApiBaseUrl(),
  ]);
  return {
    enabled,
    configured: Boolean(apiKey),
    apiKeyMasked: maskApiKey(apiKey),
    hasApiKey: Boolean(apiKey),
    baseUrl,
  };
}
