import { getEnv, sessionCookieSecure } from "@/lib/env";
import { Currency } from "@/lib/currencies";
import { prisma } from "@/lib/prisma";
import { normalizeRoleClaim, userCanSelfDeposit } from "@/lib/roles";
import type { SafeUser } from "@/types/user";
import type { User, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export const CUSTOMER_COOKIE = "drip_customer_session";
const SESSION_DAYS = 14;

export type { SafeUser } from "@/types/user";

export function toSafeUser(user: User): SafeUser {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    email: user.email,
    avatarUrl: user.avatarUrl ?? null,
    currency: Currency.USD,
    role: user.role,
    walletBalance: user.walletBalance ?? 0,
    banned: user.banned ?? false,
    emailVerified: user.emailVerified ?? false,
    hasPassword: Boolean(user.passwordHash),
    hasGoogle: Boolean(user.googleId),
    twoFactorEnabled: user.twoFactorEnabled ?? false,
    canCreateResellers: user.canCreateResellers ?? false,
    canManageResellers: user.canManageResellers ?? false,
    canFundResellers: user.canFundResellers ?? false,
    referredById: user.referredById ?? null,
    referralCode: user.referralCode ?? null,
    bio: user.bio ?? null,
    isProfilePublic: user.isProfilePublic ?? true,
    socialLinks: user.socialLinks ? (user.socialLinks as any) : null,
    featuredProducts: user.featuredProducts ?? [],
    profileBorder: (user.profileBorder as any) ?? "NONE",
    emojiStatus: user.emojiStatus ?? null,
    isPremium: user.isPremium ?? false,
    premiumPurchasedAt: user.premiumPurchasedAt
      ? user.premiumPurchasedAt.toISOString()
      : null,
    bioTheme: user.bioTheme ?? "DEFAULT",
    bioTagline: user.bioTagline ?? null,
    bioBannerUrl: user.bioBannerUrl ?? null,
    bioPromoCode: user.bioPromoCode ?? null,
    bioLinks: (user.bioLinks as any) ?? null,
    showVouches: user.showVouches ?? true,
    discordInvite: user.discordInvite ?? null,
    telegramChannel: user.telegramChannel ?? null,
    youtubeVideoUrl: user.youtubeVideoUrl ?? null,
    usernameChangedAt: user.usernameChangedAt
      ? user.usernameChangedAt.toISOString()
      : null,
    apiEnabled: (user as any).apiEnabled !== false,
    depositsEnabled: userCanSelfDeposit(user),
    createdAt: user.createdAt.toISOString(),
  };
}

function secretKey() {
  return new TextEncoder().encode(getEnv().customerSessionSecret);
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createCustomerSessionToken(
  userId: string,
  role: UserRole,
) {
  return new SignJWT({ sub: userId, role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secretKey());
}

export async function setCustomerSessionCookie(
  userId: string,
  role: UserRole = "USER",
) {
  const token = await createCustomerSessionToken(userId, role);
  const jar = await cookies();
  jar.set(CUSTOMER_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: sessionCookieSecure(),
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function clearCustomerSessionCookie() {
  const jar = await cookies();
  // Explicit expire with the same attributes as set — jar.delete() can miss Secure cookies.
  jar.set(CUSTOMER_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: sessionCookieSecure(),
    path: "/",
    maxAge: 0,
  });
}

export async function getSessionUserId(): Promise<string | null> {
  const jar = await cookies();
  const token = jar.get(CUSTOMER_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    const sub = payload.sub;
    return typeof sub === "string" ? sub : null;
  } catch {
    return null;
  }
}

/** Edge-safe: read role claim from customer JWT (no DB). */
export async function getSessionRoleFromToken(
  token: string,
): Promise<UserRole | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return normalizeRoleClaim(payload.role);
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<SafeUser | null> {
  const userId = await getSessionUserId();
  if (!userId) return null;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.banned) return null;
  return toSafeUser(user);
}

export async function requireCustomer(): Promise<SafeUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  return user;
}
