import { jsonError, jsonOk } from "@/lib/api";
import { logActivity } from "@/lib/activity-log";
import {
  BAN_REASON_MAX,
  deleteAdminUser,
  revokeUserApiKeysOnBan,
} from "@/lib/admin-users";
import { requireAdmin } from "@/lib/auth/admin";
import { isUserRole, userCanSelfDeposit } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { adjustWallet } from "@/lib/wallet";
import { notifyTelegram } from "@/lib/telegram-notify";
import { TransactionType, UserRole } from "@prisma/client";
import { z } from "zod";

const patchSchema = z.object({
  role: z.enum(["USER", "SELLER", "RESELLER", "ADMIN"]).optional(),
  banned: z.boolean().optional(),
  banReason: z
    .string()
    .trim()
    .max(BAN_REASON_MAX)
    .nullable()
    .optional(),
  resellerDiscount: z.number().min(0).max(100).optional(),
  canCreateResellers: z.boolean().optional(),
  canManageResellers: z.boolean().optional(),
  canFundResellers: z.boolean().optional(),
  isPremium: z.boolean().optional(),
  emailVerified: z.boolean().optional(),
  apiEnabled: z.boolean().optional(),
  depositsEnabled: z.boolean().optional(),
  walletAdjust: z
    .object({
      amount: z.number(),
      note: z.string().trim().max(200).optional(),
    })
    .optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    await requireAdmin();
  } catch {
    return jsonError("UNAUTHORIZED", "Admin login required.", 401);
  }

  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      currency: true,
      role: true,
      walletBalance: true,
      banned: true,
      banReason: true,
      resellerDiscount: true,
      canCreateResellers: true,
      canManageResellers: true,
      canFundResellers: true,
      apiEnabled: true,
      depositsEnabled: true,
      emailVerified: true,
      isPremium: true,
      premiumPurchasedAt: true,
      referredById: true,
      referralCode: true,
      createdAt: true,
      referredBy: {
        select: { id: true, username: true, name: true, role: true },
      },
    },
  });
  if (!user) return jsonError("NOT_FOUND", "User not found.", 404);

  const [orders, deposits, transactions] = await Promise.all([
    prisma.order.findMany({
      where: { userId: id },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        status: true,
        total: true,
        currency: true,
        createdAt: true,
      },
    }),
    prisma.deposit.findMany({
      where: { userId: id },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        status: true,
        amount: true,
        method: true,
        createdAt: true,
      },
    }),
    prisma.transaction.findMany({
      where: { userId: id },
      orderBy: { createdAt: "desc" },
      take: 40,
      select: {
        id: true,
        type: true,
        status: true,
        amount: true,
        note: true,
        reference: true,
        createdAt: true,
      },
    }),
  ]);

  const activity = [
    ...orders.map((o) => ({
      id: `order-${o.id}`,
      kind: "order" as const,
      label: `Order ${o.status}`,
      amount: o.total,
      meta: o.status,
      createdAt: o.createdAt.toISOString(),
    })),
    ...deposits.map((d) => ({
      id: `deposit-${d.id}`,
      kind: "deposit" as const,
      label: `Deposit ${d.method}`,
      amount: d.amount,
      meta: d.status,
      createdAt: d.createdAt.toISOString(),
    })),
    ...transactions.map((t) => ({
      id: `tx-${t.id}`,
      kind: "transaction" as const,
      label: t.type,
      amount: t.amount,
      meta: t.note ?? t.status,
      createdAt: t.createdAt.toISOString(),
    })),
  ]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 60);

  return jsonOk({
    user: {
      ...user,
      banReason: user.banReason ?? null,
      apiEnabled: user.apiEnabled !== false,
      depositsEnabled: userCanSelfDeposit(user),
      emailVerified: user.emailVerified ?? false,
      isPremium: user.isPremium ?? false,
      premiumPurchasedAt: user.premiumPurchasedAt
        ? user.premiumPurchasedAt.toISOString()
        : null,
      createdAt: user.createdAt.toISOString(),
    },
    activity,
  });
}

