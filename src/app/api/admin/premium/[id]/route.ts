import { jsonError, jsonOk } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/admin";
import { adminUpdatePremium } from "@/lib/premium";
import { z } from "zod";

const schema = z.object({
  isPremium: z.boolean().optional(),
  emailVerified: z.boolean().optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    await requireAdmin();
  } catch {
    return jsonError("UNAUTHORIZED", "Admin required.", 401);
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return jsonError("VALIDATION", "Invalid payload.", 400);
  }
  if (
    parsed.data.isPremium === undefined &&
    parsed.data.emailVerified === undefined
  ) {
    return jsonError("VALIDATION", "Nothing to update.", 400);
  }

  try {
    const user = await adminUpdatePremium(id, parsed.data);
    return jsonOk({ user });
  } catch (err) {
    if (err instanceof Error && err.message === "USER_NOT_FOUND") {
      return jsonError("NOT_FOUND", "User not found.", 404);
    }
    console.error("[admin/premium/[id]]", err);
    return jsonError("INTERNAL_ERROR", "Could not update Premium.", 500);
  }
}
