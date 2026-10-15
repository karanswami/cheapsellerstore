/** Client-safe Premium helpers (no Prisma). */

export const USERNAME_CHANGE_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;

const RESERVED_REFERRAL_CODES = new Set([
  "ADMIN",
  "DRIP",
  "SUPPORT",
  "HELP",
  "ROOT",
  "SYSTEM",
  "NULL",
  "UNDEFINED",
  "API",
  "WWW",
  "OWNER",
  "STAFF",
  "MOD",
  "MODERATOR",
]);

export function hasPremiumAccess(user: { isPremium?: boolean | null }): boolean {
  return Boolean(user.isPremium);
}

export function normalizeVanityReferralCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "");
}

export function isReservedReferralCode(code: string): boolean {
  return RESERVED_REFERRAL_CODES.has(normalizeVanityReferralCode(code));
}

export function canChangeUsername(usernameChangedAt: Date | string | null): {
  ok: boolean;
  nextAt: Date | null;
} {
  if (!usernameChangedAt) return { ok: true, nextAt: null };
  const last =
    typeof usernameChangedAt === "string"
      ? new Date(usernameChangedAt)
      : usernameChangedAt;
  if (Number.isNaN(last.getTime())) return { ok: true, nextAt: null };
  const nextAt = new Date(last.getTime() + USERNAME_CHANGE_COOLDOWN_MS);
  return { ok: Date.now() >= nextAt.getTime(), nextAt };
}
