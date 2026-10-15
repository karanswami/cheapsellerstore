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
  imageUrl: imageUrlSchema,
  active: z.boolean().default(true),
  priority: z.number().int().min(0).max(10000).default(100),
});

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return jsonError("UNAUTHORIZED", "Admin required.", 401);
  }
  const banners = await prisma.banner.findMany({
    orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
  });
  return jsonOk({ banners });
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return jsonError("UNAUTHORIZED", "Admin required.", 401);
  }
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return jsonError("VALIDATION", "Image is required.", 400);
  }

  const title =
    parsed.data.title?.trim() ||
    `Banner ${new Date().toISOString().slice(0, 10)}`;

  const banner = await prisma.banner.create({
    data: {
      title,
      imageUrl: parsed.data.imageUrl,
      active: parsed.data.active,
      priority: parsed.data.priority,
      displayLocation: "home",
      description: null,
      ctaText: null,
      ctaLink: null,
    },
  });
  return jsonOk({ banner });
}
