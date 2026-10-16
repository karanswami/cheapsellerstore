import { prisma } from "@/lib/prisma";
import { getRedis } from "@/lib/redis";

const SETTING_CACHE_PREFIX = "cheapseller:setting:";
const SETTING_CACHE_TTL_SECONDS = 300; // 5 minutes

export async function getSetting(key: string) {
  try {
    const redis = await getRedis();
    if (redis) {
      const cached = await redis.get(`${SETTING_CACHE_PREFIX}${key}`);
      if (cached !== null) {
        if (cached === "__NULL__") return null;
        return JSON.parse(cached) as {
          key: string;
          textValue: string | null;
          intValue: number | null;
        };
      }
    }
  } catch {
    // fallback to Mongo on cache error
  }

  const row = await prisma.appSetting.findUnique({ where: { key } });

  try {
    const redis = await getRedis();
    if (redis) {
      if (row) {
        await redis.set(
          `${SETTING_CACHE_PREFIX}${key}`,
          JSON.stringify(row),
          "EX",
          SETTING_CACHE_TTL_SECONDS,
        );
      } else {
        await redis.set(
          `${SETTING_CACHE_PREFIX}${key}`,
          "__NULL__",
          "EX",
          60, // Short TTL for non-existent keys
        );
      }
    }
  } catch {
    // ignore cache write error
  }

  return row;
}

export async function getSettingText(key: string, fallback = ""): Promise<string> {
  const row = await getSetting(key);
  return row?.textValue ?? fallback;
}

export async function getSettingInt(key: string, fallback = 0): Promise<number> {
  const row = await getSetting(key);
  return row?.intValue ?? fallback;
}

export async function upsertSetting(input: {
  key: string;
  textValue?: string | null;
  intValue?: number | null;
}) {
  // MongoDB is ALWAYS the persistent source of truth
  const row = await prisma.appSetting.upsert({
    where: { key: input.key },
    create: {
      key: input.key,
      textValue: input.textValue ?? null,
      intValue: input.intValue ?? null,
    },
    update: {
      textValue: input.textValue ?? null,
      intValue: input.intValue ?? null,
    },
  });

  // Invalidate Redis cache immediately on mutation
  try {
    const redis = await getRedis();
    if (redis) {
      await redis.del(`${SETTING_CACHE_PREFIX}${input.key}`);
    }
  } catch {
    // ignore cache clear error
  }

  return row;
}

