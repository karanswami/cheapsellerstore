import { jsonError, jsonOk } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/prisma";
import { KeyStatus } from "@prisma/client";
import type { NextRequest } from "next/server";

export async function DELETE(
  _request: NextRequest,
  context: RouteContext<"/api/admin/keys/[id]">,
) {
  try {
    await requireAdmin();
  } catch {
    return jsonError("UNAUTHORIZED", "Admin required.", 401);
  }
  const { id } = await context.params;
  const key = await prisma.key.findUnique({ where: { id } });
  if (!key) return jsonError("NOT_FOUND", "Key not found.", 404);
  if (key.status !== KeyStatus.AVAILABLE) {
    return jsonError("CONFLICT", "Only AVAILABLE keys can be deleted.", 409);
  }
  await prisma.key.delete({ where: { id } });
  return jsonOk({ ok: true });
}
