import { Currency, formatMoney } from "@/lib/currencies";
import { prisma } from "@/lib/prisma";
import { getReferralPercentForBuyerRole } from "@/lib/settings";
import { adjustWallet } from "@/lib/wallet";
import { notifyTelegram } from "@/lib/telegram-notify";
import { TransactionType, UserRole } from "@prisma/client";

function rewardNoteForBuyerRole(role: UserRole): string {
  switch (role) {
    case UserRole.SELLER:
      return "seller-purchase";
    case UserRole.RESELLER:
      return "reseller-purchase";
    default:
      return "referral";
  }
}

/** Credit referrer after a fulfilled purchase. Best-effort; never throws to caller. */
export async function creditReferralReward(input: {
  buyerId: string;
  orderId: string;
  /** Order total in microcents (positive). */
  orderTotal: number;
}): Promise<void> {
  try {
    const total = Math.abs(Math.round(input.orderTotal));
    if (total <= 0) return;

    const buyer = await prisma.user.findUnique({
      where: { id: input.buyerId },
      select: { id: true, role: true, referredById: true, username: true },
    });
    if (!buyer?.referredById) return;

    const parent = await prisma.user.findUnique({
      where: { id: buyer.referredById },
      select: { id: true, banned: true, username: true },
    });
    if (!parent || parent.banned) return;

    const percent = await getReferralPercentForBuyerRole(buyer.role);
    if (percent <= 0) return;

    const reward = Math.floor((total * percent) / 100);
    if (reward <= 0) return;

    const note = rewardNoteForBuyerRole(buyer.role);

    await adjustWallet({
      userId: parent.id,
      amount: reward,
      type: TransactionType.REFERRAL_REWARD,
      note,
      reference: input.orderId,
    });

    void notifyTelegram(
      "referral",
      [
        "🎁 Referral reward",
        `Referrer: @${parent.username}`,
        `Buyer: @${buyer.username} (${buyer.role})`,
        `Reward: ${formatMoney(reward)} (${percent}%)`,
        `Order: ${input.orderId}`,
        `Type: ${note}`,
      ].join("\n"),
    );

    // Currency unused but keeps import intentional if we log later
    void Currency.USD;
  } catch {
    // Do not fail checkout if reward credit fails
  }
}