export const SETTING_KEYS = {
  maintenanceMode: "maintenance_mode",
  supportContact: "support_contact",
  supportTelegram: "support_telegram",
  supportWhatsapp: "support_whatsapp",
  /** @deprecated Prefer depositMins JSON — kept for migration fallback */
  depositMin: "deposit_min",
  /** JSON { user: {USD,INR,IDR,NPR}, reseller: {…} } — local currency mins */
  depositMins: "deposit_mins",
  /** JSON { QRIS|BINANCE|UPI|ESEWA|MGCLOUDPAY: { enabled, qrUrl? } } */
  depositMethods: "deposit_methods",
  /** JSON array of auto payment gateways (provider, currency, creds, status) */
  autoGateways: "auto_gateways",
  /** JSON array of admin-defined manual deposit methods */
  manualDepositMethods: "manual_deposit_methods",
  /** % credited when a referred USER/ADMIN purchases */
  referralPercent: "referral_percent",
  /** % credited when a referred SELLER purchases */
  sellerPurchasePercent: "seller_purchase_percent",
  /** % credited when a referred RESELLER purchases */
  resellerPurchasePercent: "reseller_purchase_percent",
  resellerProgramEnabled: "reseller_program_enabled",
  resellerApplyMinBalance: "reseller_apply_min_balance",
  /** Min USD funding when a Seller/Admin creates a child reseller. */
  resellerCreateMinFunding: "reseller_create_min_funding",
  resellerAutoApprove: "reseller_auto_approve",
  siteName: "site_name",
  siteTagline: "site_tagline",
  siteSeoDescription: "site_seo_description",
  siteLogoUrl: "site_logo_url",
  siteFaviconUrl: "site_favicon_url",
  siteOgImageUrl: "site_og_image_url",
  sitePrimaryColor: "site_primary_color",
  sitePrimaryDarkColor: "site_primary_dark_color",
  siteAccentColor: "site_accent_color",
  siteAccentDarkColor: "site_accent_dark_color",
  siteSuccessColor: "site_success_color",
  siteSuccessDarkColor: "site_success_dark_color",
  /** JSON SiteSocialLink[] — custom footer socials (add/remove any). */
  siteSocialLinks: "site_social_links",
  /** @deprecated Migrated into site_social_links on read */
  siteSocialTelegramUrl: "site_social_telegram_url",
  /** @deprecated Migrated into site_social_links on read */
  siteSocialDiscordUrl: "site_social_discord_url",
  /** @deprecated Migrated into site_social_links on read */
  siteSocialYoutubeUrl: "site_social_youtube_url",
  /** @deprecated Migrated into site_social_links on read */
  siteSocialTwitterUrl: "site_social_twitter_url",
  /** @deprecated Migrated into site_social_links on read */
  siteSocialInstagramUrl: "site_social_instagram_url",
  /** @deprecated Migrated into site_social_links on read */
  siteSocialTelegramIconUrl: "site_social_telegram_icon_url",
  /** @deprecated Migrated into site_social_links on read */
  siteSocialDiscordIconUrl: "site_social_discord_icon_url",
  /** @deprecated Migrated into site_social_links on read */
  siteSocialYoutubeIconUrl: "site_social_youtube_icon_url",
  /** @deprecated Migrated into site_social_links on read */
  siteSocialTwitterIconUrl: "site_social_twitter_icon_url",
  /** @deprecated Migrated into site_social_links on read */
  siteSocialInstagramIconUrl: "site_social_instagram_icon_url",
  /** JSON map of SiteIconKey → custom image URL (empty = built-in /icons default) */
  siteIcons: "site_icons",
  /** JSON { USD:1, INR, IDR, NPR } — local→USD for deposit credit only */
  walletCurrencyRates: "wallet_currency_rates",
  /** JSON { USD, INR, IDR, NPR: number[] } — deposit page fast-amount chips (excl. min) */
  depositQuickAmounts: "deposit_quick_amounts",
  /** Developer share of order gross profit (sale − buy), whole percent 0–100. Default 10. */
  developerProfitSharePercent: "developer_profit_share_percent",
  /** Developer share of Special Stock revenue/profit, whole percent 0–100. Default 50. */
  specialStockDeveloperSharePercent: "special_stock_developer_share_percent",
  /** Buy cost = supplier catalog list price × this % (0–100). Default 50. */
  supplierBuyPricePercent: "supplier_buy_price_percent",
  /** Platform API global kill switch (1 = on). */
  apiPlatformEnabled: "api_platform_enabled",
  /** JSON { user, seller, reseller, admin: boolean } */
  apiAllowedRoles: "api_allowed_roles",
  /** Developer margin % of API order subtotal (default 1). */
  apiDefaultRateLimitRpm: "api_default_rate_limit_rpm",
  /** Public (no-key) catalog/pricing/stock — requests per minute per IP */
  apiPublicRateLimitRpm: "api_public_rate_limit_rpm",
  apiBurstLimit: "api_burst_limit",
  apiMaxKeysPerUser: "api_max_keys_per_user",
  /** 1 = sandbox keys allowed */
  apiSandboxEnabled: "api_sandbox_enabled",
  /** Google OAuth client id (admin Settings; env fallback). */
  googleClientId: "google_client_id",
  /** Google OAuth client secret (admin Settings; env fallback). */
  googleClientSecret: "google_client_secret",
  /** Resend API key for forgot-password OTP (admin Settings; env fallback). */
  resendApiKey: "resend_api_key",
  /** Resend from address, e.g. `Cheap Seller <noreply@example.com>`. */
  resendFromEmail: "resend_from_email",
  /** Binance Pay API key (admin Settings; env fallback). */
  binanceApiKey: "binance_api_key",
  /** Binance Pay secret key. */
  binanceSecretKey: "binance_secret_key",
  /** Binance Pay ID shown on waiting ticket. */
  binancePayId: "binance_pay_id",
  /** AutoGoPay (QRIS) API key. */
  autogopayApiKey: "autogopay_api_key",
  /** AutoGoPay API base URL. */
  autogopayBaseUrl: "autogopay_base_url",
  /** RamaShop (QRIS) API key. */
  ramashopApiKey: "ramashop_api_key",
  /** RamaShop public API base URL. */
  ramashopBaseUrl: "ramashop_base_url",
  /** MGCloudPay (QRIS backup) API key. */
  mgcloudpayApiKey: "mgcloudpay_api_key",
  /** MGCloudPay API base URL. */
  mgcloudpayBaseUrl: "mgcloudpay_base_url",
  /** FamGateway (UPI / INR) API key. */
  famgatewayApiKey: "famgateway_api_key",
  /** FamGateway base URL (defaults to https://famgateway.in). */
  famgatewayBaseUrl: "famgateway_base_url",
  /** Cashfree PG app id (client id) (legacy/disabled). */
  cashfreeAppId: "cashfree_app_id",
  /** Cashfree PG secret key. */
  cashfreeSecretKey: "cashfree_secret_key",
  /** Cashfree webhook HMAC secret (optional; falls back to secret key). */
  cashfreeWebhookSecret: "cashfree_webhook_secret",
  /** Cashfree env: sandbox | production. */
  cashfreeEnv: "cashfree_env",
  /** JSON FeedbackSoundConfig — site haptics/sounds kill-switch + custom audio URLs. */
  feedbackSounds: "feedback_sounds",
  /** JSON TelegramNotifyConfig — Bot API channel pushes (master + per-event). */
  telegramNotifications: "telegram_notifications",
  /** Fallback product Demo button URL when Product.demoUrl is empty. */
  defaultProductDemoUrl: "default_product_demo_url",
  /** Upstream supplier key API master switch (1 = on). */
  supplierApiEnabled: "supplier_api_enabled",
  /** Upstream supplier Bearer API key (admin Settings; env fallback). */
  supplierApiKey: "supplier_api_key",
  /** Upstream supplier API base URL. */
  supplierApiBaseUrl: "supplier_api_base_url",
  /** Cached supplier catalog JSON for stock hints. */
  supplierCatalogCache: "supplier_catalog_cache",
  /** Cached supplier balance JSON for stock gating. */
  supplierBalanceCache: "supplier_balance_cache",
  /** JSON PagesEnabledConfig — store page kill-switches (gift codes default off). */
  pagesEnabled: "pages_enabled",
  /** Web Push VAPID public key. */
  webPushPublicKey: "web_push_public_key",
  /** Web Push VAPID private key. */
  webPushPrivateKey: "web_push_private_key",
  /** Web Push subject contact email (mailto:...). */
  webPushContactEmail: "web_push_contact_email",
  /** Web Push master kill switch (1 = on, 0 = off). */
  webPushEnabled: "web_push_enabled",
} as const;

