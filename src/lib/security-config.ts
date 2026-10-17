import "server-only";

import {
  DEFAULT_SECURITY_CONFIG,
  normalizeSecurityConfig,
  type SecurityConfig,
} from "@/lib/security-config-shared";
import { getSetting, SETTING_KEYS, upsertSetting } from "@/lib/settings";

export type { SecurityConfig };

export async function getSecurityConfig(): Promise<SecurityConfig> {
  try {
    const row = await getSetting(SETTING_KEYS.securityConfig);
    if (!row?.textValue?.trim()) return { ...DEFAULT_SECURITY_CONFIG };
    return normalizeSecurityConfig(JSON.parse(row.textValue));
  } catch {
    return { ...DEFAULT_SECURITY_CONFIG };
  }
}

export async function saveSecurityConfig(next: unknown): Promise<SecurityConfig> {
  const normalized = normalizeSecurityConfig(next);
  await upsertSetting({
    key: SETTING_KEYS.securityConfig,
    textValue: JSON.stringify(normalized),
  });
  return normalized;
}
