import { jsonError, jsonOk } from "@/lib/api";
import { getSellerProgramConfig, saveSellerProgramConfig } from "@/lib/seller-program";
import {
  MAINTENANCE_COOKIE,
  maintenanceCookieOptions,
} from "@/lib/maintenance-cookie";
import {
  getGoogleClientId,
  getGoogleClientSecret,
  getResendApiKey,
  getResendFromEmail,
  isGoogleAuthConfigured,
  isResendConfigured,
} from "@/lib/auth-config";
import {
  getBinanceApiKey,
  getBinancePayId,
  getBinanceSecretKey,
  getCashfreeAppId,
  getCashfreeEnv,
  getCashfreeSecretKey,
  getCashfreeWebhookSecret,
  getFamgatewayApiKey,
  getFamgatewayBaseUrl,
  getAutogopayApiKey,
  getAutogopayBaseUrl,
  isBinanceConfigured,
  isCashfreeConfigured,
  isFamgatewayConfigured,
  isAutogopayConfigured,
} from "@/lib/payment-provider-config";
import { getApiSandboxEnabled } from "@/lib/seller-api/settings";
import { requireAdmin } from "@/lib/auth/admin";
import { getSecurityConfig, saveSecurityConfig } from "@/lib/security-config";
import {
  getDepositMins,
  normalizeDepositMins,
  saveDepositMins,
  syncDepositMinsToCurrencies,
  type DepositMinsByAudience,
} from "@/lib/deposit-mins";
import {
  canDeleteDepositCurrency,
  getDepositCurrencies,
  getDepositFxRates,
  normalizeDepositCurrencies,
  ratesMapFromCurrencies,
  saveDepositCurrencies,
  type DepositCurrencyDef,
} from "@/lib/deposit-currency-rates";
import {
  getDepositQuickAmounts,
  normalizeDepositQuickAmounts,
  saveDepositQuickAmounts,
  syncDepositQuickAmountsToCurrencies,
  type DepositQuickAmounts,
} from "@/lib/deposit-quick-amounts";
import { getAutoGateways, saveAutoGateways, normalizeGateways } from "@/lib/auto-gateways";
import {
  DEPOSIT_METHOD_IDS,
  getDepositMethodsConfig,
  normalizeDepositMethodsConfig,
  saveDepositMethodsConfig,
  type DepositMethodId,
  type DepositMethodsConfig,
} from "@/lib/deposit-methods";
import {
  getManualDepositMethods,
  getManualMethodCurrencyCodes,
  normalizeManualDepositMethods,
  saveManualDepositMethods,
  type ManualDepositMethod,
} from "@/lib/manual-deposit-methods";
import {
  getDefaultProductDemoUrl,
  getDeveloperProfitSharePercent,
  getReferralPercent,
  isReferralCommissionEnabled,
  getResellerApplyMinBalanceUsd,
  getResellerCreateMinFundingUsd,
  getResellerPurchasePercent,
  getSellerPurchasePercent,
  getSettingInt,
  getSettingText,
  isResellerAutoApprove,
  isResellerProgramEnabled,
  SETTING_KEYS,
  upsertSetting,
} from "@/lib/settings";
import {
  getPagesEnabled,
  normalizePagesEnabled,
  savePagesEnabled,
  type PagesEnabledConfig,
} from "@/lib/pages-enabled";
import {
  getFeedbackSoundConfig,
  normalizeFeedbackSoundConfig,
  saveFeedbackSoundConfig,
} from "@/lib/feedback-sounds";
import {
  getTelegramNotifyConfig,
  normalizeTelegramNotifyConfig,
  saveTelegramNotifyConfig,
} from "@/lib/telegram-notify";
import { FEEDBACK_SOUND_SLOTS } from "@/types/feedback-sounds";
import { type TelegramNotifyConfig } from "@/types/telegram-notify";
import { z } from "zod";

const depositCurrencySchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{2,8}$/)
    .transform((v) => v.toUpperCase()),
  name: z.string().trim().min(1).max(60),
  symbol: z.string().trim().min(1).max(8),
  rate: z.number().positive(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
});

const depositCurrenciesSchema = z.array(depositCurrencySchema).min(1);

const depositMinsSchema = z.object({
  user: z.record(z.string(), z.number().min(0)),
  reseller: z.record(z.string(), z.number().min(0)),
});

