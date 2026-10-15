import { prisma } from "@/lib/prisma";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomCode(length = 8): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return out;
}

/** Ensure user has a unique referralCode; returns the code. */
export async function ensureReferralCode(userId: string): Promise<string> {
  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { referralCode: true },
  });
  if (existing?.referralCode) return existing.referralCode;

  for (let attempt = 0; attempt < 12; attempt++) {
    const code = randomCode();
    const clash = await prisma.user.findFirst({
      where: { referralCode: code },
      select: { id: true },
    });
    if (clash) continue;
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { referralCode: code },
      });
      return code;
    } catch {
      // race — retry
    }
  }
  throw new Error("REFERRAL_CODE_FAILED");
}

export function generateReferralCodeCandidate(): string {
  return randomCode();
}
