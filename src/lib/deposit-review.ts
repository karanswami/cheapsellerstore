import "server-only";
import { DepositStatus, type Deposit } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { notifyTelegram } from "@/lib/telegram-notify";

/** `Deposit.adminAction` marker: auto rail hit a provider timestamp/recvWindow error. */
export const DEPOSIT_REVIEW_ACTION = "REVIEW_TIMESTAMP";

/**
 * Parks an auto-rail deposit in the admin review queue and pings Telegram once.
 * Auto-polling skips it afterwards; an admin Recheck credits it if the payment is found.
 */
export async function flagDepositForReview(
  deposit: Deposit,
  info: { label: string; detail: string },
) {
  const claimed = await prisma.deposit.updateMany({
    where: {
      id: deposit.id,
      status: { in: [DepositStatus.PENDING, DepositStatus.PROCESSING] },
      OR: [{ adminAction: { isSet: false } }, { adminAction: null }],
    },
    data: {
      adminAction: DEPOSIT_REVIEW_ACTION,
      adminNote: `${info.label} timestamp/recvWindow error — needs admin review: ${info.detail}`,
    },
  });
  if (claimed.count === 0) return;

  const user = await prisma.user.findUnique({
    where: { id: deposit.userId },
    select: { username: true, email: true },
  });
  void notifyTelegram(
    "adminUpdate",
    [
      "⚠️ Deposit needs review",
      `${info.label} request failed: ${info.detail}`,
      `User: @${user?.username ?? deposit.userId}${user?.email ? ` (${user.email})` : ""}`,
      `Deposit: ${deposit.id}`,
      `Amount: ${deposit.payableAmount} ${deposit.payCurrency}`,
      "Open Admin → Deposits and tap Recheck to verify and credit.",
    ].join("\n"),
    { fallbackEvent: "deposit" },
  );
}
