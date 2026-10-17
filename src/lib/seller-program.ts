import { cache } from "react";
import { getSettingText, SETTING_KEYS, upsertSetting } from "@/lib/settings";
import {
  defaultSellerProgramConfig,
  normalizeSellerProgramConfig,
  type SellerProgramConfig,
} from "@/types/seller-program";

export const getSellerProgramConfig = cache(async (): Promise<SellerProgramConfig> => {
  try {
    const raw = await getSettingText(SETTING_KEYS.sellerProgramConfig, "");
    if (!raw.trim()) return defaultSellerProgramConfig();
    return normalizeSellerProgramConfig(JSON.parse(raw) as unknown);
  } catch {
    return defaultSellerProgramConfig();
  }
});

export async function saveSellerProgramConfig(input: unknown): Promise<SellerProgramConfig> {
  const normalized = normalizeSellerProgramConfig(input);
  await upsertSetting({
    key: SETTING_KEYS.sellerProgramConfig,
    textValue: JSON.stringify(normalized),
  });
  return normalized;
}
