import { jsonError, jsonOk } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/prisma";
import { KeyStatus } from "@prisma/client";
import { z } from "zod";

const schema = z.object({
  durationId: z.string().min(1),
  codes: z.array(z.string().trim().min(1).max(500)).min(1).max(500),
});

export async function POST(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return jsonError("UNAUTHORIZED", "Admin required.", 401);
  }
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError("VALIDATION", "Invalid import.", 400);

  const duration = await prisma.duration.findUnique({
    where: { id: parsed.data.durationId },
    select: { id: true },
  });
  if (!duration) return jsonError("NOT_FOUND", "Duration not found.", 404);

  const seen = new Set<string>();
  const rejected: { code: string; reason: string }[] = [];
  const candidates: string[] = [];

  for (const raw of parsed.data.codes) {
    const code = raw.trim();
    if (!code) continue;
    if (seen.has(code)) {
      rejected.push({ code, reason: "Duplicate in paste" });
      continue;
    }
    seen.add(code);
    candidates.push(code);
  }

  if (candidates.length === 0) {
    return jsonError("VALIDATION", "No valid codes to import.", 400);
  }

  const existing = await prisma.key.findMany({
    where: { code: { in: candidates } },
    select: { code: true },
  });
  const existingSet = new Set(existing.map((k) => k.code));
  const toImport: string[] = [];
  for (const code of candidates) {
    if (existingSet.has(code)) {
      rejected.push({ code, reason: "Already in inventory" });
    } else {
      toImport.push(code);
    }
  }

  let imported = 0;
  if (toImport.length > 0) {
    const result = await prisma.key.createMany({
      data: toImport.map((code) => ({
        code,
        durationId: parsed.data.durationId,
        status: KeyStatus.AVAILABLE,
      })),
    });
    imported = result.count;
  }

  return jsonOk({ imported, rejected, skipped: rejected.length });
}
