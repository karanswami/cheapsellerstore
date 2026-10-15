import { jsonError, jsonOk } from "@/lib/api";
import { requireCustomer } from "@/lib/auth/customer";
import { claimGiftCode, listMyGiftClaims } from "@/lib/gift-codes";
import { formatMoney } from "@/lib/currencies";
import { isGiftCodesEnabled } from "@/lib/pages-enabled";
import { z } from "zod";

const claimSchema = z.object({
  code: z.string().trim().min(1).max(64),
});

export async function GET(request: Request) {
  let user;
  try {
    user = await requireCustomer();
  } catch {
    return jsonError("UNAUTHORIZED", "Login required.", 401);
  }

  if (!(await isGiftCodesEnabled())) {
    return jsonError(
      "GIFT_CODES_DISABLED",
      "Gift codes are turned off on this store.",
      403,
    );
  }

  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get("page") ?? 1) || 1;
  const limit = Number(searchParams.get("limit") ?? 20) || 20;

  const data = await listMyGiftClaims(user.id, { page, limit });
  return jsonOk(data);
}

export async function POST(request: Request) {
  let user;
  try {
    user = await requireCustomer();
  } catch {
    return jsonError("UNAUTHORIZED", "Login required.", 401);
  }

  if (!(await isGiftCodesEnabled())) {
    return jsonError(
      "GIFT_CODES_DISABLED",
      "Gift codes are turned off on this store.",
      403,
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = claimSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("VALIDATION", "Enter a gift code.", 400);
  }

  try {
    const result = await claimGiftCode({
      code: parsed.data.code,
      userId: user.id,
    });
    return jsonOk({
      ...result,
      message: `Credited ${formatMoney(result.amount)} to your wallet.`,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "CLAIM_FAILED";
    if (msg === "NOT_FOUND" || msg === "INVALID_CODE") {
      return jsonError("NOT_FOUND", "Gift code not found.", 404);
    }
    if (msg === "ALREADY_CLAIMED") {
      return jsonError("ALREADY_CLAIMED", "This code was already claimed.", 409);
    }
    if (msg === "DISABLED") {
      return jsonError("DISABLED", "This gift code is disabled.", 400);
    }
    if (msg === "EXPIRED") {
      return jsonError("EXPIRED", "This gift code has expired.", 400);
    }
    if (msg === "NOT_ASSIGNED") {
      return jsonError(
        "NOT_ASSIGNED",
        "This gift code is reserved for another user.",
        403,
      );
    }
    if (msg === "USER_BANNED") {
      return jsonError("USER_BANNED", "Your account cannot claim codes.", 403);
    }
    console.error("[gift-codes] claim", e);
    return jsonError("SERVER", "Could not claim gift code.", 500);
  }
}
