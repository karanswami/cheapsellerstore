/** Custom storefront footer social — any label/url/icon, add/remove freely. */
export type SiteSocialLink = {
  id: string;
  label: string;
  url: string;
  /** Optional custom icon; empty = letter / generic fallback in footer. */
  iconUrl: string;
};

export type SiteConfig = {
  siteName: string;
  siteTagline: string;
  siteSeoDescription: string;
  logoUrl: string;
  faviconUrl: string;
  ogImageUrl: string;
  primaryColor: string;
  primaryDarkColor: string;
  accentColor: string;
  accentDarkColor: string;
  successColor: string;
  successDarkColor: string;
  /** Ordered custom socials for the store footer (empty = none shown). */
  socialLinks: SiteSocialLink[];
};

export const SITE_CONFIG_DEFAULTS: SiteConfig = {
  siteName: "Cheap Seller",
  siteTagline: "Digital Product Store",
  siteSeoDescription: "Premium digital products delivered instantly.",
  logoUrl: "",
  faviconUrl: "",
  ogImageUrl: "",
  primaryColor: "#10b981",
  primaryDarkColor: "#10b981",
  accentColor: "#f5b942",
  accentDarkColor: "#f5b942",
  successColor: "#16c47f",
  successDarkColor: "#00e676",
  socialLinks: [],
};

export const SITE_SOCIAL_LINKS_MAX = 20;

export function brandInitial(siteName: string): string {
  const ch = siteName.trim().charAt(0);
  return ch ? ch.toUpperCase() : "D";
}

export function newSiteSocialLinkId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `social_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
