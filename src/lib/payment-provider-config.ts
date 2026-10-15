import { getSettingText, SETTING_KEYS } from "@/lib/settings";
import { cache } from "react";

/** Deposit rail credentials — DB (admin Settings) first, env fallback. */

function envText(name: string, fallback = "") {
  return process.env[name]?.trim() || fallback;
}

async function settingOrEnv(settingKey: string, envName: string, fallback = "") {
  const fromDb = (await getSettingText(settingKey, "")).trim();
  if (fromDb) return fromDb;
  return envText(envName, fallback);
}

export const getBinanceApiKey = cache(async (): Promise<string> =>
  settingOrEnv(SETTING_KEYS.binanceApiKey, "BINANCE_API_KEY"),
);

export const getBinanceSecretKey = cache(async (): Promise<string> =>
  settingOrEnv(SETTING_KEYS.binanceSecretKey, "BINANCE_SECRET_KEY"),
);

export const getBinancePayId = cache(async (): Promise<string> =>
  settingOrEnv(SETTING_KEYS.binancePayId, "BINANCE_PAY_ID"),
);

export async function isBinanceConfigured(): Promise<boolean> {
  const [apiKey, secretKey] = await Promise.all([
    getBinanceApiKey(),
    getBinanceSecretKey(),
  ]);
  return Boolean(apiKey && secretKey);
}

export const getAutogopayApiKey = cache(async (): Promise<string> => {
  const fromDb = (
    await getSettingText(SETTING_KEYS.autogopayApiKey, "")
  ).trim();
  if (fromDb) return fromDb;
  return process.env.AUTOGOPAY_API_KEY?.trim() || "";
});

export const getAutogopayBaseUrl = cache(async (): Promise<string> => {
  const fromDb = (
    await getSettingText(SETTING_KEYS.autogopayBaseUrl, "")
  ).trim();
  const value =
    fromDb ||
    process.env.AUTOGOPAY_BASE_URL?.trim() ||
    "https://v1-gateway.autogopay.site";
  return value.trim().replace(/\/$/, "");
});

export async function isAutogopayConfigured(): Promise<boolean> {
  return Boolean(await getAutogopayApiKey());
}

/** @deprecated RamaShop is decommissioned. Use AutoGoPay. */
export const getRamashopApiKey = cache(async (): Promise<string> =>
  settingOrEnv(SETTING_KEYS.ramashopApiKey, "RAMASHOP_API_KEY"),
);

/** @deprecated RamaShop is decommissioned. Use AutoGoPay. */
export const getRamashopBaseUrl = cache(async (): Promise<string> => {
  const value = await settingOrEnv(
    SETTING_KEYS.ramashopBaseUrl,
    "RAMASHOP_BASE_URL",
    "https://ramashop.my.id/api/public",
  );
  return value.replace(/\/$/, "");
});

/** @deprecated RamaShop is decommissioned. Use AutoGoPay. */
export async function isRamashopConfigured(): Promise<boolean> {
  return Boolean(await getRamashopApiKey());
}

/** @deprecated MGCloudPay is decommissioned. Use AutoGoPay. */
export const getMgcloudpayApiKey = cache(async (): Promise<string> =>
  settingOrEnv(SETTING_KEYS.mgcloudpayApiKey, "MGCLOUDPAY_API_KEY"),
);

/** @deprecated MGCloudPay is decommissioned. Use AutoGoPay. */
export const getMgcloudpayBaseUrl = cache(async (): Promise<string> => {
  const value = await settingOrEnv(
    SETTING_KEYS.mgcloudpayBaseUrl,
    "MGCLOUDPAY_BASE_URL",
    "https://app.mgcloudpay.my.id",
  );
  return value.replace(/\/$/, "");
});

/** @deprecated MGCloudPay is decommissioned. Use AutoGoPay. */
export async function isMgcloudpayConfigured(): Promise<boolean> {
  return Boolean(await getMgcloudpayApiKey());
}

export const getFamgatewayApiKey = cache(async (): Promise<string> =>
  settingOrEnv(SETTING_KEYS.famgatewayApiKey, "FAMGATEWAY_API_KEY"),
);

export const getFamgatewayBaseUrl = cache(async (): Promise<string> => {
  const value = await settingOrEnv(
    SETTING_KEYS.famgatewayBaseUrl,
    "FAMGATEWAY_BASE_URL",
    "https://famgateway.in",
  );
  return value.replace(/\/$/, "");
});

export async function isFamgatewayConfigured(): Promise<boolean> {
  return Boolean(await getFamgatewayApiKey());
}

export const getCashfreeAppId = cache(async (): Promise<string> =>
  settingOrEnv(SETTING_KEYS.cashfreeAppId, "CASHFREE_APP_ID"),
);

export const getCashfreeSecretKey = cache(async (): Promise<string> =>
  settingOrEnv(SETTING_KEYS.cashfreeSecretKey, "CASHFREE_SECRET_KEY"),
);

export const getCashfreeWebhookSecret = cache(async (): Promise<string> =>
  settingOrEnv(SETTING_KEYS.cashfreeWebhookSecret, "CASHFREE_WEBHOOK_SECRET"),
);

export type CashfreeEnvMode = "sandbox" | "production";

export const getCashfreeEnv = cache(async (): Promise<CashfreeEnvMode> => {
  const raw = (
    await settingOrEnv(SETTING_KEYS.cashfreeEnv, "CASHFREE_ENV", "sandbox")
  ).toLowerCase();
  return raw === "production" ? "production" : "sandbox";
});

export async function isCashfreeConfigured(): Promise<boolean> {
  const [appId, secretKey] = await Promise.all([
    getCashfreeAppId(),
    getCashfreeSecretKey(),
  ]);
  return Boolean(appId && secretKey);
}

export async function requireConfigured(
  value: string,
  label: string,
): Promise<string> {
  if (!value.trim()) {
    throw new Error(`${label} is not configured.`);
  }
  return value.trim();
}
