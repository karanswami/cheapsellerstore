import { jsonError, jsonOk } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/admin";
import { isSiteImageUrl } from "@/lib/public-uploads";
import {
  getSiteConfig,
  isHexColor,
  normalizeHexColor,
  saveSiteConfig,
} from "@/lib/site-config";
import {
  SITE_CONFIG_DEFAULTS,
  SITE_SOCIAL_LINKS_MAX,
} from "@/types/site-config";
import { z } from "zod";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return jsonError("UNAUTHORIZED", "Admin required.", 401);
  }

  return jsonOk(await getSiteConfig());
}

const hex = z
  .string()
  .trim()
  .refine((v) => isHexColor(v), "Invalid hex color");

const imageUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => isSiteImageUrl(v), "Invalid image URL");

const socialUrl = z
  .string()
  .trim()
  .max(500)
  .refine(
    (v) => /^https?:\/\//i.test(v),
    "Social URL must start with http(s)://",
  );

const socialLinkSchema = z.object({
  id: z.string().trim().min(1).max(80),
  label: z.string().trim().min(1).max(40),
  url: socialUrl,
  iconUrl: imageUrl,
});

const schema = z.object({
  siteName: z.string().trim().min(1).max(80).optional(),
  siteTagline: z.string().max(200).optional(),
  siteSeoDescription: z.string().max(300).optional(),
  logoUrl: imageUrl.optional(),
  faviconUrl: imageUrl.optional(),
  ogImageUrl: imageUrl.optional(),
  primaryColor: hex.optional(),
  primaryDarkColor: hex.optional(),
  accentColor: hex.optional(),
  accentDarkColor: hex.optional(),
  successColor: hex.optional(),
  successDarkColor: hex.optional(),
  socialLinks: z.array(socialLinkSchema).max(SITE_SOCIAL_LINKS_MAX).optional(),
});

export async function PATCH(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return jsonError("UNAUTHORIZED", "Admin required.", 401);
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return jsonError("VALIDATION", "Invalid site config payload.", 400);
  }

  const d = SITE_CONFIG_DEFAULTS;
  const data = parsed.data;

  await saveSiteConfig({
    siteName: data.siteName,
    siteTagline: data.siteTagline,
    siteSeoDescription: data.siteSeoDescription,
    logoUrl: data.logoUrl,
    faviconUrl: data.faviconUrl,
    ogImageUrl: data.ogImageUrl,
    primaryColor: data.primaryColor
      ? normalizeHexColor(data.primaryColor, d.primaryColor)
      : undefined,
    primaryDarkColor: data.primaryDarkColor
      ? normalizeHexColor(data.primaryDarkColor, d.primaryDarkColor)
      : undefined,
    accentColor: data.accentColor
      ? normalizeHexColor(data.accentColor, d.accentColor)
      : undefined,
    accentDarkColor: data.accentDarkColor
      ? normalizeHexColor(data.accentDarkColor, d.accentDarkColor)
      : undefined,
    successColor: data.successColor
      ? normalizeHexColor(data.successColor, d.successColor)
      : undefined,
    successDarkColor: data.successDarkColor
      ? normalizeHexColor(data.successDarkColor, d.successDarkColor)
      : undefined,
    socialLinks: data.socialLinks,
  });

  return jsonOk(await getSiteConfig());
}