/** Built-in fallback when AppSetting is also empty. */
export const BUILTIN_DEFAULT_PRODUCT_DEMO_URL =
  "https://www.youtube.com/@cheapseller";

export async function getDefaultProductDemoUrl(): Promise<string> {
  const saved = (
    await getSettingText(SETTING_KEYS.defaultProductDemoUrl, "")
  ).trim();
  return saved || BUILTIN_DEFAULT_PRODUCT_DEMO_URL;
}

export async function getReferralPercent(): Promise<number> {
  return getSettingInt(SETTING_KEYS.referralPercent, 5);
}

export async function getResellerPurchasePercent(): Promise<number> {
  return getSettingInt(SETTING_KEYS.resellerPurchasePercent, 5);
}

/**
 * Seller purchase commission %.
 * Falls back to `reseller_purchase_percent` when unset (legacy dual-rate key
 * previously applied to seller buyers).
 */
export async function getSellerPurchasePercent(): Promise<number> {
  const row = await getSetting(SETTING_KEYS.sellerPurchasePercent);
  if (row?.intValue != null) return row.intValue;
  return getResellerPurchasePercent();
}

/** Commission % for a referred buyer's role (who purchased). */
export async function getReferralPercentForBuyerRole(
  role: string,
): Promise<number> {
  switch (role) {
    case "SELLER":
      return getSellerPurchasePercent();
    case "RESELLER":
      return getResellerPurchasePercent();
    default:
      // USER, ADMIN, unknown → normal referral rate
      return getReferralPercent();
  }
}

export async function isResellerProgramEnabled(): Promise<boolean> {
  return (await getSettingInt(SETTING_KEYS.resellerProgramEnabled, 1)) === 1;
}

/** Minimum wallet balance in whole USD dollars required to apply. */
export async function getResellerApplyMinBalanceUsd(): Promise<number> {
  return getSettingInt(SETTING_KEYS.resellerApplyMinBalance, 5);
}

/** Minimum initial funding (whole USD) when creating a child reseller. */
export async function getResellerCreateMinFundingUsd(): Promise<number> {
  return getSettingInt(SETTING_KEYS.resellerCreateMinFunding, 5);
}

export async function isResellerAutoApprove(): Promise<boolean> {
  return (await getSettingInt(SETTING_KEYS.resellerAutoApprove, 0)) === 1;
}

function clampPercent(n: number, fallback: number): number {
  if (!Number.isFinite(n)) return fallback;
  return Math.min(100, Math.max(0, Math.round(n)));
}

/** Order gross-profit developer share % (default 10). */
export async function getDeveloperProfitSharePercent(): Promise<number> {
  return clampPercent(
    await getSettingInt(SETTING_KEYS.developerProfitSharePercent, 10),
    10,
  );
}

/** Fraction 0–1 for order developer share. */
export async function getDeveloperProfitShareRate(): Promise<number> {
  return (await getDeveloperProfitSharePercent()) / 100;
}

/** Special Stock profit developer share % (default 50). */
export async function getSpecialStockDeveloperSharePercent(): Promise<number> {
  return clampPercent(
    await getSettingInt(SETTING_KEYS.specialStockDeveloperSharePercent, 50),
    50,
  );
}

/** Fraction 0–1 for Special Stock developer share. */
export async function getSpecialStockDeveloperShareRate(): Promise<number> {
  return (await getSpecialStockDeveloperSharePercent()) / 100;
}

/**
 * Percent of supplier catalog list price used as duration buy cost (default 50).
 * Example: 50 → buy = list × 0.5.
 */
export async function getSupplierBuyPricePercent(): Promise<number> {
  return clampPercent(
    await getSettingInt(SETTING_KEYS.supplierBuyPricePercent, 50),
    50,
  );
}

/** Fraction 0–1 for supplier → buy cost fill. */
export async function getSupplierBuyPriceFactor(): Promise<number> {
  return (await getSupplierBuyPricePercent()) / 100;
}
