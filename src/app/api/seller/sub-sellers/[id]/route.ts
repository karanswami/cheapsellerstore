import { jsonError, jsonOk } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth/customer";
import { deleteOwnReseller, setOwnResellerBanned } from "@/lib/resellers";
import { UserRole } from "@prisma/client";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  banned: z.boolean(),
});

export async function PATCH(request: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return jsonError("UNAUTHORIZED", "Login required.", 401);
  if (user.role !== UserRole.SELLER || !user.canManageResellers) {
    return jsonError("FORBIDDEN", "Manage not allowed.", 403);
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("VALIDATION", "Invalid status.", 400);
  }

  try {
    const updated = await setOwnResellerBanned({
      sellerId: user.id,
      resellerId: id,
      banned: parsed.data.banned,
    });
    return jsonOk({ user: updated });
  } catch (e) {
    const code = e instanceof Error ? e.message : "ERROR";
    if (code === "NOT_FOUND") {
      return jsonError("NOT_FOUND", "Reseller not found.", 404);
    }
    if (code === "FORBIDDEN") {
      return jsonError("FORBIDDEN", "Manage not allowed.", 403);
    }
    if (code === "INDEPENDENT") {
      return jsonError(code, "This reseller has their own deposit access from admin, so you can't suspend or delete them.", 403);
    }
    return jsonError(code, "Failed to update status.", 400);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return jsonError("UNAUTHORIZED", "Login required.", 401);
  if (user.role !== UserRole.SELLER || !user.canManageResellers) {
    return jsonError("FORBIDDEN", "Manage not allowed.", 403);
  }

  const { id } = await params;

  try {
    await deleteOwnReseller({
      sellerId: user.id,
      resellerId: id,
    });
    return jsonOk({ ok: true });
  } catch (e) {
    const code = e instanceof Error ? e.message : "ERROR";
    if (code === "NOT_FOUND") {
      return jsonError("NOT_FOUND", "Reseller not found.", 404);
    }
    if (code === "FORBIDDEN") {
      return jsonError("FORBIDDEN", "Manage not allowed.", 403);
    }
    if (code === "INDEPENDENT") {
      return jsonError(code, "This reseller has their own deposit access from admin, so you can't suspend or delete them.", 403);
    }
    if (code === "INSUFFICIENT_BALANCE") {
      return jsonError(code, "Could not reclaim wallet balance.", 400);
    }
    return jsonError(code, "Failed to delete reseller.", 400);
  }
}
