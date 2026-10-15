import { jsonError, jsonOk } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/admin";
import { isIconImageUrl } from "@/lib/public-uploads";
import {
  listAdminSiteIcons,
  saveSiteIconOverrides,
} from "@/lib/site-icons";
import { SITE_ICON_KEYS, isSiteIconKey } from "@/types/site-icons";
import { z } from "zod";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return jsonError("UNAUTHORIZED", "Admin required.", 401);
  }

  return jsonOk({ icons: await listAdminSiteIcons() });
}

const schema = z.object({
  key: z
    .string()
    .trim()
    .refine((v) => isSiteIconKey(v), "Unknown icon key"),
  /** Empty string clears custom override (back to default). */
  url: z
    .string()
    .trim()
    .max(500)
    .refine((v) => isIconImageUrl(v), "Invalid icon URL"),
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
    return jsonError("VALIDATION", "Invalid icon payload.", 400);
  }

  const { key, url } = parsed.data;
  if (!SITE_ICON_KEYS.includes(key)) {
    return jsonError("VALIDATION", "Unknown icon key.", 400);
  }

  await saveSiteIconOverrides({ [key]: url });
  return jsonOk({ icons: await listAdminSiteIcons() });
}
