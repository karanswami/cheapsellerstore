import { jsonError, jsonOk } from "@/lib/api";
import { getSessionUserId, toSafeUser } from "@/lib/auth/customer";
import { prisma } from "@/lib/prisma";
import {
  hasPremiumAccess,
  isReservedReferralCode,
  normalizeVanityReferralCode,
} from "@/lib/premium-utils";
import { z } from "zod";

const schema = z.object({
  referralCode: z
    .string()
    .trim()
    .min(4, "Referral code must be 4–16 characters.")
    .max(16, "Referral code must be 4–16 characters.")
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Referral code must be letters, numbers, or _.",
    ),
});

export async function PATCH(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return jsonError("UNAUTHORIZED", "Sign in to set a referral code.", 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("INVALID_JSON", "Invalid request body.", 400);
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      "VALIDATION",
      parsed.error.issues[0]?.message ?? "Invalid referral code.",
      400,
    );
  }

  const code = normalizeVanityReferralCode(parsed.data.referralCode);
  if (code.length < 4 || code.length > 16) {
    return jsonError(
      "VALIDATION",
      "Referral code must be 4–16 characters.",
      400,
    );
  }
  if (isReservedReferralCode(code)) {
    return jsonError("RESERVED", "That referral code is reserved.", 400);
  }

  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { isPremium: true, referralCode: true },
  });
  if (!existing) {
    return jsonError("NOT_FOUND", "Account not found.", 404);
  }
  if (!hasPremiumAccess(existing)) {
    return jsonError(
      "FORBIDDEN",
      "Premium required to set a custom referral code.",
      403,
    );
  }
  if (existing.referralCode === code) {
    return jsonError("VALIDATION", "That is already your referral code.", 400);
  }

  const clash = await prisma.user.findFirst({
    where: { referralCode: code, NOT: { id: userId } },
    select: { id: true },
  });
  if (clash) {
    return jsonError("CODE_TAKEN", "Referral code is already taken.", 409);
  }

  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { referralCode: code },
    });
    return jsonOk({ user: toSafeUser(user) });
  } catch {
    return jsonError("CODE_TAKEN", "Referral code is already taken.", 409);
  }
}
