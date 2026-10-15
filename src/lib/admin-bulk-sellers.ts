import "server-only";

import { logActivity } from "@/lib/activity-log";
import { revokeUserApiKeysOnBan } from "@/lib/admin-users";
import { formatMoney, usdToMicrocents } from "@/lib/currencies";
import { notifyMany } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { notifyTelegram } from "@/lib/telegram-notify";
import { adjustWallet } from "@/lib/wallet";
import { TransactionType, UserRole } from "@prisma/client";
import { z } from "zod";

export const BulkSellersTargetSchema = z.enum([
  "SELLERS",
  "RESELLERS",
  "ALL_SELLERS_AND_RESELLERS",
]);
export type BulkSellersTarget = z.infer<typeof BulkSellersTargetSchema>;

export const BulkSellersActionTypeSchema = z.enum([
  "GRANT_ALL_CAPS",
  "REVOKE_ALL_CAPS",
  "SET_CAN_CREATE_RESELLERS",
  "SET_CAN_MANAGE_RESELLERS",
  "SET_CAN_FUND_RESELLERS",
  "SET_DEPOSITS_ENABLED",
  "SET_API_ENABLED",
  "SET_EMAIL_VERIFIED",
  "MASS_BAN",
  "MASS_UNBAN",
  "WALLET_ADJUST",
  "SEND_NOTIFICATION",
]);
export type BulkSellersActionType = z.infer<typeof BulkSellersActionTypeSchema>;

export const BulkSellersActionPayloadSchema = z.object({
  target: BulkSellersTargetSchema,
  action: BulkSellersActionTypeSchema,
  booleanValue: z.boolean().optional(),
  amountUsd: z.number().optional(),
  note: z.string().trim().max(300).optional(),
  banReason: z.string().trim().max(500).optional(),
  notificationTitle: z.string().trim().min(1).max(120).optional(),
  notificationMessage: z.string().trim().min(1).max(2000).optional(),
  notificationActionUrl: z.string().trim().max(500).optional(),
});
export type BulkSellersActionPayload = z.infer<
  typeof BulkSellersActionPayloadSchema
>;

function getRoleWhereClause(target: BulkSellersTarget) {
  switch (target) {
    case "SELLERS":
      return { role: UserRole.SELLER };
    case "RESELLERS":
      return { role: UserRole.RESELLER };
    case "ALL_SELLERS_AND_RESELLERS":
      return { role: { in: [UserRole.SELLER, UserRole.RESELLER] } };
  }
}

export async function getBulkSellersStats(target: BulkSellersTarget) {
  const where = getRoleWhereClause(target);

  const [
    totalMatching,
    activeCount,
    bannedCount,
    verifiedCount,
    canCreateCount,
    canManageCount,
    canFundCount,
    depositsEnabledCount,
    apiEnabledCount,
    walletAggregate,
  ] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.count({ where: { ...where, banned: false } }),
    prisma.user.count({ where: { ...where, banned: true } }),
    prisma.user.count({ where: { ...where, emailVerified: true } }),
    prisma.user.count({ where: { ...where, canCreateResellers: true } }),
    prisma.user.count({ where: { ...where, canManageResellers: true } }),
    prisma.user.count({ where: { ...where, canFundResellers: true } }),
    prisma.user.count({ where: { ...where, depositsEnabled: true } }),
    prisma.user.count({ where: { ...where, apiEnabled: true } }),
    prisma.user.aggregate({
      where,
      _sum: { walletBalance: true },
    }),
  ]);

  return {
    target,
    totalMatching,
    activeCount,
    bannedCount,
    verifiedCount,
    canCreateCount,
    canManageCount,
    canFundCount,
    depositsEnabledCount,
    apiEnabledCount,
    totalWalletBalance: walletAggregate._sum.walletBalance ?? 0,
  };
}

