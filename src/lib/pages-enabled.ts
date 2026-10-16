import "server-only";

import {
  DEFAULT_PAGES_ENABLED,
  normalizePagesEnabled,
  type PagesEnabledConfig,
} from "@/lib/pages-enabled-shared";
import {
  getSetting,
  SETTING_KEYS,
  upsertSetting,
} from "@/lib/settings";

export type { PagesEnabledConfig };
export { DEFAULT_PAGES_ENABLED, normalizePagesEnabled };

export async function getPagesEnabled(): Promise<PagesEnabledConfig> {
  const row = await getSetting(SETTING_KEYS.pagesEnabled);
  if (!row?.textValue?.trim()) return { ...DEFAULT_PAGES_ENABLED };
  try {
    return normalizePagesEnabled(JSON.parse(row.textValue));
  } catch {
    return { ...DEFAULT_PAGES_ENABLED };
  }
}

export async function savePagesEnabled(
  next: PagesEnabledConfig,
): Promise<PagesEnabledConfig> {
  const normalized = normalizePagesEnabled(next);
  await upsertSetting({
    key: SETTING_KEYS.pagesEnabled,
    textValue: JSON.stringify(normalized),
  });
  return normalized;
}

