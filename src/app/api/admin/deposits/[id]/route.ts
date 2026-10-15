import { jsonError, jsonOk } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/admin";
import { approveDeposit, rejectDeposit } from "@/lib/deposits";
import { z } from "zod";

const schema = z.object({
  action: z.enum(["approve", "reject"]),
  note: z.string().trim().max(500).optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return jsonError("UNAUTHORIZED", "Admin required.", 401);
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError("VALIDATION", "Invalid payload.", 400);

  const result =
    parsed.data.action === "approve"
      ? await approveDeposit(id, admin.id, parsed.data.note)
      : await rejectDeposit(id, admin.id, parsed.data.note);

  if (!result.ok) {
    return jsonError(result.code, result.message, 400);
  }

  return jsonOk({ deposit: result.deposit });
}
