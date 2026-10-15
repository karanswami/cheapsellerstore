import { hashPassword, verifyPassword } from "@/lib/auth/customer";
import { prisma } from "@/lib/prisma";

export const OTP_TTL_MS = 10 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;

export type CreatePasswordResetOtpResult =
  | { status: "reused" }
  | { status: "created"; code: string };

export function generateOtpCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/**
 * Issue a reset OTP, or reuse the existing one while it is still valid.
 * Plaintext is only available when a new code is created (hashed at rest).
 */
export async function createPasswordResetOtp(
  email: string,
): Promise<CreatePasswordResetOtpResult> {
  const normalized = email.toLowerCase().trim();
  const latest = await prisma.passwordResetOtp.findFirst({
    where: { email: normalized },
    orderBy: { createdAt: "desc" },
  });

  if (latest) {
    const expired = latest.expiresAt.getTime() < Date.now();
    const locked = latest.attempts >= OTP_MAX_ATTEMPTS;
    if (!expired && !locked) {
      return { status: "reused" };
    }
    await prisma.passwordResetOtp.deleteMany({ where: { email: normalized } });
  }

  const code = generateOtpCode();
  const codeHash = await hashPassword(code);
  await prisma.passwordResetOtp.create({
    data: {
      email: normalized,
      codeHash,
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
    },
  });

  return { status: "created", code };
}

export async function consumePasswordResetOtp(email: string, code: string) {
  const normalized = email.toLowerCase().trim();
  const record = await prisma.passwordResetOtp.findFirst({
    where: { email: normalized },
    orderBy: { createdAt: "desc" },
  });

  if (!record) {
    return { ok: false as const, reason: "INVALID" as const };
  }

  if (record.expiresAt.getTime() < Date.now()) {
    await prisma.passwordResetOtp.deleteMany({ where: { email: normalized } });
    return { ok: false as const, reason: "EXPIRED" as const };
  }

  if (record.attempts >= OTP_MAX_ATTEMPTS) {
    await prisma.passwordResetOtp.deleteMany({ where: { email: normalized } });
    return { ok: false as const, reason: "LOCKED" as const };
  }

  const valid = await verifyPassword(code, record.codeHash);
  if (!valid) {
    await prisma.passwordResetOtp.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });
    return { ok: false as const, reason: "INVALID" as const };
  }

  await prisma.passwordResetOtp.deleteMany({ where: { email: normalized } });
  return { ok: true as const };
}
