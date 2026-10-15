import { jsonError, jsonOk } from "@/lib/api";
import { logActivity } from "@/lib/activity-log";
import { getSessionUserId, toSafeUser } from "@/lib/auth/customer";
import {
  decryptTotpSecret,
  generateBackupCodes,
  verifyTotpCode,
} from "@/lib/auth/totp";
import { prisma } from "@/lib/prisma";
import { twoFactorEnableSchema } from "@/lib/validations";

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return jsonError("UNAUTHORIZED", "Sign in to enable 2FA.", 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("INVALID_JSON", "Invalid request body.", 400);
  }

  const parsed = twoFactorEnableSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      "VALIDATION",
      parsed.error.issues[0]?.message ?? "Invalid input.",
      400,
    );
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.banned) {
    return jsonError("UNAUTHORIZED", "Sign in to enable 2FA.", 401);
  }

  if (user.twoFactorEnabled) {
    return jsonError(
      "ALREADY_ENABLED",
      "Two-factor authentication is already enabled.",
      409,
    );
  }

  if (!user.twoFactorSecret) {
    return jsonError(
      "SETUP_REQUIRED",
      "Start 2FA setup before confirming the code.",
      400,
    );
  }

  let secret: string;
  try {
    secret = decryptTotpSecret(user.twoFactorSecret);
  } catch {
    return jsonError("SETUP_CORRUPT", "Restart 2FA setup and try again.", 400);
  }

  if (!verifyTotpCode(secret, parsed.data.code)) {
    return jsonError("INVALID_CODE", "Invalid authenticator code.", 401);
  }

  const { codes, hashes } = await generateBackupCodes();
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      twoFactorEnabled: true,
      twoFactorBackupCodes: hashes,
    },
  });

  logActivity({
    request,
    action: "2FA_ENABLE",
    category: "AUTH",
    message: `2FA enabled (@${updated.username})`,
    user: updated,
  });

  return jsonOk({
    user: toSafeUser(updated),
    backupCodes: codes,
  });
}
