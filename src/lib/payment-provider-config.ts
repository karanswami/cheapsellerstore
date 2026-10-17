import { getSettingText, SETTING_KEYS } from "@/lib/settings";
import { cache } from "react";
import { gatewayCred } from "@/lib/gateway-context";

/** Deposit rail credentials — DB (admin Settings) first, env fallback. */

function envText(name: string, fallback = "") {
  return process.env[name]?.trim() || fallback;
}

async function settingOrEnv(settingKey: string, envName: string, fallback = "") {
  const fromDb = (await getSettingText(settingKey, "")).trim();
  if (fromDb) return fromDb;
  return envText(envName, fallback);
}

const base_getBinanceApiKey = cache(async (): Promise<string> =>
  settingOrEnv(SETTING_KEYS.binanceApiKey, "BINANCE_API_KEY"),
);

export const getBinanceApiKey = async (): Promise<string> => gatewayCred("binanceApiKey") ?? (await base_getBinanceApiKey());

const base_getBinanceSecretKey = cache(async (): Promise<string> =>
  settingOrEnv(SETTING_KEYS.binanceSecretKey, "BINANCE_SECRET_KEY"),
);

export const getBinanceSecretKey = async (): Promise<string> => gatewayCred("binanceSecretKey") ?? (await base_getBinanceSecretKey());

const base_getBinancePayId = cache(async (): Promise<string> =>
  settingOrEnv(SETTING_KEYS.binancePayId, "BINANCE_PAY_ID"),
);

export const getBinancePayId = async (): Promise<string> => gatewayCred("binancePayId") ?? (await base_getBinancePayId());

export async function isBinanceConfigured(): Promise<boolean> {
  const [apiKey, secretKey] = await Promise.all([
    getBinanceApiKey(),
    getBinanceSecretKey(),
  ]);
  return Boolean(apiKey && secretKey);
}

const base_getAutogopayApiKey = cache(async (): Promise<string> => {
  const fromDb = (
    await getSettingText(SETTING_KEYS.autogopayApiKey, "")
  ).trim();
  if (fromDb) return fromDb;
  return process.env.AUTOGOPAY_API_KEY?.trim() || "";
});

export const getAutogopayApiKey = async (): Promise<string> => gatewayCred("autogopayApiKey") ?? (await base_getAutogopayApiKey());

const base_getAutogopayBaseUrl = cache(async (): Promise<string> => {
  const fromDb = (
    await getSettingText(SETTING_KEYS.autogopayBaseUrl, "")
  ).trim();
  const value =
    fromDb ||
    process.env.AUTOGOPAY_BASE_URL?.trim() ||
    "https://v1-gateway.autogopay.site";
  return value.trim().replace(/\/$/, "");
});

export const getAutogopayBaseUrl = async (): Promise<string> => {
  const o = gatewayCred("autogopayBaseUrl");
  return o ? o.replace(/\/$/, "") : base_getAutogopayBaseUrl();
};

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

const base_getFamgatewayApiKey = cache(async (): Promise<string> =>
  settingOrEnv(SETTING_KEYS.famgatewayApiKey, "FAMGATEWAY_API_KEY"),
);

export const getFamgatewayApiKey = async (): Promise<string> => gatewayCred("famgatewayApiKey") ?? (await base_getFamgatewayApiKey());

const base_getFamgatewayBaseUrl = cache(async (): Promise<string> => {
  const value = await settingOrEnv(
    SETTING_KEYS.famgatewayBaseUrl,
    "FAMGATEWAY_BASE_URL",
    "https://famgateway.in",
  );
  return value.replace(/\/$/, "");
});

export const getFamgatewayBaseUrl = async (): Promise<string> => {
  const o = gatewayCred("famgatewayBaseUrl");
  return o ? o.replace(/\/$/, "") : base_getFamgatewayBaseUrl();
};

export async function isFamgatewayConfigured(): Promise<boolean> {
  return Boolean(await getFamgatewayApiKey());
}

const base_getCashfreeAppId = cache(async (): Promise<string> =>
  settingOrEnv(SETTING_KEYS.cashfreeAppId, "CASHFREE_APP_ID"),
);

export const getCashfreeAppId = async (): Promise<string> => gatewayCred("cashfreeAppId") ?? (await base_getCashfreeAppId());

const base_getCashfreeSecretKey = cache(async (): Promise<string> =>
  settingOrEnv(SETTING_KEYS.cashfreeSecretKey, "CASHFREE_SECRET_KEY"),
);

export const getCashfreeSecretKey = async (): Promise<string> => gatewayCred("cashfreeSecretKey") ?? (await base_getCashfreeSecretKey());

const base_getCashfreeWebhookSecret = cache(async (): Promise<string> =>
  settingOrEnv(SETTING_KEYS.cashfreeWebhookSecret, "CASHFREE_WEBHOOK_SECRET"),
);

export const getCashfreeWebhookSecret = async (): Promise<string> => gatewayCred("cashfreeWebhookSecret") ?? (await base_getCashfreeWebhookSecret());

export type CashfreeEnvMode = "sandbox" | "production";

const baseCashfreeEnv = cache(async (): Promise<CashfreeEnvMode> => {
  const raw = (
    await settingOrEnv(SETTING_KEYS.cashfreeEnv, "CASHFREE_ENV", "sandbox")
  ).toLowerCase();
  return raw === "production" ? "production" : "sandbox";
});

export const getCashfreeEnv = async (): Promise<CashfreeEnvMode> => {
  const o = gatewayCred("cashfreeEnv")?.toLowerCase();
  if (o) return o === "production" ? "production" : "sandbox";
  return baseCashfreeEnv();
};

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

const base_getNasionalpayKey = cache(async (): Promise<string> =>
  settingOrEnv(SETTING_KEYS.nasionalpayKey, "NASIONALPAY_KEY"),
);

export const getNasionalpayKey = async (): Promise<string> => gatewayCred("nasionalpayKey") ?? (await base_getNasionalpayKey());

/** "QRIS" (scan) or "FUNDS" (DANA pay link). */
export async function getNasionalpayChannel(): Promise<"QRIS" | "FUNDS"> {
  return gatewayCred("nasionalpayChannel") === "FUNDS" ? "FUNDS" : "QRIS";
}
