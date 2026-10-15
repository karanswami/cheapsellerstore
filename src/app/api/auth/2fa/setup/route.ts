import { jsonError, jsonOk } from "@/lib/api";
import { getSessionUserId } from "@/lib/auth/customer";
import {
  buildTotp,
  encryptTotpSecret,
  generateTotpSecret,
  totpQrDataUrl,
} from "@/lib/auth/totp";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const userId = await getSessionUserId();
  if (!userId) {
    return jsonError("UNAUTHORIZED", "Sign in to set up 2FA.", 401);
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.banned) {
    return jsonError("UNAUTHORIZED", "Sign in to set up 2FA.", 401);
  }

  if (user.twoFactorEnabled) {
    return jsonError(
      "ALREADY_ENABLED",
      "Two-factor authentication is already enabled.",
      409,
    );
  }

  const secret = generateTotpSecret();
  const totp = buildTotp(secret, user.email);
  const otpauthUri = totp.toString();
  const qrDataUrl = await totpQrDataUrl(otpauthUri);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      twoFactorSecret: encryptTotpSecret(secret),
      twoFactorEnabled: false,
      twoFactorBackupCodes: [],
    },
  });

  return jsonOk({
    secret,
    otpauthUri,
    qrDataUrl,
  });
}