const quickAmountListSchema = z.array(z.number().positive()).min(1).max(4);

const depositQuickAmountsSchema = z.record(z.string(), quickAmountListSchema);

const methodEntrySchema = z.object({
  enabled: z.boolean(),
  qrUrl: z.string().max(500).optional(),
  currency: z.string().trim().max(8).optional(),
});

const depositMethodsSchema = z.object({
  QRIS: methodEntrySchema,
  BINANCE: methodEntrySchema,
  UPI: methodEntrySchema,
  ESEWA: methodEntrySchema,
  MGCLOUDPAY: methodEntrySchema.optional(),
});

const gatewaySchema = z.object({
  id: z.string().max(40).optional(),
  provider: z.enum(["QRIS", "UPI", "BINANCE", "ESEWA", "NASIONALPAY"]),
  name: z.string().trim().min(1).max(60),
  currency: z.string().trim().max(8),
  enabled: z.boolean(),
  maintenance: z.boolean(),
  maintenanceNote: z.string().max(200).optional(),
  qrUrl: z.string().max(500).optional(),
  creds: z.record(z.string(), z.string().max(500)).optional(),
});

const manualMethodSchema = z.object({
  id: z.string().max(50).optional(),
  name: z.string().max(80).optional(),
  currency: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{2,8}$/)
    .transform((v) => v.toUpperCase()),
  currencyName: z.string().max(60).optional(),
  currencySymbol: z.string().max(8).optional(),
  accountNumber: z.string().max(500).optional(),
  qrUrl: z.string().max(500).optional(),
  iconUrl: z.string().max(500).optional(),
  iconKey: z.string().max(64).optional(),
  instructions: z.string().max(1000).optional(),
  enabled: z.boolean(),
  sortOrder: z.number().int().min(0).max(9999),
});

const manualDepositMethodsSchema = z.array(manualMethodSchema);

const feedbackSoundsSchema = z.object({
  hapticsEnabled: z.boolean(),
  soundsEnabled: z.boolean(),
  sounds: z.object({
    tap: z.string().max(500),
    toggle: z.string().max(500),
    primary: z.string().max(500),
    selection: z.string().max(500),
    success: z.string().max(500),
    error: z.string().max(500),
    warning: z.string().max(500),
  }),
});

const telegramChannelSchema = z.object({
  enabled: z.boolean(),
  chatId: z.string().max(64),
  inviteLink: z.string().max(500),
  label: z.string().max(80),
});

const telegramNotificationsSchema = z.object({
  enabled: z.boolean(),
  botToken: z.string().max(200),
  channels: z.record(z.string(), telegramChannelSchema),
});

const securityConfigSchema = z.object({
  pushEndpointHosts: z.array(z.string().max(100)).max(50),
  loginPerIpPer10Min: z.number(),
  loginPerAccountPer15Min: z.number(),
  registerPerIpPerHour: z.number(),
  registerPerIpPerDay: z.number(),
  supportChatPerMinute: z.number(),
  impersonationHours: z.number(),
});

