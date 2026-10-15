import { jsonError, jsonOk } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/prisma";
import { userCanSelfDeposit } from "@/lib/roles";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return jsonError("UNAUTHORIZED", "Admin login required.", 401);
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
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

  return jsonOk({
    users: users.map((u) => ({
      ...u,
      banReason: u.banReason ?? null,
      apiEnabled: u.apiEnabled !== false,
      depositsEnabled: userCanSelfDeposit(u),
      emailVerified: u.emailVerified ?? false,
      isPremium: u.isPremium ?? false,
      premiumPurchasedAt: u.premiumPurchasedAt
        ? u.premiumPurchasedAt.toISOString()
        : null,
      createdAt: u.createdAt.toISOString(),
    })),
  });
}
