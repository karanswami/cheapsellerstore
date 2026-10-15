import "server-only";

import { isIconImageUrl } from "@/lib/public-uploads";
import { getSettingText, SETTING_KEYS, upsertSetting } from "@/lib/settings";
import {
  SITE_ICON_KEYS,
  SITE_ICON_META,
  defaultSiteIconsMap,
  isSiteIconKey,
  type AdminSiteIconRow,
  type SiteIconKey,
  type SiteIconsMap,
} from "@/types/site-icons";
import { cache } from "react";

/** Overrides only — empty / missing = use built-in default PNG. */
export type SiteIconOverrides = Partial<Record<SiteIconKey, string>>;

function sanitizeOverride(raw: unknown): string {
  if (typeof raw !== "string") return "";
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (!isIconImageUrl(trimmed)) return "";
  return trimmed;
}

export function normalizeSiteIconOverrides(
  raw: Record<string, unknown> | null | undefined,
): SiteIconOverrides {
  const out: SiteIconOverrides = {};
  if (!raw || typeof raw !== "object") return out;
  for (const key of SITE_ICON_KEYS) {
    const value = sanitizeOverride(raw[key]);
    if (value) out[key] = value;
  }
  return out;
}

export function resolveSiteIcons(overrides: SiteIconOverrides): SiteIconsMap {
  const map = defaultSiteIconsMap();
  for (const key of SITE_ICON_KEYS) {
    const custom = overrides[key]?.trim();
    if (custom) map[key] = custom;
  }
  return map;
}

export const getSiteIconOverrides = cache(
  async (): Promise<SiteIconOverrides> => {
    const raw = await getSettingText(SETTING_KEYS.siteIcons, "");
    if (!raw.trim()) return {};
    try {
      return normalizeSiteIconOverrides(
        JSON.parse(raw) as Record<string, unknown>,
      );
    } catch {
      return {};
    }
  },
);

export const getSiteIcons = cache(async (): Promise<SiteIconsMap> => {
  return resolveSiteIcons(await getSiteIconOverrides());
});

export async function saveSiteIconOverrides(
  partial: SiteIconOverrides,
): Promise<SiteIconsMap> {
  const current = await getSiteIconOverrides();
  const next: SiteIconOverrides = { ...current };

  for (const [key, value] of Object.entries(partial)) {
    if (!isSiteIconKey(key)) continue;
    const sanitized = sanitizeOverride(value);
    if (!sanitized) {
      delete next[key];
    } else {
      next[key] = sanitized;
    }
  }

  await upsertSetting({
    key: SETTING_KEYS.siteIcons,
    textValue: JSON.stringify(next),
  });

  return resolveSiteIcons(next);
}

export async function listAdminSiteIcons(): Promise<AdminSiteIconRow[]> {
  const overrides = await getSiteIconOverrides();
  const resolved = resolveSiteIcons(overrides);
  return SITE_ICON_META.map((meta) => {
    const customUrl = overrides[meta.key]?.trim() || "";
    return {
      key: meta.key,
      label: meta.label,
      description: meta.description,
      group: meta.group,
      defaultUrl: meta.defaultUrl,
      customUrl,
      url: resolved[meta.key],
      isCustom: Boolean(customUrl),
    };
  });
}
