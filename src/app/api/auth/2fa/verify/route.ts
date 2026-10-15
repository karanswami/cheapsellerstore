import { jsonError, jsonOk } from "@/lib/api";
import { logActivity } from "@/lib/activity-log";
import {
  clearTwoFactorChallengeCookie,
  readTwoFactorChallengeUserId,
} from "@/lib/auth/challenge";
import {
  setCustomerSessionCookie,
  toSafeUser,
} from "@/lib/auth/customer";
import {
  consumeBackupCode,
  decryptTotpSecret,
  verifyTotpCode,
} from "@/lib/auth/totp";
import { maintenanceLoginBlock } from "@/lib/maintenance";
import { homePathForRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { twoFactorCodeSchema } from "@/lib/validations";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("INVALID_JSON", "Invalid request body.", 400);
  }

  const parsed = twoFactorCodeSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      "VALIDATION",
      parsed.error.issues[0]?.message ?? "Invalid input.",
      400,
    );
  }

  const userId = await readTwoFactorChallengeUserId();
  if (!userId) {
    return jsonError(
      "CHALLENGE_EXPIRED",
      "Your login challenge expired. Sign in again.",
      401,
    );
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.banned || !user.twoFactorEnabled || !user.twoFactorSecret) {
    await clearTwoFactorChallengeCookie();
    return jsonError("UNAUTHORIZED", "Unable to verify 2FA.", 401);
  }

  let secret: string;
  try {
    secret = decryptTotpSecret(user.twoFactorSecret);
  } catch {
    await clearTwoFactorChallengeCookie();
    return jsonError("UNAUTHORIZED", "Unable to verify 2FA.", 401);
  }

  const code = parsed.data.code;
  let ok = verifyTotpCode(secret, code);
  let remainingBackup = user.twoFactorBackupCodes ?? [];

  if (!ok) {
    const consumed = await consumeBackupCode(remainingBackup, code);
    if (consumed.ok) {
      ok = true;
      remainingBackup = consumed.remaining;
      await prisma.user.update({
        where: { id: user.id },
        data: { twoFactorBackupCodes: remainingBackup },
      });
    }
  }

  if (!ok) {
    logActivity({
      request,
      action: "LOGIN_FAILED",
      category: "SECURITY",
      message: `Invalid 2FA code (@${user.username})`,
      user,
      success: false,
      metadata: { reason: "invalid_2fa" },
    });
    return jsonError("INVALID_CODE", "Invalid authenticator or backup code.", 401);
  }

  const role = user.role ?? "USER";
  const maint = await maintenanceLoginBlock(role);
  if (maint) {
    await clearTwoFactorChallengeCookie();
    return maint;
  }

  await clearTwoFactorChallengeCookie();
  await setCustomerSessionCookie(user.id, role);

  logActivity({
    request,
    action: "LOGIN_SUCCESS",
    category: "AUTH",
    message: `Logged in via 2FA (@${user.username})`,
    user,
    metadata: { method: "2fa" },
  });

  return jsonOk({
    user: toSafeUser(user),
    redirectTo: homePathForRole(role),
  });
}