export async function PATCH(request: Request, { params }: Params) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return jsonError("UNAUTHORIZED", "Admin login required.", 401);
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("VALIDATION", parsed.error.issues[0]?.message ?? "Invalid.", 400);
  }

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) return jsonError("NOT_FOUND", "User not found.", 404);

  if (parsed.data.role && !isUserRole(parsed.data.role)) {
    return jsonError("VALIDATION", "Invalid role.", 400);
  }

  if (parsed.data.walletAdjust) {
    try {
      const { usdToMicrocents } = await import("@/lib/currencies");
      await adjustWallet({
        userId: id,
        amount: usdToMicrocents(parsed.data.walletAdjust.amount),
        type: TransactionType.ADMIN_ADJUSTMENT,
        note: parsed.data.walletAdjust.note ?? "Admin wallet adjustment",
      });
      logActivity({
        request,
        action: "WALLET_ADJUST",
        category: "ADMIN",
        message: `Wallet adjust ${parsed.data.walletAdjust.amount >= 0 ? "+" : ""}${parsed.data.walletAdjust.amount} USD on @${existing.username}`,
        user: existing,
        metadata: {
          amountUsd: parsed.data.walletAdjust.amount,
          note: parsed.data.walletAdjust.note ?? null,
          byAdminId: admin.id,
          byAdmin: admin.username,
        },
      });
      void notifyTelegram(
        "adminUpdate",
        [
          `💰 Admin wallet adjustment (${parsed.data.walletAdjust.amount >= 0 ? "+" : ""}$${parsed.data.walletAdjust.amount.toFixed(2)} USD)`,
          `User: @${existing.username} (${existing.email})`,
          `Amount: ${parsed.data.walletAdjust.amount >= 0 ? "+" : ""}$${parsed.data.walletAdjust.amount.toFixed(2)} USD`,
          `Note: ${parsed.data.walletAdjust.note || "Admin adjustment"}`,
          `Admin: @${admin.username}`,
        ].join("\n"),
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Wallet error";
      return jsonError(
        msg,
        msg === "INSUFFICIENT_BALANCE"
          ? "Insufficient balance."
          : "Wallet adjust failed.",
        400,
      );
    }
  }

  const nextRole = parsed.data.role;
  let canCreate = parsed.data.canCreateResellers;
  let canManage = parsed.data.canManageResellers;
  let canFund = parsed.data.canFundResellers;
  if (nextRole && nextRole !== UserRole.SELLER) {
    canCreate = false;
    canManage = false;
    canFund = false;
  }

  // Role → RESELLER: self-deposit off by default (seller-funded). Leaving RESELLER: turn on unless admin sent an explicit flag.
  let depositsEnabled = parsed.data.depositsEnabled;
  if (depositsEnabled === undefined && nextRole && nextRole !== existing.role) {
    if (nextRole === UserRole.RESELLER) {
      depositsEnabled = false;
    } else if (existing.role === UserRole.RESELLER) {
      depositsEnabled = true;
    }
  }

  let emailVerified = parsed.data.emailVerified;
  let isPremium = parsed.data.isPremium;
  let premiumPurchasedAt: Date | null | undefined;
  if (isPremium === true) {
    emailVerified = true;
    if (!existing.premiumPurchasedAt) {
      premiumPurchasedAt = new Date();
    }
  }

  const nextBanned = parsed.data.banned;
  const banToggling =
    nextBanned !== undefined && nextBanned !== existing.banned;
  const becomingBanned = banToggling && nextBanned === true;
  const becomingActive = banToggling && nextBanned === false;

  let banReasonUpdate: string | null | undefined;
  if (becomingActive) {
    banReasonUpdate = null;
  } else if (parsed.data.banReason !== undefined) {
    banReasonUpdate =
      parsed.data.banReason === null
        ? null
        : parsed.data.banReason.trim() || null;
  }

  const user = await prisma.user.update({
    where: { id },
    data: {
      ...(nextRole ? { role: nextRole } : {}),
      ...(nextBanned !== undefined ? { banned: nextBanned } : {}),
      ...(banReasonUpdate !== undefined ? { banReason: banReasonUpdate } : {}),
      ...(parsed.data.resellerDiscount !== undefined
        ? { resellerDiscount: parsed.data.resellerDiscount }
        : {}),
      ...(canCreate !== undefined ? { canCreateResellers: canCreate } : {}),
      ...(canManage !== undefined ? { canManageResellers: canManage } : {}),
      ...(canFund !== undefined ? { canFundResellers: canFund } : {}),
      ...(parsed.data.apiEnabled !== undefined
        ? { apiEnabled: parsed.data.apiEnabled }
        : {}),
      ...(depositsEnabled !== undefined ? { depositsEnabled } : {}),
      ...(isPremium !== undefined ? { isPremium } : {}),
      ...(emailVerified !== undefined ? { emailVerified } : {}),
      ...(premiumPurchasedAt !== undefined ? { premiumPurchasedAt } : {}),
    },
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      currency: true,
      role: true,
      walletBalance: true,
      banned: true,
      banReason: true,
      resellerDiscount: true,
      canCreateResellers: true,
      canManageResellers: true,
      canFundResellers: true,
      apiEnabled: true,
      depositsEnabled: true,
      emailVerified: true,
      isPremium: true,
      premiumPurchasedAt: true,
      referredById: true,
      createdAt: true,
    },
  });

  if (becomingBanned) {
    await revokeUserApiKeysOnBan(id).catch(() => 0);
  }

  if (banToggling) {
    logActivity({
      request,
      action: becomingBanned ? "USER_BAN" : "USER_UNBAN",
      category: "ADMIN",
      message: becomingBanned
        ? `Banned @${user.username}`
        : `Unbanned @${user.username}`,
      user,
      metadata: {
        byAdminId: admin.id,
        byAdmin: admin.username,
        banReason: becomingBanned ? user.banReason : null,
      },
    });
    void notifyTelegram(
      "adminUpdate",
      [
        becomingBanned
          ? `🚫 User BANNED: @${user.username}`
          : `✅ User UNBANNED: @${user.username}`,
        `User: @${user.username} (${user.email})`,
        ...(becomingBanned && user.banReason
          ? [`Reason: ${user.banReason}`]
          : []),
        `Admin: @${admin.username}`,
      ].join("\n"),
    );
  } else if (
    parsed.data.banReason !== undefined &&
    !banToggling &&
    existing.banned
  ) {
    logActivity({
      request,
      action: "USER_UPDATE",
      category: "ADMIN",
      message: `Ban reason updated (@${user.username})`,
      user,
      metadata: {
        byAdminId: admin.id,
        byAdmin: admin.username,
        banReason: user.banReason,
      },
    });
  }

  if (nextRole && nextRole !== existing.role) {
    logActivity({
      request,
      action: "USER_ROLE_CHANGE",
      category: "ADMIN",
      message: `Role ${existing.role} → ${nextRole} for @${user.username}`,
      user,
      metadata: {
        from: existing.role,
        to: nextRole,
        byAdminId: admin.id,
        byAdmin: admin.username,
      },
    });
  } else if (
    !banToggling &&
    parsed.data.banReason === undefined &&
    (parsed.data.isPremium !== undefined ||
      parsed.data.emailVerified !== undefined ||
      parsed.data.apiEnabled !== undefined ||
      depositsEnabled !== undefined ||
      canCreate !== undefined ||
      canManage !== undefined ||
      canFund !== undefined)
  ) {
    logActivity({
      request,
      action: "USER_UPDATE",
      category: "ADMIN",
      message: `Account updated (@${user.username})`,
      user,
      metadata: { byAdminId: admin.id, byAdmin: admin.username },
    });
  }

  return jsonOk({
    user: {
      ...user,
      banReason: user.banReason ?? null,
      apiEnabled: user.apiEnabled !== false,
      depositsEnabled: userCanSelfDeposit(user),
      emailVerified: user.emailVerified ?? false,
      isPremium: user.isPremium ?? false,
      premiumPurchasedAt: user.premiumPurchasedAt
        ? user.premiumPurchasedAt.toISOString()
        : null,
      createdAt: user.createdAt.toISOString(),
    },
  });
}