export async function executeBulkSellersAction(params: {
  payload: BulkSellersActionPayload;
  adminUser: { id: string; username: string; email?: string | null };
  request?: Request;
}) {
  const { payload, adminUser, request } = params;
  const where = getRoleWhereClause(payload.target);

  const matchedUsers = await prisma.user.findMany({
    where,
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      walletBalance: true,
      banned: true,
    },
  });

  if (matchedUsers.length === 0) {
    return {
      success: true,
      affectedCount: 0,
      message: "No users matched the selected target audience.",
    };
  }

  const userIds = matchedUsers.map((u) => u.id);
  let actionSummary = "";
  let auditDetails: Record<string, unknown> = {
    target: payload.target,
    action: payload.action,
    matchedCount: matchedUsers.length,
  };

  switch (payload.action) {
    case "GRANT_ALL_CAPS": {
      const result = await prisma.user.updateMany({
        where: { id: { in: userIds } },
        data: {
          canCreateResellers: true,
          canManageResellers: true,
          canFundResellers: true,
        },
      });
      actionSummary = `Granted all seller capabilities (Create + Manage + Fund) to ${result.count} accounts`;
      auditDetails.affectedCount = result.count;
      break;
    }

    case "REVOKE_ALL_CAPS": {
      const result = await prisma.user.updateMany({
        where: { id: { in: userIds } },
        data: {
          canCreateResellers: false,
          canManageResellers: false,
          canFundResellers: false,
        },
      });
      actionSummary = `Revoked all seller capabilities from ${result.count} accounts`;
      auditDetails.affectedCount = result.count;
      break;
    }

    case "SET_CAN_CREATE_RESELLERS": {
      const val = payload.booleanValue ?? true;
      const result = await prisma.user.updateMany({
        where: { id: { in: userIds } },
        data: { canCreateResellers: val },
      });
      actionSummary = `${val ? "Enabled" : "Disabled"} 'Can Create Resellers' for ${result.count} accounts`;
      auditDetails.affectedCount = result.count;
      auditDetails.value = val;
      break;
    }

    case "SET_CAN_MANAGE_RESELLERS": {
      const val = payload.booleanValue ?? true;
      const result = await prisma.user.updateMany({
        where: { id: { in: userIds } },
        data: { canManageResellers: val },
      });
      actionSummary = `${val ? "Enabled" : "Disabled"} 'Can Manage Resellers' for ${result.count} accounts`;
      auditDetails.affectedCount = result.count;
      auditDetails.value = val;
      break;
    }

    case "SET_CAN_FUND_RESELLERS": {
      const val = payload.booleanValue ?? true;
      const result = await prisma.user.updateMany({
        where: { id: { in: userIds } },
        data: { canFundResellers: val },
      });
      actionSummary = `${val ? "Enabled" : "Disabled"} 'Can Fund Resellers' for ${result.count} accounts`;
      auditDetails.affectedCount = result.count;
      auditDetails.value = val;
      break;
    }

    case "SET_DEPOSITS_ENABLED": {
      const val = payload.booleanValue ?? true;
      const result = await prisma.user.updateMany({
        where: { id: { in: userIds } },
        data: { depositsEnabled: val },
      });
      actionSummary = `${val ? "Enabled" : "Disabled"} self-serve deposits for ${result.count} accounts`;
      auditDetails.affectedCount = result.count;
      auditDetails.value = val;
      break;
    }

    case "SET_API_ENABLED": {
      const val = payload.booleanValue ?? true;
      const result = await prisma.user.updateMany({
        where: { id: { in: userIds } },
        data: { apiEnabled: val },
      });
      actionSummary = `${val ? "Enabled" : "Disabled"} Platform API access for ${result.count} accounts`;
      auditDetails.affectedCount = result.count;
      auditDetails.value = val;
      break;
    }

    case "SET_EMAIL_VERIFIED": {
      const val = payload.booleanValue ?? true;
      const result = await prisma.user.updateMany({
        where: { id: { in: userIds } },
        data: { emailVerified: val },
      });
      actionSummary = `Marked email as ${val ? "Verified" : "Unverified"} for ${result.count} accounts`;
      auditDetails.affectedCount = result.count;
      auditDetails.value = val;
      break;
    }

    case "MASS_BAN": {
      const reason = payload.banReason?.trim() || "Bulk administrative suspension";
      const result = await prisma.user.updateMany({
        where: { id: { in: userIds } },
        data: { banned: true, banReason: reason },
      });

      // Revoke all ACTIVE API keys for affected users
      await Promise.all(userIds.map((uid) => revokeUserApiKeysOnBan(uid)));

      actionSummary = `Suspended (banned) ${result.count} accounts & revoked API keys. Reason: "${reason}"`;
      auditDetails.affectedCount = result.count;
      auditDetails.reason = reason;
      break;
    }

    case "MASS_UNBAN": {
      const result = await prisma.user.updateMany({
        where: { id: { in: userIds } },
        data: { banned: false, banReason: null },
      });
      actionSummary = `Unbanned and restored ${result.count} accounts`;
      auditDetails.affectedCount = result.count;
      break;
    }

    case "WALLET_ADJUST": {
      const amountUsd = payload.amountUsd;
      if (typeof amountUsd !== "number" || amountUsd === 0) {
        throw new Error("Invalid wallet adjustment amount.");
      }

      const microcents = usdToMicrocents(amountUsd);
      const note = payload.note?.trim() || "Mass seller wallet adjustment";

      let successfulAdjustments = 0;
      const failedUsers: string[] = [];

      for (const u of matchedUsers) {
        try {
          await adjustWallet({
            userId: u.id,
            amount: microcents,
            type: TransactionType.ADMIN_ADJUSTMENT,
            note: `${note} (One-Click All Sellers)`,
          });
          successfulAdjustments += 1;
        } catch (err) {
          failedUsers.push(u.username);
        }
      }

      actionSummary = `Adjusted wallet by ${amountUsd >= 0 ? "+" : ""}$${amountUsd.toFixed(2)} USD for ${successfulAdjustments}/${matchedUsers.length} accounts`;
      auditDetails.successfulAdjustments = successfulAdjustments;
      auditDetails.amountUsd = amountUsd;
      auditDetails.note = note;
      if (failedUsers.length > 0) {
        auditDetails.failedUsers = failedUsers;
      }
      break;
    }

    case "SEND_NOTIFICATION": {
      const title = payload.notificationTitle?.trim();
      const message = payload.notificationMessage?.trim();
      if (!title || !message) {
        throw new Error("Notification title and message are required.");
      }

      const sentCount = await notifyMany(userIds, {
        type: "SELLER_ANNOUNCEMENT",
        title,
        message,
        actionUrl: payload.notificationActionUrl?.trim() || null,
      });

      actionSummary = `Dispatched in-app & web push notification to ${sentCount} accounts`;
      auditDetails.sentCount = sentCount;
      auditDetails.title = title;
      break;
    }

    default:
      throw new Error(`Unsupported bulk action: ${payload.action}`);
  }

  // Audit logging
  if (request) {
    logActivity({
      request,
      action: "BULK_SELLER_ACTION",
      category: "ADMIN",
      message: `One-Click All Sellers: ${actionSummary}`,
      user: {
        id: adminUser.id,
        username: adminUser.username,
        email: adminUser.email ?? "",
        role: UserRole.ADMIN,
      },
      metadata: {
        ...auditDetails,
        byAdminId: adminUser.id,
        byAdmin: adminUser.username,
      },
    });
  }

  // Telegram alert
  void notifyTelegram(
    "adminUpdate",
    [
      `⚡ **One-Click — All Sellers Executed**`,
      `Action: ${payload.action}`,
      `Target: ${payload.target}`,
      `Result: ${actionSummary}`,
      `Admin: @${adminUser.username}`,
    ].join("\n"),
  );

  return {
    success: true,
    affectedCount: userIds.length,
    summary: actionSummary,
  };
}