const pagesEnabledSchema = z.object({
  giftCodes: z.boolean(),
});

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return jsonError("UNAUTHORIZED", "Admin required.", 401);
  }

  const depositCurrencies = await getDepositCurrencies();

  return jsonOk({
    maintenanceMode: (await getSettingInt(SETTING_KEYS.maintenanceMode, 0)) === 1,
    supportContact: await getSettingText(SETTING_KEYS.supportContact, ""),
    supportTelegram: await getSettingText(SETTING_KEYS.supportTelegram, ""),
    supportWhatsapp: await getSettingText(SETTING_KEYS.supportWhatsapp, ""),
    depositMins: await getDepositMins(),
    depositCurrencies,
    depositFxRates: ratesMapFromCurrencies(depositCurrencies),
    depositQuickAmounts: await getDepositQuickAmounts(),
    depositMethods: await getDepositMethodsConfig(),
    autoGateways: await getAutoGateways(),
    manualDepositMethods: await getManualDepositMethods(),
    feedbackSounds: await getFeedbackSoundConfig(),
    telegramNotifications: await getTelegramNotifyConfig(),
    pagesEnabled: await getPagesEnabled(),
    securityConfig: await getSecurityConfig(),
    referralCommissionEnabled: await isReferralCommissionEnabled(),
    referralPercent: await getReferralPercent(),
    sellerPurchasePercent: await getSellerPurchasePercent(),
    resellerPurchasePercent: await getResellerPurchasePercent(),
    resellerProgramEnabled: await isResellerProgramEnabled(),
    resellerApplyMinBalance: await getResellerApplyMinBalanceUsd(),
    resellerCreateMinFunding: await getResellerCreateMinFundingUsd(),
    resellerAutoApprove: await isResellerAutoApprove(),
    sellerProgram: await getSellerProgramConfig(),
    developerProfitSharePercent: await getDeveloperProfitSharePercent(),
    defaultProductDemoUrl: await getDefaultProductDemoUrl(),
    googleClientId: await getGoogleClientId(),
    googleClientSecret: await getGoogleClientSecret(),
    resendApiKey: await getResendApiKey(),
    resendFromEmail: await getResendFromEmail(),
    googleAuthEnabled: await isGoogleAuthConfigured(),
    resendEnabled: await isResendConfigured(),
    binanceApiKey: await getBinanceApiKey(),
    binanceSecretKey: await getBinanceSecretKey(),
    binancePayId: await getBinancePayId(),
    autogopayApiKey: await getAutogopayApiKey(),
    autogopayBaseUrl: await getAutogopayBaseUrl(),
    autogopayConfigured: await isAutogopayConfigured(),
    ramashopApiKey: "",
    ramashopBaseUrl: "",
    mgcloudpayApiKey: "",
    mgcloudpayBaseUrl: "",
    famgatewayApiKey: await getFamgatewayApiKey(),
    famgatewayBaseUrl: await getFamgatewayBaseUrl(),
    cashfreeAppId: await getCashfreeAppId(),
    cashfreeSecretKey: await getCashfreeSecretKey(),
    cashfreeWebhookSecret: await getCashfreeWebhookSecret(),
    cashfreeEnv: await getCashfreeEnv(),
    binanceConfigured: await isBinanceConfigured(),
    ramashopConfigured: false,
    mgcloudpayConfigured: false,
    famgatewayConfigured: await isFamgatewayConfigured(),
    cashfreeConfigured: await isCashfreeConfigured(),
    apiSandboxEnabled: await getApiSandboxEnabled(),
  });
}

const schema = z.object({
  maintenanceMode: z.boolean().optional(),
  supportContact: z.string().max(200).optional(),
  supportTelegram: z.string().max(200).optional(),
  supportWhatsapp: z.string().max(200).optional(),
  depositMins: depositMinsSchema.optional(),
  depositCurrencies: depositCurrenciesSchema.optional(),
  depositQuickAmounts: depositQuickAmountsSchema.optional(),
  depositMethods: depositMethodsSchema.optional(),
  autoGateways: z.array(gatewaySchema).max(40).optional(),
  manualDepositMethods: manualDepositMethodsSchema.optional(),
  feedbackSounds: feedbackSoundsSchema.optional(),
  telegramNotifications: telegramNotificationsSchema.optional(),
  pagesEnabled: pagesEnabledSchema.optional(),
  securityConfig: securityConfigSchema.optional(),
  referralCommissionEnabled: z.boolean().optional(),
  referralPercent: z.number().min(0).max(100).optional(),
  sellerPurchasePercent: z.number().min(0).max(100).optional(),
  resellerPurchasePercent: z.number().min(0).max(100).optional(),
  resellerProgramEnabled: z.boolean().optional(),
  resellerApplyMinBalance: z.number().min(0).optional(),
  resellerCreateMinFunding: z.number().min(0).optional(),
  resellerAutoApprove: z.boolean().optional(),
  sellerProgram: z
    .object({
      headline: z.string().max(80),
      closedMessage: z.string().max(300),
      perks: z.array(z.string().max(120)).max(8),
      fields: z.record(z.string(), z.enum(["required", "optional", "hidden"])),
      reapplyCooldownDays: z.number().int().min(0).max(365),
    })
    .optional(),
  developerProfitSharePercent: z.number().min(0).max(100).optional(),
  defaultProductDemoUrl: z
    .string()
    .trim()
    .max(500)
    .optional()
    .refine((v) => v === undefined || v === "" || /^https?:\/\//i.test(v), {
      message: "Invalid demo URL",
    }),
  googleClientId: z.string().max(500).optional(),
  googleClientSecret: z.string().max(500).optional(),
  resendApiKey: z.string().max(500).optional(),
  resendFromEmail: z.string().max(200).optional(),
  binanceApiKey: z.string().max(500).optional(),
  binanceSecretKey: z.string().max(500).optional(),
  binancePayId: z.string().max(200).optional(),
  autogopayApiKey: z.string().max(500).optional(),
  autogopayBaseUrl: z.string().max(500).optional(),
  ramashopApiKey: z.string().max(500).optional(),
  ramashopBaseUrl: z.string().max(500).optional(),
  mgcloudpayApiKey: z.string().max(500).optional(),
  mgcloudpayBaseUrl: z.string().max(500).optional(),
  famgatewayApiKey: z.string().max(500).optional(),
  famgatewayBaseUrl: z.string().max(500).optional(),
  cashfreeAppId: z.string().max(200).optional(),
  cashfreeSecretKey: z.string().max(500).optional(),
  cashfreeWebhookSecret: z.string().max(500).optional(),
  cashfreeEnv: z.enum(["sandbox", "production"]).optional(),
  apiSandboxEnabled: z.boolean().optional(),
});

