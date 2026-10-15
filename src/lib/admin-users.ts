import "server-only";

import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

export type DeleteAdminUserResult = {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  /** Username before anonymize — for activity log. */
  previousUsername: string;
};

/** Soft-deleted accounts use this email domain (reseller + admin delete). */
export const DELETED_USER_EMAIL_SUFFIX = "@deleted.local";

export const BAN_REASON_MAX = 500;

export function isSoftDeletedUser(user: {
  email?: string | null;
  username?: string | null;
}): boolean {
  const email = user.email?.toLowerCase() ?? "";
  const username = user.username?.toLowerCase() ?? "";
  return (
    email.endsWith(DELETED_USER_EMAIL_SUFFIX) || username.startsWith("del_")
  );
}

/** Revoke all ACTIVE platform API keys for a user (ban / soft-delete side effect). */
export async function revokeUserApiKeysOnBan(userId: string): Promise<number> {
  const result = await prisma.sellerApiKey.updateMany({
    where: { userId, status: "ACTIVE" },
    data: { status: "REVOKED" },
  });
  return result.count;
}

/**
 * Soft-deletes a user: ban + anonymize login fields.
 * Orders / deposits / transactions / reviews stay linked via userId.
 * ADMIN accounts cannot be deleted.
 */
export async function deleteAdminUser(
  userId: string,
  actorAdminId: string,
): Promise<DeleteAdminUserResult> {
  if (userId === actorAdminId) {
    throw new Error("CANNOT_DELETE_SELF");
  }

  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
    },
  });
  if (!existing) throw new Error("NOT_FOUND");
  if (existing.role === UserRole.ADMIN) {
    throw new Error("CANNOT_DELETE_ADMIN");
  }
  if (isSoftDeletedUser(existing)) {
    throw new Error("ALREADY_DELETED");
  }

  const previousUsername = existing.username;
  const stamp = existing.id.slice(-8);

  await prisma.user.update({
    where: { id: userId },
    data: {
      banned: true,
      banReason: "Soft-deleted",
      name: "Deleted",
      username: `del_${stamp}`,
      email: `del_${stamp}${DELETED_USER_EMAIL_SUFFIX}`,
      passwordHash: null,
      googleId: null,
      twoFactorEnabled: false,
      twoFactorSecret: null,
      twoFactorBackupCodes: [],
      avatarUrl: null,
      referralCode: null,
      bio: null,
      socialLinks: null,
      emojiStatus: null,
      apiEnabled: false,
      depositsEnabled: false,
      canCreateResellers: false,
      canManageResellers: false,
      canFundResellers: false,
      isProfilePublic: false,
    },
  });

  // Revoke live API access + clear inbox noise; keep commerce history.
  await Promise.all([
    prisma.sellerApiUsage.deleteMany({ where: { userId } }).catch(() => undefined),
    prisma.sellerApiIdempotency.deleteMany({ where: { userId } }).catch(() => undefined),
    prisma.sellerApiWebhook.deleteMany({ where: { userId } }).catch(() => undefined),
    prisma.notification.deleteMany({ where: { userId } }).catch(() => undefined),
    prisma.passwordResetOtp
      .deleteMany({ where: { email: existing.email } })
      .catch(() => undefined),
  ]);
  await prisma.sellerApiKey.deleteMany({ where: { userId } }).catch(() => undefined);

  return {
    id: existing.id,
    username: `del_${stamp}`,
    email: `del_${stamp}${DELETED_USER_EMAIL_SUFFIX}`,
    role: existing.role,
    previousUsername,
  };
}
