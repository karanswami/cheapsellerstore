import { jsonError, jsonOk } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  question: z.string().trim().min(1).max(300),
  answer: z.string().trim().min(1).max(5000),
  category: z.string().optional().nullable(),
  active: z.boolean().default(true),
  sortOrder: z.number().int().default(100),
});

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return jsonError("UNAUTHORIZED", "Admin required.", 401);
  }
  const faqs = await prisma.faqItem.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }] });
  return jsonOk({ faqs });
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return jsonError("UNAUTHORIZED", "Admin required.", 401);
  }
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError("VALIDATION", "Invalid payload.", 400);
  const faq = await prisma.faqItem.create({ data: parsed.data });
  return jsonOk({ faq });
}
