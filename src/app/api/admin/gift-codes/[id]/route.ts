import { jsonError, jsonOk } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/admin";
import { disableGiftCode } from "@/lib/gift-codes";
import { z } from "zod";

const patchSchema = z.object({
  action: z.enum(["disable"]),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return jsonError("UNAUTHORIZED", "Admin required.", 401);
  }

  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("VALIDATION", "Invalid action.", 400);
  }

  try {
    await disableGiftCode(id, admin.id);
    return jsonOk({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "FAILED";
    if (msg === "NOT_FOUND") {
      return jsonError("NOT_FOUND", "Gift code not found.", 404);
    }
    if (msg === "ALREADY_CLAIMED") {
      return jsonError(
        "ALREADY_CLAIMED",
        "Claimed codes cannot be disabled.",
        409,
      );
    }
    console.error("[admin/gift-codes] patch", e);
    return jsonError("SERVER", "Could not update gift code.", 500);
  }
}
