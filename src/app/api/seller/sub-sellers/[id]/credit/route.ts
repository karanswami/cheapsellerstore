import { jsonError, jsonOk } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth/customer";
import { creditOwnReseller } from "@/lib/resellers";
import { UserRole } from "@prisma/client";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

const schema = z.object({
  /** Signed USD: positive adds from reseller wallet; negative reclaims to reseller. */
  amountUsd: z.number().refine((n) => n !== 0, "Amount cannot be zero."),
});

export async function POST(request: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return jsonError("UNAUTHORIZED", "Login required.", 401);
  if (user.role !== UserRole.SELLER || !user.canFundResellers) {
    return jsonError("FORBIDDEN", "Funding not allowed.", 403);
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return jsonError("VALIDATION", "Enter a non-zero USD amount.", 400);
  }

  try {
    await creditOwnReseller({
      sellerId: user.id,
      resellerId: id,
      amountUsd: parsed.data.amountUsd,
    });
    return jsonOk({ ok: true });
  } catch (e) {
    const code = e instanceof Error ? e.message : "ERROR";
    if (code === "NOT_FOUND") {
      return jsonError("NOT_FOUND", "Reseller not found.", 404);
    }
    if (code === "FORBIDDEN") {
      return jsonError("FORBIDDEN", "Funding not allowed.", 403);
    }
    if (code === "RECLAIM_OWN_FUNDS") {
      return jsonError(code, "You can only reclaim what you funded. The rest is the reseller's own deposit.", 400);
    }
    if (code === "INSUFFICIENT_BALANCE") {
      return jsonError(
        code,
        parsed.data.amountUsd > 0
          ? "Insufficient wallet balance."
          : "Reseller has insufficient balance.",
        400,
      );
    }
    return jsonError(code, "Balance adjust failed.", 400);
  }
}
