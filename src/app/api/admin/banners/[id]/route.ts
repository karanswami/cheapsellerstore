import { jsonError, jsonOk } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/admin";
import { isBannerImageUrl } from "@/lib/public-uploads";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const imageUrlSchema = z
  .string()
  .trim()
  .min(1)
  .max(600)
  .refine((value) => isBannerImageUrl(value), {
    message: "Invalid image URL.",
  });

const schema = z.object({
  title: z.string().trim().max(120).optional(),
  imageUrl: imageUrlSchema.optional(),
  active: z.boolean().optional(),
  priority: z.number().int().min(0).max(10000).optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    await requireAdmin();
  } catch {
    return jsonError("UNAUTHORIZED", "Admin required.", 401);
  }
  const { id } = await params;
  if (!/^[a-f0-9]{24}$/i.test(id)) {
    return jsonError("VALIDATION", "Invalid banner id.", 400);
  }
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return jsonError("VALIDATION", "Invalid payload.", 400);
  }

  const data: {
    title?: string;
    imageUrl?: string;
    active?: boolean;
    priority?: number;
    ctaText?: null;
    ctaLink?: null;
    description?: null;
    displayLocation?: string;
  } = {};

  if (parsed.data.title !== undefined) {
    const title = parsed.data.title.trim();
    if (title) data.title = title;
  }
  if (parsed.data.imageUrl !== undefined) data.imageUrl = parsed.data.imageUrl;
  if (parsed.data.active !== undefined) data.active = parsed.data.active;
  if (parsed.data.priority !== undefined) data.priority = parsed.data.priority;

  // Keep banners image-only on the storefront.
  data.ctaText = null;
  data.ctaLink = null;
  data.description = null;
  data.displayLocation = "home";

  try {
    const banner = await prisma.banner.update({ where: { id }, data });
    return jsonOk({ banner });
  } catch {
    return jsonError("NOT_FOUND", "Banner not found.", 404);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    await requireAdmin();
  } catch {
    return jsonError("UNAUTHORIZED", "Admin required.", 401);
  }
  const { id } = await params;
  if (!/^[a-f0-9]{24}$/i.test(id)) {
    return jsonError("VALIDATION", "Invalid banner id.", 400);
  }
  try {
    await prisma.banner.delete({ where: { id } });
    return jsonOk({ ok: true });
  } catch {
    return jsonError("NOT_FOUND", "Banner not found.", 404);
  }
}
