import { jsonError, jsonOk } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/admin";
import { approveDeposit, rejectDeposit } from "@/lib/deposits";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  action: z.enum(["approve", "reject", "dismiss"]),
  note: z.string().trim().max(500).optional(),
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
  if (!parsed.success) return jsonError("VALIDATION", "Invalid payload.", 400);

  if (parsed.data.action === "dismiss") {
    const deposit = await prisma.deposit.update({
      where: { id },
      data: {
        adminAction: "dismissed",
        adminNote: parsed.data.note ?? null,
        reviewedAt: new Date(),
      },
    });
    return jsonOk({ deposit });
  }

  const result =
    parsed.data.action === "approve"
      ? await approveDeposit(id, undefined, parsed.data.note)
      : await rejectDeposit(id, undefined, parsed.data.note);

  if (!result.ok) return jsonError(result.code, result.message, 400);
  return jsonOk({ deposit: result.deposit });
}