export async function PATCH(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return jsonError("UNAUTHORIZED", "Admin required.", 401);
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError("VALIDATION", "Invalid payload.", 400);

  const d = parsed.data;
  if (d.maintenanceMode !== undefined) {
    await upsertSetting({
      key: SETTING_KEYS.maintenanceMode,
      intValue: d.maintenanceMode ? 1 : 0,
    });
  }
  if (d.supportContact !== undefined) {
    await upsertSetting({
      key: SETTING_KEYS.supportContact,
      textValue: d.supportContact,
    });
  }
  if (d.supportTelegram !== undefined) {
    await upsertSetting({
      key: SETTING_KEYS.supportTelegram,
      textValue: d.supportTelegram,
    });
  }
  if (d.supportWhatsapp !== undefined) {
    await upsertSetting({
      key: SETTING_KEYS.supportWhatsapp,
      textValue: d.supportWhatsapp,
    });
  }
  if (d.depositCurrencies !== undefined) {
    const next = normalizeDepositCurrencies(
      d.depositCurrencies as DepositCurrencyDef[],
    );
    const usedCodes = await getManualMethodCurrencyCodes();
    const previous = await getDepositCurrencies();
    for (const prev of previous) {
      if (next.some((c) => c.code === prev.code)) continue;
      const gate = canDeleteDepositCurrency(prev.code, usedCodes);
      if (!gate.ok) {
        return jsonError("VALIDATION", gate.reason, 400);
      }
    }
    try {
      await saveDepositCurrencies(next);
      await syncDepositQuickAmountsToCurrencies();
      await syncDepositMinsToCurrencies();
    } catch (err) {
      return jsonError(
        "VALIDATION",
        err instanceof Error ? err.message : "Invalid currencies.",
        400,
      );
    }
  }
  if (d.depositMins !== undefined) {
    const rates = await getDepositFxRates();
    await saveDepositMins(
      normalizeDepositMins(d.depositMins as DepositMinsByAudience, rates),
    );
  }
  if (d.depositQuickAmounts !== undefined) {
    const rates = await getDepositFxRates();
    await saveDepositQuickAmounts(
      normalizeDepositQuickAmounts(
        d.depositQuickAmounts as DepositQuickAmounts,
        rates,
      ),
    );
  }
  if (d.depositMethods !== undefined) {
    const raw = d.depositMethods as DepositMethodsConfig;
    for (const id of DEPOSIT_METHOD_IDS) {
      if (!raw[id as DepositMethodId]) {
        return jsonError("VALIDATION", "Invalid deposit methods payload.", 400);
      }
    }
    const normalizedMethods = normalizeDepositMethodsConfig(raw);
    const registered = new Set((await getDepositCurrencies()).map((c) => c.code));
    for (const id of DEPOSIT_METHOD_IDS) {
      if (!registered.has(normalizedMethods[id].currency)) {
        return jsonError("VALIDATION", `Create the ${normalizedMethods[id].currency} currency before attaching it to ${id}.`, 400);
      }
    }
    await saveDepositMethodsConfig(normalizedMethods);
  }
  if (d.autoGateways !== undefined) {
    const list = normalizeGateways(d.autoGateways);
    const registered = new Set((await getDepositCurrencies()).map((c) => c.code));
    for (const g of list) {
      if (!registered.has(g.currency)) {
        return jsonError("VALIDATION", `Create the ${g.currency} currency before attaching it to "${g.name}".`, 400);
      }
    }
    await saveAutoGateways(list);
  }
  if (d.manualDepositMethods !== undefined) {
    const normalized = normalizeManualDepositMethods(
      d.manualDepositMethods as ManualDepositMethod[],
    );
    if (normalized.length === 0 && d.manualDepositMethods.length > 0) {
      return jsonError("VALIDATION", "Invalid manual deposit methods.", 400);
    }
    try {
      await saveManualDepositMethods(normalized);
    } catch (err) {
      return jsonError(
        "VALIDATION",
        err instanceof Error ? err.message : "Invalid manual methods.",
        400,
      );
    }
  }
  if (d.feedbackSounds !== undefined) {
    const normalized = normalizeFeedbackSoundConfig(d.feedbackSounds);
    for (const slot of FEEDBACK_SOUND_SLOTS) {
      const url = normalized.sounds[slot];
      if (url && !url.startsWith("/uploads/sounds/") && !/^https?:\/\//i.test(url)) {
        return jsonError("VALIDATION", `Invalid sound URL for ${slot}.`, 400);
      }
    }
    await saveFeedbackSoundConfig(normalized);
  }
  if (d.telegramNotifications !== undefined) {
    await saveTelegramNotifyConfig(
      normalizeTelegramNotifyConfig(
        d.telegramNotifications as TelegramNotifyConfig,
      ),
    );
  }
  if (d.securityConfig !== undefined) {
    await saveSecurityConfig(d.securityConfig);
  }
  if (d.pagesEnabled !== undefined) {
    await savePagesEnabled(
      normalizePagesEnabled(d.pagesEnabled as PagesEnabledConfig),
    );
  }
  if (d.referralCommissionEnabled !== undefined) {
    await upsertSetting({
      key: SETTING_KEYS.referralCommissionEnabled,
      intValue: d.referralCommissionEnabled ? 1 : 0,
    });
  }
  if (d.referralPercent !== undefined) {
    await upsertSetting({
      key: SETTING_KEYS.referralPercent,
      intValue: Math.round(d.referralPercent),
    });
  }
  if (d.sellerPurchasePercent !== undefined) {
    await upsertSetting({
      key: SETTING_KEYS.sellerPurchasePercent,
      intValue: Math.round(d.sellerPurchasePercent),
    });
  }
  if (d.resellerPurchasePercent !== undefined) {
    await upsertSetting({
      key: SETTING_KEYS.resellerPurchasePercent,
      intValue: Math.round(d.resellerPurchasePercent),
    });
  }
  if (d.resellerProgramEnabled !== undefined) {
    await upsertSetting({
      key: SETTING_KEYS.resellerProgramEnabled,
      intValue: d.resellerProgramEnabled ? 1 : 0,
    });
  }
  if (d.resellerApplyMinBalance !== undefined) {
    await upsertSetting({
      key: SETTING_KEYS.resellerApplyMinBalance,
      intValue: Math.round(d.resellerApplyMinBalance),
    });
  }
  if (d.resellerCreateMinFunding !== undefined) {
    await upsertSetting({
      key: SETTING_KEYS.resellerCreateMinFunding,
      intValue: Math.round(d.resellerCreateMinFunding),
    });
  }
  if (d.resellerAutoApprove !== undefined) {
    await upsertSetting({
      key: SETTING_KEYS.resellerAutoApprove,
      intValue: d.resellerAutoApprove ? 1 : 0,
    });
  }
  if (d.sellerProgram !== undefined) {
    await saveSellerProgramConfig(d.sellerProgram);
  }
  if (d.developerProfitSharePercent !== undefined) {
    await upsertSetting({
      key: SETTING_KEYS.developerProfitSharePercent,
      intValue: Math.round(d.developerProfitSharePercent),
    });
  }
  if (d.defaultProductDemoUrl !== undefined) {
    await upsertSetting({
      key: SETTING_KEYS.defaultProductDemoUrl,
      textValue: d.defaultProductDemoUrl.trim(),
    });
  }
  if (d.googleClientId !== undefined) {
    await upsertSetting({
      key: SETTING_KEYS.googleClientId,
      textValue: d.googleClientId.trim(),
    });
  }
  if (d.googleClientSecret !== undefined) {
    await upsertSetting({
      key: SETTING_KEYS.googleClientSecret,
      textValue: d.googleClientSecret.trim(),
    });
  }
  if (d.resendApiKey !== undefined) {
    await upsertSetting({
      key: SETTING_KEYS.resendApiKey,
      textValue: d.resendApiKey.trim(),
    });
  }
  if (d.resendFromEmail !== undefined) {
    await upsertSetting({
      key: SETTING_KEYS.resendFromEmail,
      textValue: d.resendFromEmail.trim(),
    });
  }
  if (d.binanceApiKey !== undefined) {
    await upsertSetting({
      key: SETTING_KEYS.binanceApiKey,
      textValue: d.binanceApiKey.trim(),
    });
  }
  if (d.binanceSecretKey !== undefined) {
    await upsertSetting({
      key: SETTING_KEYS.binanceSecretKey,
      textValue: d.binanceSecretKey.trim(),
    });
  }
  if (d.binancePayId !== undefined) {
    await upsertSetting({
      key: SETTING_KEYS.binancePayId,
      textValue: d.binancePayId.trim(),
    });
  }
  if (d.autogopayApiKey !== undefined) {
    await upsertSetting({
      key: "autogopay_api_key",
      textValue: d.autogopayApiKey.trim(),
    });
  }
  if (d.autogopayBaseUrl !== undefined) {
    await upsertSetting({
      key: "autogopay_base_url",
      textValue: d.autogopayBaseUrl.trim().replace(/\/$/, ""),
    });
  }
  if (d.ramashopApiKey !== undefined) {
    await upsertSetting({
      key: SETTING_KEYS.ramashopApiKey,
      textValue: d.ramashopApiKey.trim(),
    });
  }
  if (d.ramashopBaseUrl !== undefined) {
    await upsertSetting({
      key: SETTING_KEYS.ramashopBaseUrl,
      textValue: d.ramashopBaseUrl.trim().replace(/\/$/, ""),
    });
  }
  if (d.mgcloudpayApiKey !== undefined) {
    await upsertSetting({
      key: SETTING_KEYS.mgcloudpayApiKey,
      textValue: d.mgcloudpayApiKey.trim(),
    });
  }
  if (d.mgcloudpayBaseUrl !== undefined) {
    await upsertSetting({
      key: SETTING_KEYS.mgcloudpayBaseUrl,
      textValue: d.mgcloudpayBaseUrl.trim().replace(/\/$/, ""),
    });
  }
  if (d.famgatewayApiKey !== undefined) {
    await upsertSetting({
      key: SETTING_KEYS.famgatewayApiKey,
      textValue: d.famgatewayApiKey.trim(),
    });
  }
  if (d.famgatewayBaseUrl !== undefined) {
    await upsertSetting({
      key: SETTING_KEYS.famgatewayBaseUrl,
      textValue: d.famgatewayBaseUrl.trim().replace(/\/$/, ""),
    });
  }
  if (d.cashfreeAppId !== undefined) {
    await upsertSetting({
      key: SETTING_KEYS.cashfreeAppId,
      textValue: d.cashfreeAppId.trim(),
    });
  }
  if (d.cashfreeSecretKey !== undefined) {
    await upsertSetting({
      key: SETTING_KEYS.cashfreeSecretKey,
      textValue: d.cashfreeSecretKey.trim(),
    });
  }
  if (d.cashfreeWebhookSecret !== undefined) {
    await upsertSetting({
      key: SETTING_KEYS.cashfreeWebhookSecret,
      textValue: d.cashfreeWebhookSecret.trim(),
    });
  }
  if (d.cashfreeEnv !== undefined) {
    await upsertSetting({
      key: SETTING_KEYS.cashfreeEnv,
      textValue: d.cashfreeEnv,
    });
  }
  if (d.apiSandboxEnabled !== undefined) {
    await upsertSetting({
      key: SETTING_KEYS.apiSandboxEnabled,
      intValue: d.apiSandboxEnabled ? 1 : 0,
    });
  }

  const res = jsonOk({ ok: true });
  if (d.maintenanceMode !== undefined) {
    res.cookies.set(
      MAINTENANCE_COOKIE,
      d.maintenanceMode ? "1" : "",
      maintenanceCookieOptions(d.maintenanceMode),
    );
  }
  return res;
}
