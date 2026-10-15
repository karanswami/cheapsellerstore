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
  let body: { action?: string };
  try {
    body = (await req.json()) as { action?: string };
  } catch {
    return jsonError("INVALID_BODY", "JSON required.", 400);
  }

  if (body.action !== "revoke") {
    return jsonError("INVALID_ACTION", "action must be revoke.", 400);
  }

  const key = await prisma.sellerApiKey.findUnique({ where: { id } });
  if (!key) return jsonError("NOT_FOUND", "Key not found.", 404);

  await prisma.sellerApiKey.update({
    where: { id },
    data: { status: "REVOKED" },
  });
  return jsonOk({ ok: true });
}
