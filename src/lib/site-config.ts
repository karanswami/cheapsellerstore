import { getSetting, getSettingText, SETTING_KEYS, upsertSetting } from "@/lib/settings";
import {
  SITE_CONFIG_DEFAULTS,
  SITE_SOCIAL_LINKS_MAX,
  type SiteConfig,
  type SiteSocialLink,
} from "@/types/site-config";
import { cache } from "react";

const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export function isHexColor(value: string): boolean {
  return HEX_RE.test(value.trim());
}

export function normalizeHexColor(value: string, fallback: string): string {
  const raw = value.trim();
  if (!isHexColor(raw)) return fallback;
  if (raw.length === 4) {
    const r = raw[1];
    const g = raw[2];
    const b = raw[3];
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return raw.toLowerCase();
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const n = normalizeHexColor(hex, "");
  if (!n || n.length !== 7) return null;
  return {
    r: Number.parseInt(n.slice(1, 3), 16),
    g: Number.parseInt(n.slice(3, 5), 16),
    b: Number.parseInt(n.slice(5, 7), 16),
  };
}

function mixToward(
  hex: string,
  toward: "black" | "white",
  amount: number,
): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const t = toward === "black" ? 0 : 255;
  const mix = (c: number) =>
    Math.round(c + (t - c) * Math.min(1, Math.max(0, amount)));
  const r = mix(rgb.r).toString(16).padStart(2, "0");
  const g = mix(rgb.g).toString(16).padStart(2, "0");
  const b = mix(rgb.b).toString(16).padStart(2, "0");
  return `#${r}${g}${b}`;
}

function rgba(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return `rgba(0,0,0,${alpha})`;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

function normalizeSocialLink(raw: unknown): SiteSocialLink | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const id = typeof row.id === "string" ? row.id.trim() : "";
  const label = typeof row.label === "string" ? row.label.trim() : "";
  const url = typeof row.url === "string" ? row.url.trim() : "";
  const iconUrl = typeof row.iconUrl === "string" ? row.iconUrl.trim() : "";
  if (!id || !label || !url) return null;
  if (!/^https?:\/\//i.test(url)) return null;
  return { id, label: label.slice(0, 40), url: url.slice(0, 500), iconUrl: iconUrl.slice(0, 500) };
}

export function parseSiteSocialLinks(raw: string | null | undefined): SiteSocialLink[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const out: SiteSocialLink[] = [];
    for (const item of parsed) {
      const link = normalizeSocialLink(item);
      if (link) out.push(link);
      if (out.length >= SITE_SOCIAL_LINKS_MAX) break;
    }
    return out;
  } catch {
    return [];
  }
}

async function loadSocialLinksFromLegacy(): Promise<SiteSocialLink[]> {
  const legacy = [
    {
      id: "legacy_telegram",
      label: "Telegram",
      urlKey: SETTING_KEYS.siteSocialTelegramUrl,
      iconKey: SETTING_KEYS.siteSocialTelegramIconUrl,
    },
    {
      id: "legacy_discord",
      label: "Discord",
      urlKey: SETTING_KEYS.siteSocialDiscordUrl,
      iconKey: SETTING_KEYS.siteSocialDiscordIconUrl,
    },
    {
      id: "legacy_youtube",
      label: "YouTube",
      urlKey: SETTING_KEYS.siteSocialYoutubeUrl,
      iconKey: SETTING_KEYS.siteSocialYoutubeIconUrl,
    },
    {
      id: "legacy_twitter",
      label: "X / Twitter",
      urlKey: SETTING_KEYS.siteSocialTwitterUrl,
      iconKey: SETTING_KEYS.siteSocialTwitterIconUrl,
    },
    {
      id: "legacy_instagram",
      label: "Instagram",
      urlKey: SETTING_KEYS.siteSocialInstagramUrl,
      iconKey: SETTING_KEYS.siteSocialInstagramIconUrl,
    },
  ] as const;

  const pairs = await Promise.all(
    legacy.map(async (item) => {
      const [url, iconUrl] = await Promise.all([
        getSettingText(item.urlKey, ""),
        getSettingText(item.iconKey, ""),
      ]);
      return normalizeSocialLink({
        id: item.id,
        label: item.label,
        url,
        iconUrl,
      });
    }),
  );

  return pairs.filter((x): x is SiteSocialLink => Boolean(x));
}

async function resolveSocialLinks(): Promise<SiteSocialLink[]> {
  const row = await getSetting(SETTING_KEYS.siteSocialLinks);
  if (row?.textValue != null) {
    return parseSiteSocialLinks(row.textValue);
  }
  return loadSocialLinksFromLegacy();
}

