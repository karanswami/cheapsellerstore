/*
  Seller program config (client-safe). On/off, auto-approve and the minimum
  wallet balance live in their own legacy setting keys; everything the admin
  can shape about the apply page + form lives in this one JSON blob.
*/

export type SellerFieldMode = "required" | "optional" | "hidden";

/** Form fields the admin can require, make optional or hide. */
export const SELLER_FIELDS = [
  { key: "facebookUrl", label: "Facebook profile link", placeholder: "https://facebook.com/…", url: true, step: "channels" },
  { key: "youtubeUrl", label: "YouTube channel", placeholder: "https://youtube.com/@…", url: true, step: "channels" },
  { key: "telegramChannelUrl", label: "Telegram channel / group", placeholder: "https://t.me/…", url: true, step: "channels" },
  { key: "websiteUrl", label: "Website", placeholder: "https://", url: true, step: "channels" },
  { key: "sellingPlatform", label: "Where will you sell?", placeholder: "Telegram, Discord, website…", url: false, step: "business" },
  { key: "followerCount", label: "Members / followers", placeholder: "e.g. 2,500", url: false, step: "business" },
  { key: "experience", label: "Selling experience", placeholder: "e.g. 2 years", url: false, step: "business" },
] as const;

export type SellerFieldKey = (typeof SELLER_FIELDS)[number]["key"];

export type SellerProgramConfig = {
  /** Hero title on /app/become-seller. */
  headline: string;
  /** Shown instead of the form while applications are closed. */
  closedMessage: string;
  /** "What you get" list. */
  perks: string[];
  fields: Record<SellerFieldKey, SellerFieldMode>;
  /** Days a rejected applicant waits before applying again (0 = right away). */
  reapplyCooldownDays: number;
};

export const MAX_SELLER_PERKS = 8;

export function defaultSellerProgramConfig(): SellerProgramConfig {
  return {
    headline: "Sell more. Pay wholesale.",
    closedMessage: "The seller program isn't accepting new applications right now. Check back soon.",
    perks: [
      "Wholesale pricing on the full catalog",
      "Platform API access & webhooks",
      "Your own seller panel to manage resellers",
      "A spot on the seller leaderboard",
    ],
    fields: {
      facebookUrl: "required",
      youtubeUrl: "optional",
      telegramChannelUrl: "optional",
      websiteUrl: "optional",
      sellingPlatform: "required",
      followerCount: "required",
      experience: "optional",
    },
    reapplyCooldownDays: 0,
  };
}

const MODES: SellerFieldMode[] = ["required", "optional", "hidden"];

export function normalizeSellerProgramConfig(raw: unknown): SellerProgramConfig {
  const base = defaultSellerProgramConfig();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return base;
  const o = raw as Record<string, unknown>;
  const text = (v: unknown, max: number, fallback: string) => {
    const s = typeof v === "string" ? v.trim().slice(0, max) : "";
    return s || fallback;
  };

  const perks = Array.isArray(o.perks)
    ? o.perks
        .map((p) => (typeof p === "string" ? p.trim().slice(0, 120) : ""))
        .filter(Boolean)
        .slice(0, MAX_SELLER_PERKS)
    : base.perks;

  const fieldsRaw = o.fields && typeof o.fields === "object" ? (o.fields as Record<string, unknown>) : {};
  const fields = { ...base.fields };
  for (const f of SELLER_FIELDS) {
    const m = fieldsRaw[f.key];
    if (typeof m === "string" && MODES.includes(m as SellerFieldMode)) fields[f.key] = m as SellerFieldMode;
  }

  const days = Number(o.reapplyCooldownDays);
  return {
    headline: text(o.headline, 80, base.headline),
    closedMessage: text(o.closedMessage, 300, base.closedMessage),
    perks,
    fields,
    reapplyCooldownDays: Number.isFinite(days) ? Math.min(365, Math.max(0, Math.round(days))) : 0,
  };
}

/** When a rejected applicant may apply again, or null if they already can. */
export function reapplyAvailableAt(
  latest: { status: string; reviewedAt: Date | string | null } | null,
  cooldownDays: number,
  now = Date.now(),
): Date | null {
  if (!latest || latest.status !== "REJECTED" || !latest.reviewedAt || cooldownDays <= 0) return null;
  const at = new Date(new Date(latest.reviewedAt).getTime() + cooldownDays * 86_400_000);
  return at.getTime() > now ? at : null;
}
