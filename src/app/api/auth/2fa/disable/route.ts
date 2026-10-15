import { jsonError, jsonOk } from "@/lib/api";
import { logActivity } from "@/lib/activity-log";
import {
  getSessionUserId,
  toSafeUser,
  verifyPassword,
} from "@/lib/auth/customer";
import {
  consumeBackupCode,
  decryptTotpSecret,
  verifyTotpCode,
} from "@/lib/auth/totp";
import { prisma } from "@/lib/prisma";
import { twoFactorDisableSchema } from "@/lib/validations";

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return jsonError("UNAUTHORIZED", "Sign in to disable 2FA.", 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("INVALID_JSON", "Invalid request body.", 400);
  }

  const parsed = twoFactorDisableSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      "VALIDATION",
      parsed.error.issues[0]?.message ?? "Invalid input.",
      400,
    );
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.banned) {
    return jsonError("UNAUTHORIZED", "Sign in to disable 2FA.", 401);
  }

  if (!user.twoFactorEnabled) {
    return jsonError("NOT_ENABLED", "Two-factor authentication is not on.", 400);
  }

  const { password, code } = parsed.data;
  let authorized = false;

  if (password && user.passwordHash) {
    authorized = await verifyPassword(password, user.passwordHash);
  }

  if (!authorized && code && user.twoFactorSecret) {
    try {
      const secret = decryptTotpSecret(user.twoFactorSecret);
      if (verifyTotpCode(secret, code)) {
        authorized = true;
      } else {
        const consumed = await consumeBackupCode(
          user.twoFactorBackupCodes ?? [],
          code,
        );
        if (consumed.ok) {
          authorized = true;
        }
      }
    } catch {
      authorized = false;
    }
  }

  if (!authorized) {
    return jsonError(
      "UNAUTHORIZED",
      user.passwordHash
        ? "Password or authenticator code is incorrect."
        : "Authenticator or backup code is incorrect.",
      401,
    );
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      twoFactorEnabled: false,
      twoFactorSecret: null,
      twoFactorBackupCodes: [],
    },
  });

  logActivity({
    request,
    action: "2FA_DISABLE",
    category: "AUTH",
    message: `2FA disabled (@${updated.username})`,
    user: updated,
  });

  return jsonOk({ user: toSafeUser(updated) });
}