export const getSiteConfig = cache(async (): Promise<SiteConfig> => {
  const d = SITE_CONFIG_DEFAULTS;
  const [
    siteName,
    siteTagline,
    siteSeoDescription,
    logoUrl,
    faviconUrl,
    ogImageUrl,
    primaryColor,
    primaryDarkColor,
    accentColor,
    accentDarkColor,
    successColor,
    successDarkColor,
    socialLinks,
  ] = await Promise.all([
    getSettingText(SETTING_KEYS.siteName, d.siteName),
    getSettingText(SETTING_KEYS.siteTagline, d.siteTagline),
    getSettingText(SETTING_KEYS.siteSeoDescription, d.siteSeoDescription),
    getSettingText(SETTING_KEYS.siteLogoUrl, d.logoUrl),
    getSettingText(SETTING_KEYS.siteFaviconUrl, d.faviconUrl),
    getSettingText(SETTING_KEYS.siteOgImageUrl, d.ogImageUrl),
    getSettingText(SETTING_KEYS.sitePrimaryColor, d.primaryColor),
    getSettingText(SETTING_KEYS.sitePrimaryDarkColor, d.primaryDarkColor),
    getSettingText(SETTING_KEYS.siteAccentColor, d.accentColor),
    getSettingText(SETTING_KEYS.siteAccentDarkColor, d.accentDarkColor),
    getSettingText(SETTING_KEYS.siteSuccessColor, d.successColor),
    getSettingText(SETTING_KEYS.siteSuccessDarkColor, d.successDarkColor),
    resolveSocialLinks(),
  ]);

  return {
    siteName: siteName.trim() || d.siteName,
    siteTagline,
    siteSeoDescription,
    logoUrl,
    faviconUrl,
    ogImageUrl,
    primaryColor: normalizeHexColor(primaryColor, d.primaryColor),
    primaryDarkColor: normalizeHexColor(primaryDarkColor, d.primaryDarkColor),
    accentColor: normalizeHexColor(accentColor, d.accentColor),
    accentDarkColor: normalizeHexColor(accentDarkColor, d.accentDarkColor),
    successColor: normalizeHexColor(successColor, d.successColor),
    successDarkColor: normalizeHexColor(successDarkColor, d.successDarkColor),
    socialLinks,
  };
});

export async function saveSiteConfig(partial: Partial<SiteConfig>) {
  const writes: Promise<unknown>[] = [];

  const text = (
    key: (typeof SETTING_KEYS)[keyof typeof SETTING_KEYS],
    value: string | undefined,
  ) => {
    if (value === undefined) return;
    writes.push(upsertSetting({ key, textValue: value }));
  };

  text(SETTING_KEYS.siteName, partial.siteName);
  text(SETTING_KEYS.siteTagline, partial.siteTagline);
  text(SETTING_KEYS.siteSeoDescription, partial.siteSeoDescription);
  text(SETTING_KEYS.siteLogoUrl, partial.logoUrl);
  text(SETTING_KEYS.siteFaviconUrl, partial.faviconUrl);
  text(SETTING_KEYS.siteOgImageUrl, partial.ogImageUrl);
  text(SETTING_KEYS.sitePrimaryColor, partial.primaryColor);
  text(SETTING_KEYS.sitePrimaryDarkColor, partial.primaryDarkColor);
  text(SETTING_KEYS.siteAccentColor, partial.accentColor);
  text(SETTING_KEYS.siteAccentDarkColor, partial.accentDarkColor);
  text(SETTING_KEYS.siteSuccessColor, partial.successColor);
  text(SETTING_KEYS.siteSuccessDarkColor, partial.successDarkColor);

  if (partial.socialLinks !== undefined) {
    const cleaned = partial.socialLinks
      .map((item) => normalizeSocialLink(item))
      .filter((x): x is SiteSocialLink => Boolean(x))
      .slice(0, SITE_SOCIAL_LINKS_MAX);
    writes.push(
      upsertSetting({
        key: SETTING_KEYS.siteSocialLinks,
        textValue: JSON.stringify(cleaned),
      }),
    );
  }

  await Promise.all(writes);
}

function brandBlock(primary: string, accent: string, success: string) {
  const hover = mixToward(primary, "white", 0.12);
  return `
  --primary: ${primary};
  --primary-hover: ${hover};
  --brand-accent: ${accent};
  --neon-purple: ${primary};
  --neon-magenta: ${accent};
  --ring: ${accent};
  --success: ${success};
  --sidebar-primary: ${primary};
  --sidebar-ring: ${accent};
  --chart-1: ${primary};
  --chart-2: ${success};
  --chart-3: ${accent};
  --shadow: ${rgba(primary, 0.28)};
  --gradient-primary: linear-gradient(135deg, ${primary}, ${accent});
`.trim();
}

/** CSS overrides applied on top of globals.css brand tokens (dark-only app). */
export function siteConfigThemeCss(config: SiteConfig): string {
  const block = brandBlock(
    config.primaryDarkColor,
    config.accentDarkColor,
    config.successDarkColor,
  );
  return `
:root, .dark {
  ${block}
}
`.trim();
}