export async function DELETE(request: Request, { params }: Params) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return jsonError("UNAUTHORIZED", "Admin login required.", 401);
  }

  const { id } = await params;

  try {
    const deleted = await deleteAdminUser(id, admin.id);
    logActivity({
      request,
      action: "USER_DELETE",
      category: "ADMIN",
      message: `Soft-deleted @${deleted.previousUsername}`,
      user: admin,
      metadata: {
        deletedUserId: deleted.id,
        previousUsername: deleted.previousUsername,
        anonymizedUsername: deleted.username,
        deletedRole: deleted.role,
        byAdminId: admin.id,
        byAdmin: admin.username,
      },
    });
    return jsonOk({ deleted: true, soft: true, id: deleted.id });
  } catch (e) {
    const code = e instanceof Error ? e.message : "DELETE_FAILED";
    if (code === "NOT_FOUND") {
      return jsonError("NOT_FOUND", "User not found.", 404);
    }
    if (code === "CANNOT_DELETE_SELF") {
      return jsonError(
        "CANNOT_DELETE_SELF",
        "You cannot delete your own account.",
        400,
      );
    }
    if (code === "CANNOT_DELETE_ADMIN") {
      return jsonError(
        "CANNOT_DELETE_ADMIN",
        "Admin accounts cannot be deleted.",
        400,
      );
    }
    if (code === "ALREADY_DELETED") {
      return jsonError(
        "ALREADY_DELETED",
        "This account is already deleted.",
        400,
      );
    }
    return jsonError("DELETE_FAILED", "Failed to delete user.", 500);
  }
}
