import type { Currency } from "@/lib/currencies";
import type { UserRole } from "@/lib/roles";

export type ProfileBorder = "NONE" | "PREMIUM" | "VIP";

export type SocialLinks = {
  telegram?: string;
  discord?: string;
  youtube?: string;
  twitter?: string;
  instagram?: string;
};

export type BioCustomLink = {
  id: string;
  title: string;
  url: string;
  icon?: string;
  badge?: string;
  isPinned?: boolean;
};

export type BioThemePreset =
  | "DEFAULT"
  | "NEON_TOXIC"
  | "PHANTOM_VIOLET"
  | "GLACIER_CYAN"
  | "CRIMSON_FURY"
  | "GOLD_OBSIDIAN";

export type SafeUser = {
  id: string;
  name: string;
  username: string;
  email: string;
  avatarUrl: string | null;
  currency: Currency;
  role: UserRole;
  walletBalance: number;
  banned: boolean;
  emailVerified: boolean;
  hasPassword: boolean;
  hasGoogle: boolean;
  twoFactorEnabled: boolean;
  canCreateResellers: boolean;
  canManageResellers: boolean;
  canFundResellers: boolean;
  referredById: string | null;
  referralCode: string | null;
  bio: string | null;
  isProfilePublic: boolean;
  socialLinks: SocialLinks | null;
  featuredProducts: string[];
  profileBorder: ProfileBorder;
  emojiStatus: string | null;
  usernameChangedAt: string | null;
  bioTheme?: BioThemePreset | string | null;
  bioTagline?: string | null;
  bioBannerUrl?: string | null;
  bioPromoCode?: string | null;
  bioLinks?: BioCustomLink[] | null;
  showVouches?: boolean;
  discordInvite?: string | null;
  telegramChannel?: string | null;
  youtubeVideoUrl?: string | null;
  /** Platform API access override (admin). Default true. */
  apiEnabled: boolean;
  /** Self-serve deposits. Resellers default off; admin can toggle any user. */
  depositsEnabled: boolean;
  createdAt: string;
};

