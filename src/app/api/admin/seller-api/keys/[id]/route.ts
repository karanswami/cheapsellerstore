import { jsonError, jsonOk } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  try {
    await requireAdmin();
  } catch {
    return jsonError("UNAUTHORIZED", "Admin only.", 401);
  }

  const { id } = await ctx.params;
  let body: { action?: string; rateLimitRpm?: number | null };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return jsonError("INVALID_BODY", "JSON required.", 400);
  }

  if (body.action !== "revoke" && body.action !== "setLimit") {
    return jsonError("INVALID_ACTION", "action must be revoke or setLimit.", 400);
  }

  const key = await prisma.sellerApiKey.findUnique({ where: { id } });
  if (!key) return jsonError("NOT_FOUND", "Key not found.", 404);

  if (body.action === "setLimit") {
    // null = fall back to the platform default.
    const rpm = body.rateLimitRpm == null ? null : Math.min(300, Math.max(1, Math.round(Number(body.rateLimitRpm)) || 1));
    await prisma.sellerApiKey.update({ where: { id }, data: { rateLimitRpm: rpm } });
    return jsonOk({ ok: true, rateLimitRpm: rpm });
  }

  await prisma.sellerApiKey.update({
    where: { id },
    data: { status: "REVOKED" },
  });
  return jsonOk({ ok: true });
}
