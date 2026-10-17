import { normalizeProfileUsername } from "@/lib/profile";
import { prisma } from "@/lib/prisma";
import { getProductsByIds } from "@/lib/products";
import { ensureReferralCode } from "@/lib/referral-code";
import { userCanSelfDeposit } from "@/lib/roles";
import type { ProductCardData } from "@/types/product";
import type { SafeUser } from "@/types/user";

export type PublicProfilePayload = {
  user: SafeUser;
  orderCount: number;
  totalSpent: number;
  featuredProducts: ProductCardData[];
  isOwner: boolean;
  isPrivate: boolean;
  /** Invite code for “Join with {name}” → `/?auth=register&ref=` (safe to expose). */
  referralCode: string | null;
};

function toPublicSafeUser(
  user: {
    id: string;
    name: string;
    username: string;
    email: string;
    avatarUrl: string | null;
    role: SafeUser["role"];
    walletBalance: number;
    banned: boolean;
    emailVerified: boolean;
    passwordHash: string | null;
    googleId: string | null;
    canCreateResellers: boolean;
    canManageResellers: boolean;
    canFundResellers: boolean;
    referredById: string | null;
    referralCode: string | null;
    bio: string | null;
    isProfilePublic: boolean;
    socialLinks: unknown;
    featuredProducts: string[];
    profileBorder: SafeUser["profileBorder"];
    emojiStatus: string | null;
    bioTheme?: string | null;
    bioTagline?: string | null;
    bioBannerUrl?: string | null;
    bioPromoCode?: string | null;
    bioLinks?: unknown;
    showVouches?: boolean;
    discordInvite?: string | null;
    telegramChannel?: string | null;
    youtubeVideoUrl?: string | null;
    usernameChangedAt: Date | null;
    createdAt: Date;
  },
  isOwner: boolean,
  limited: boolean,
): SafeUser {
  if (limited) {
    return {
      id: user.id,
      name: user.name,
      username: user.username,
      email: "",
      avatarUrl: user.avatarUrl,
      currency: "USD",
      role: user.role,
      walletBalance: 0,
      banned: user.banned,
      emailVerified: user.emailVerified,
      hasPassword: false,
      hasGoogle: false,
      canCreateResellers: false,
      canManageResellers: false,
      canFundResellers: false,
      referredById: null,
      referralCode: null,
      bio: null,
      isProfilePublic: user.isProfilePublic,
      socialLinks: null,
      featuredProducts: [],
      profileBorder: "NONE",
      emojiStatus: null,
      bioTheme: "DEFAULT",
      bioTagline: null,
      bioBannerUrl: null,
      bioPromoCode: null,
      bioLinks: null,
      showVouches: true,
      discordInvite: null,
      telegramChannel: null,
      youtubeVideoUrl: null,
      apiEnabled: false,
      depositsEnabled: false,
      usernameChangedAt: null,
      createdAt: user.createdAt.toISOString(),
    };
  }

  return {
    id: user.id,
    name: user.name,
    username: user.username,
    email: isOwner ? user.email : "",
    avatarUrl: user.avatarUrl,
    currency: "USD",
    role: user.role,
    walletBalance: isOwner ? user.walletBalance : 0,
    banned: user.banned,
    emailVerified: user.emailVerified,
    hasPassword: isOwner ? Boolean(user.passwordHash) : false,
    hasGoogle: isOwner ? Boolean(user.googleId) : false,
    canCreateResellers: isOwner ? user.canCreateResellers : false,
    canManageResellers: isOwner ? user.canManageResellers : false,
    canFundResellers: isOwner ? user.canFundResellers : false,
    referredById: isOwner ? user.referredById : null,
    referralCode: isOwner ? user.referralCode : null,
    bio: user.bio,
    isProfilePublic: user.isProfilePublic,
    socialLinks: user.socialLinks
      ? (user.socialLinks as SafeUser["socialLinks"])
      : null,
    featuredProducts: user.featuredProducts ?? [],
    profileBorder: user.profileBorder ?? "NONE",
    emojiStatus: user.emojiStatus ?? null,
    bioTheme: user.bioTheme ?? "DEFAULT",
    bioTagline: user.bioTagline ?? null,
    bioBannerUrl: user.bioBannerUrl ?? null,
    bioPromoCode: user.bioPromoCode ?? null,
    bioLinks: (user.bioLinks as SafeUser["bioLinks"]) ?? null,
    showVouches: user.showVouches ?? true,
    discordInvite: user.discordInvite ?? null,
    telegramChannel: user.telegramChannel ?? null,
    youtubeVideoUrl: user.youtubeVideoUrl ?? null,
    apiEnabled: isOwner ? (user as { apiEnabled?: boolean }).apiEnabled !== false : false,
    depositsEnabled: isOwner
      ? userCanSelfDeposit(user as { role: string; depositsEnabled?: boolean | null })
      : false,
    usernameChangedAt:
      isOwner && user.usernameChangedAt
        ? user.usernameChangedAt.toISOString()
        : null,
    createdAt: user.createdAt.toISOString(),
  };
}

export async function getPublicProfileByUsername(
  rawUsername: string,
  currentUserId: string | null,
): Promise<PublicProfilePayload | null> {
  const username = normalizeProfileUsername(rawUsername);
  if (!username) return null;

  const user = await prisma.user.findUnique({
    where: { username },
    include: {
      orders: {
        where: { status: { in: ["PAID", "FULFILLED"] } },
        select: { total: true },
      },
    },
  });

  if (!user || user.banned) return null;

  const isOwner = currentUserId === user.id;
  const isPrivate = !user.isProfilePublic;

  // Invite CTA needs a code; generate once if this account never got one.
  let referralCode = user.referralCode;
  if (!referralCode) {
    try {
      referralCode = await ensureReferralCode(user.id);
    } catch {
      referralCode = null;
    }
  }

  if (isPrivate && !isOwner) {
    return {
      user: toPublicSafeUser(user, false, true),
      orderCount: 0,
      totalSpent: 0,
      featuredProducts: [],
      isOwner: false,
      isPrivate: true,
      referralCode,
    };
  }

  const orderCount = user.orders.length;
  const totalSpent = user.orders.reduce(
    (sum, order) => sum + (order.total || 0),
    0,
  );

  const featuredProducts =
    user.featuredProducts?.length
      ? await getProductsByIds(user.featuredProducts)
      : [];

  return {
    user: toPublicSafeUser(user, isOwner, false),
    orderCount,
    totalSpent: isOwner ? totalSpent : 0,
    featuredProducts,
    isOwner,
    isPrivate,
    referralCode,
  };
}
