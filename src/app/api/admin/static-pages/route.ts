import { jsonError, jsonOk } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  slug: z.string().trim().min(1).max(80).regex(/^[a-z0-9-]+$/),
  title: z.string().trim().min(1).max(160),
  seoTitle: z.string().optional().nullable(),
  seoDescription: z.string().optional().nullable(),
  content: z.string().min(1),
  active: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return jsonError("UNAUTHORIZED", "Admin required.", 401);
  }
  const pages = await prisma.staticPage.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }] });
  return jsonOk({ pages });
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return jsonError("UNAUTHORIZED", "Admin required.", 401);
  }
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError("VALIDATION", parsed.error.issues[0]?.message ?? "Invalid.", 400);
  try {
    const page = await prisma.staticPage.create({ data: parsed.data });
    return jsonOk({ page });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("Unique constraint") || message.includes("duplicate")) {
      return jsonError("CONFLICT", "A page with this slug already exists.", 409);
    }
    throw error;
  }
}
