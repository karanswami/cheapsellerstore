/** Client-safe referral helpers (no Prisma). */

export function normalizeReferralCode(value?: string | null): string {
  if (!value) return "";
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

export function buildReferralLink(origin: string, referralCode: string): string {
  const base = origin.replace(/\/$/, "");
  return `${base}/?auth=register&ref=${encodeURIComponent(referralCode)}`;
}

export function formatReferralRewardNote(note: string | null): string {
  if (!note) return "Referral reward";
  if (note === "referral") return "User purchase commission";
  if (note === "seller-purchase") return "Seller purchase commission";
  if (note === "reseller-purchase") return "Reseller purchase commission";
  return note;
}
