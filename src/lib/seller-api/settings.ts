import {
  getSettingInt,
  getSettingText,
  SETTING_KEYS,
  upsertSetting,
} from "@/lib/settings";
import type { UserRole } from "@prisma/client";

export type ApiAllowedRoles = {
  user: boolean;
  seller: boolean;
  reseller: boolean;
  admin: boolean;
};

const DEFAULT_ALLOWED: ApiAllowedRoles = {
  user: false,
  seller: true,
  reseller: true,
  admin: true,
};

export function parseApiAllowedRoles(raw: string | null | undefined): ApiAllowedRoles {
  if (!raw?.trim()) return { ...DEFAULT_ALLOWED };
  try {
    const parsed = JSON.parse(raw) as Partial<ApiAllowedRoles>;
    return {
      user: parsed.user === true,
      seller: parsed.seller !== false,
      reseller: parsed.reseller !== false,
      admin: parsed.admin !== false,
    };
  } catch {
    return { ...DEFAULT_ALLOWED };
  }
}

export async function getApiPlatformEnabled(): Promise<boolean> {
  return (await getSettingInt(SETTING_KEYS.apiPlatformEnabled, 1)) === 1;
}

export async function getApiAllowedRoles(): Promise<ApiAllowedRoles> {
  const raw = await getSettingText(SETTING_KEYS.apiAllowedRoles, "");
  return parseApiAllowedRoles(raw);
}

export function roleAllowed(
  role: UserRole | string,
  allowed: ApiAllowedRoles,
): boolean {
  switch (role) {
    case "USER":
      return allowed.user;
    case "SELLER":
      return allowed.seller;
    case "RESELLER":
      return allowed.reseller;
    case "ADMIN":
      return allowed.admin;
    default:
      return false;
  }
}

export async function getApiDefaultRateLimitRpm(): Promise<number> {
  const n = await getSettingInt(SETTING_KEYS.apiDefaultRateLimitRpm, 300);
  return Math.min(300, Math.max(1, n));
}

/** Public catalog/pricing/stock — per IP, default 100/min. */
export async function getApiPublicRateLimitRpm(): Promise<number> {
  const n = await getSettingInt(SETTING_KEYS.apiPublicRateLimitRpm, 100);
  return Math.min(100, Math.max(1, n));
}

export async function getApiBurstLimit(): Promise<number> {
  return Math.max(1, await getSettingInt(SETTING_KEYS.apiBurstLimit, 10));
}

/** Default max ACTIVE Platform API keys per user (admin-configurable). */
export const API_DEFAULT_MAX_KEYS_PER_USER = 5;
export const API_MAX_KEYS_PER_USER_CEILING = 50;

export async function getApiMaxKeysPerUser(): Promise<number> {
  const n = await getSettingInt(
    SETTING_KEYS.apiMaxKeysPerUser,
    API_DEFAULT_MAX_KEYS_PER_USER,
  );
  return Math.min(API_MAX_KEYS_PER_USER_CEILING, Math.max(1, n));
}

export async function getApiSandboxEnabled(): Promise<boolean> {
  return (await getSettingInt(SETTING_KEYS.apiSandboxEnabled, 1)) === 1;
}

export async function getPlatformApiSettings() {
  const [
    platformEnabled,
    allowedRoles,
    defaultRateLimitRpm,
    publicRateLimitRpm,
    burstLimit,
    maxKeysPerUser,
    sandboxEnabled,
  ] = await Promise.all([
    getApiPlatformEnabled(),
    getApiAllowedRoles(),
    getApiDefaultRateLimitRpm(),
    getApiPublicRateLimitRpm(),
    getApiBurstLimit(),
    getApiMaxKeysPerUser(),
    getApiSandboxEnabled(),
  ]);
  return {
    platformEnabled,
    allowedRoles,
    defaultRateLimitRpm,
    publicRateLimitRpm,
    burstLimit,
    maxKeysPerUser,
    sandboxEnabled,
  };
}

export async function savePlatformApiSettings(input: {
  platformEnabled?: boolean;
  allowedRoles?: ApiAllowedRoles;
  defaultRateLimitRpm?: number;
  burstLimit?: number;
  maxKeysPerUser?: number;
  sandboxEnabled?: boolean;
}) {
  if (input.platformEnabled !== undefined) {
    await upsertSetting({
      key: SETTING_KEYS.apiPlatformEnabled,
      intValue: input.platformEnabled ? 1 : 0,
    });
  }
  if (input.allowedRoles) {
    await upsertSetting({
      key: SETTING_KEYS.apiAllowedRoles,
      textValue: JSON.stringify(input.allowedRoles),
    });
  }
  if (input.defaultRateLimitRpm !== undefined) {
    await upsertSetting({
      key: SETTING_KEYS.apiDefaultRateLimitRpm,
      intValue: Math.min(300, Math.max(1, Math.round(input.defaultRateLimitRpm))),
    });
  }
  if (input.burstLimit !== undefined) {
    await upsertSetting({
      key: SETTING_KEYS.apiBurstLimit,
      intValue: Math.max(1, Math.round(input.burstLimit)),
    });
  }
  if (input.maxKeysPerUser !== undefined) {
    await upsertSetting({
      key: SETTING_KEYS.apiMaxKeysPerUser,
      intValue: Math.min(
        API_MAX_KEYS_PER_USER_CEILING,
        Math.max(1, Math.round(input.maxKeysPerUser) || 1),
      ),
    });
  }
  if (input.sandboxEnabled !== undefined) {
    await upsertSetting({
      key: SETTING_KEYS.apiSandboxEnabled,
      intValue: input.sandboxEnabled ? 1 : 0,
    });
  }
  return getPlatformApiSettings();
}
