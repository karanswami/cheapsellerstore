import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";

export const RESET_LINK_TTL_MS = 30 * 60 * 1000;

/** Shares the PasswordResetOtp table; the `reset:` prefix keeps it apart from email-verify codes. */
const key = (email: string) => `reset:${email.toLowerCase().trim()}`;
// The token is 256 random bits, so a plain SHA-256 at rest is enough (no slow hash needed).
const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

/** Issue a fresh single-use token, replacing any earlier one. Plaintext is only returned here. */
export async function createPasswordResetLink(email: string): Promise<string> {
  const k = key(email);
  const token = randomBytes(32).toString("hex");
  await prisma.passwordResetOtp.deleteMany({ where: { email: k } });
  await prisma.passwordResetOtp.create({
    data: { email: k, codeHash: sha256(token), expiresAt: new Date(Date.now() + RESET_LINK_TTL_MS) },
  });
  return token;
}

export async function discardPasswordResetLink(email: string) {
  await prisma.passwordResetOtp.deleteMany({ where: { email: key(email) } });
}

export async function consumePasswordResetLink(email: string, token: string) {
  const k = key(email);
  const record = await prisma.passwordResetOtp.findFirst({ where: { email: k }, orderBy: { createdAt: "desc" } });
  if (!record) return { ok: false as const, reason: "INVALID" as const };
  if (record.expiresAt.getTime() < Date.now()) {
    await prisma.passwordResetOtp.deleteMany({ where: { email: k } });
    return { ok: false as const, reason: "EXPIRED" as const };
  }
  const a = Buffer.from(sha256(token));
  const b = Buffer.from(record.codeHash);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false as const, reason: "INVALID" as const };
  }
  // Single use: only one concurrent request can delete the row and win.
  const claimed = await prisma.passwordResetOtp.deleteMany({ where: { id: record.id } });
  if (claimed.count === 0) return { ok: false as const, reason: "INVALID" as const };
  return { ok: true as const };
}
