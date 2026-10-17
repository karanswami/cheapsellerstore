import "server-only";
import { prisma } from "@/lib/prisma";
import { Currency, formatMoney, usdToMicrocents } from "@/lib/currencies";
import {
  getDepositCurrencies,
  getDepositFxRates,
  isCurrencyRegistered,
  usdFromLocalAmount,
} from "@/lib/deposit-currency-rates";
import {
  completeDepositOnce,
  DEPOSIT_CREDIT_LOCK_ACTION,
  expireOldDeposits,
  failDepositOnce,
} from "@/lib/deposit-credit";
import {
  getDepositProviderAdapter,
  getDepositProviderLabel,
} from "@/lib/deposit-providers";
import { getAutoGateways, getGatewayById, gatewayForDeposit, runInGateway } from "@/lib/auto-gateways";
import {
  getManualMethodById,
  manualMethodPayCurrency,
} from "@/lib/manual-deposit-methods";
import { isManualProofDeposit } from "@/types/manual-deposit";
import { getBinancePayMeta } from "@/lib/deposit-provider-http";
import { DepositMethod, DepositStatus } from "@prisma/client";
import { logActivity } from "@/lib/activity-log";
import { notifyTelegram } from "@/lib/telegram-notify";
import { notifyUser } from "@/lib/notifications";

export {
  completeDepositOnce,
  DEPOSIT_CREDIT_LOCK_ACTION,
  expireOldDeposits,
  failDepositOnce,
} from "@/lib/deposit-credit";

export { isManualProofDeposit } from "@/types/manual-deposit";

/** User-facing ticket window. Cron still polls EXPIRED auto rails for
 *  `DEPOSIT_PROVIDER_GRACE_MINUTES` (default 60) past expiresAt for late confirms. */
const EXPIRY_MINUTES: Record<DepositMethod, number> = {
  BINANCE: 5,
  UPI: 10,
  QRIS: 10,
  ESEWA: 30,
  MANUAL: 30,
  MGCLOUDPAY: 10,
};

function addMinutes(minutes: number) {
  return new Date(Date.now() + minutes * 60_000);
}


function normalizeLocalAmount(value: number, method: DepositMethod) {
  if (!Number.isFinite(value) || value <= 0) return NaN;
  if (
    method === DepositMethod.UPI ||
    method === DepositMethod.QRIS ||
    method === DepositMethod.MGCLOUDPAY ||
    method === DepositMethod.ESEWA ||
    method === DepositMethod.MANUAL
  ) {
    return Math.max(1, Math.round(value));
  }
  return Math.round(value * 100) / 100;
}

export async function createProviderDeposit(input: {
  userId: string;
  username: string;
  email: string | null;
  phone?: string | null;
  role: import("@prisma/client").UserRole;
  /** Auto gateway id (admin → Payments → Gateways). */
  gatewayId: string;
  /** Local amount in the gateway's pay currency. */
  localAmount: number;
}) {
  const gateway = await getGatewayById(input.gatewayId);
  if (!gateway || !gateway.enabled) {
    return {
      ok: false as const,
      code: "METHOD_DISABLED",
      message: "This payment method is temporarily unavailable.",
    };
  }
  if (gateway.maintenance) {
    return {
      ok: false as const,
      code: "MAINTENANCE",
      message: gateway.maintenanceNote || `${gateway.name} is under maintenance. Please try another method.`,
    };
  }

  const method = gateway.provider as DepositMethod;
  const payCurrency = gateway.currency;
  const localAmount = normalizeLocalAmount(input.localAmount, method);
  if (!Number.isFinite(localAmount) || localAmount <= 0) {
    return {
      ok: false as const,
      code: "INVALID_AMOUNT",
      message: "Amount must be positive.",
    };
  }

  const rates = await getDepositFxRates();
  const usdAmount = usdFromLocalAmount(localAmount, payCurrency, rates);
  const amountMicrocents = usdToMicrocents(usdAmount);
  if (amountMicrocents < 1) {
    return {
      ok: false as const,
      code: "INVALID_AMOUNT",
      message: "Amount is too small after conversion.",
    };
  }

  const expiresAt = addMinutes(EXPIRY_MINUTES[method] || 15);
  const adapter = getDepositProviderAdapter(method);
  if (!adapter.createInvoice) {
    return {
      ok: false as const,
      code: "PROVIDER",
      message: "Provider cannot create invoices.",
    };
  }

  let invoice;
  try {
    invoice = await runInGateway(gateway, () =>
      adapter.createInvoice!({
        user: {
          id: input.userId,
          username: input.username,
          email: input.email,
          phone: input.phone,
          role: input.role,
        },
        method,
        payCurrency,
        localAmount,
        amountMicrocents,
        expiresAt,
      }),
    );
  } catch (err) {
    return {
      ok: false as const,
      code: "PROVIDER",
      message:
        err instanceof Error ? err.message : "Payment provider unavailable.",
    };
  }

  const deposit = await prisma.deposit.create({
    data: {
      userId: input.userId,
      method,
      gatewayKey: gateway.id,
      status: DepositStatus.PENDING,
      currency: Currency.USD,
      payCurrency,
      amount: amountMicrocents,
      requestedAmount: localAmount,
      payableAmount: invoice.payableAmount,
      providerDepositId: invoice.providerDepositId ?? null,
      providerReference: invoice.providerReference ?? null,
      secretCode: invoice.secretCode ?? null,
      qrImage: invoice.qrImage ?? null,
      qrString: invoice.qrString ?? null,
      paymentUrl: invoice.paymentUrl ?? null,
      instructions: invoice.instructions,
      expiresAt,
    },
  });

  logActivity({
    action: "DEPOSIT_CREATE",
    category: "WALLET",
    message: `Deposit created ${formatMoney(amountMicrocents)} via ${gateway.name}`,
    userId: input.userId,
    username: input.username,
    email: input.email,
    role: input.role,
    metadata: {
      depositId: deposit.id,
      method,
      gatewayId: gateway.id,
      payCurrency,
      localAmount,
      amount: amountMicrocents,
    },
  });

  return {
    ok: true as const,
    deposit,
    invoice,
    label: gateway.name,
    redirectPath: `/app/deposit/${deposit.id}`,
  };
}

export async function createManualMethodDeposit(input: {
  userId: string;
  role: import("@prisma/client").UserRole;
  manualMethodKey: string;
  localAmount: number;
  proofImage: string;
}) {
  const proofUrl = input.proofImage.trim();
  if (!proofUrl || proofUrl.length > 500) {
    return {
      ok: false as const,
      code: "INVALID_PROOF",
      message: "Payment screenshot is required.",
    };
  }

  const manualMethod = await getManualMethodById(input.manualMethodKey);
  if (!manualMethod || !manualMethod.enabled) {
    return {
      ok: false as const,
      code: "METHOD_DISABLED",
      message: "This payment method is temporarily unavailable.",
    };
  }

  const payCurrency = manualMethodPayCurrency(manualMethod.currency);
  const currencies = await getDepositCurrencies();
  if (!isCurrencyRegistered(currencies, payCurrency)) {
    return {
      ok: false as const,
      code: "CURRENCY_MISSING",
      message:
        "This method’s currency is not registered. Ask an admin to add it under Currencies & rates.",
    };
  }

  const localAmount = normalizeLocalAmount(
    input.localAmount,
    DepositMethod.MANUAL,
  );
  if (!Number.isFinite(localAmount) || localAmount <= 0) {
    return {
      ok: false as const,
      code: "INVALID_AMOUNT",
      message: "Amount must be positive.",
    };
  }

  const rates = await getDepositFxRates();
  const usdAmount = usdFromLocalAmount(localAmount, payCurrency, rates);
  const amountMicrocents = usdToMicrocents(usdAmount);
  if (amountMicrocents < 1) {
    return {
      ok: false as const,
      code: "INVALID_AMOUNT",
      message: "Amount is too small after conversion.",
    };
  }

  const expiresAt = addMinutes(EXPIRY_MINUTES.MANUAL);
  const instructions =
    manualMethod.instructions ||
    `Pay the exact ${manualMethod.currency} amount, then upload your payment screenshot for admin review.`;

  const deposit = await prisma.deposit.create({
    data: {
      userId: input.userId,
      method: DepositMethod.MANUAL,
      manualMethodKey: manualMethod.id,
      status: DepositStatus.PROCESSING,
      currency: Currency.USD,
      payCurrency,
      amount: amountMicrocents,
      requestedAmount: localAmount,
      payableAmount: localAmount,
      providerDepositId: manualMethod.id,
      qrImage: manualMethod.qrUrl || null,
      instructions: manualMethod.accountNumber
        ? `${instructions}\n\nAccount: ${manualMethod.accountNumber}`
        : instructions,
      proofImage: proofUrl,
      proofUploadedAt: new Date(),
      expiresAt,
    },
  });

  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { username: true, email: true },
  });
  void notifyTelegram(
    "manualDeposit",
    [
      "🧾 Manual deposit submitted",
      `Method: ${manualMethod.name}`,
      `Local: ${localAmount} ${payCurrency}`,
      `USD credit: ${formatMoney(amountMicrocents)}`,
      `User: @${user?.username ?? "?"} (${user?.email ?? input.userId})`,
      `Deposit: ${deposit.id}`,
      "Status: awaiting admin review",
    ].join("\n"),
  );

  void notifyUser({
    userId: input.userId,
    type: "deposit_review",
    title: "Deposit received, under review",
    message: `We got your ${formatMoney(amountMicrocents)} payment via ${manualMethod.name}. You'll be notified as soon as it's credited.`,
    actionUrl: `/app/deposit/${deposit.id}`,
    skipWebPush: true,
  }).catch(() => {});

  logActivity({
    action: "DEPOSIT_CREATE",
    category: "WALLET",
    message: `Manual deposit ${formatMoney(amountMicrocents)} via ${manualMethod.name}`,
    userId: input.userId,
    username: user?.username,
    email: user?.email,
    role: input.role,
    metadata: {
      depositId: deposit.id,
      method: "MANUAL",
      manualMethodKey: manualMethod.id,
      payCurrency,
      localAmount,
      amount: amountMicrocents,
    },
  });

  return {
    ok: true as const,
    deposit,
    label: manualMethod.name,
    redirectPath: `/app/deposit/${deposit.id}`,
  };
}

/** @deprecated use createProviderDeposit */
export async function createManualDeposit(input: {
  userId: string;
  amountUsd: number;
  method?: DepositMethod;
  proofImage?: string;
}) {
  const user = await prisma.user.findUnique({ where: { id: input.userId } });
  if (!user) {
    return { ok: false as const, code: "NOT_FOUND", message: "User not found." };
  }
  const wanted = input.method ?? DepositMethod.BINANCE;
  const gateway = (await getAutoGateways()).find((g) => g.provider === wanted && g.enabled && !g.maintenance);
  if (!gateway) {
    return { ok: false as const, code: "METHOD_DISABLED", message: "This payment method is temporarily unavailable." };
  }
  const result = await createProviderDeposit({
    userId: user.id,
    username: user.username,
    email: user.email,
    phone: null,
    role: user.role,
    gatewayId: gateway.id,
    localAmount: input.amountUsd,
  });
  if (!result.ok) return result;
  if (input.proofImage) {
    const updated = await prisma.deposit.update({
      where: { id: result.deposit.id },
      data: {
        proofImage: input.proofImage,
        proofUploadedAt: new Date(),
      },
    });
    return { ok: true as const, deposit: updated };
  }
  return { ok: true as const, deposit: result.deposit };
}

export async function approveDeposit(
  depositId: string,
  reviewerId?: string,
  note?: string,
) {
  const deposit = await prisma.deposit.findUnique({ where: { id: depositId } });
  if (!deposit) {
    return { ok: false as const, code: "NOT_FOUND", message: "Deposit not found." };
  }
  if (isManualProofDeposit(deposit.method) && !deposit.proofImage) {
    return {
      ok: false as const,
      code: "PROOF_REQUIRED",
      message: "Cannot approve a manual deposit without payment proof.",
    };
  }

  const result = await completeDepositOnce({
    depositId,
    method: deposit.method,
    allowFinalRecheck: true,
    reviewerId,
    note: note ?? "Deposit approved by admin",
    providerReference:
      deposit.providerReference ||
      deposit.providerDepositId ||
      deposit.secretCode ||
      undefined,
  });

  if (!result.completed) {
    return {
      ok: false as const,
      code: result.reason?.toUpperCase() || "FAILED",
      message:
        result.reason === "already_completed"
          ? "Deposit already approved."
          : result.reason === "credit_lock_active"
            ? "Deposit is already being processed."
            : result.reason === "user_banned"
              ? "Cannot credit a banned account. Unban the user first, or reject the deposit."
              : "Could not approve deposit.",
    };
  }

  const updated = await prisma.deposit.findUnique({ where: { id: depositId } });
  return { ok: true as const, deposit: updated! };
}

export async function rejectDeposit(
  depositId: string,
  reviewerId?: string,
  note?: string,
) {
  const deposit = await prisma.deposit.findUnique({ where: { id: depositId } });
  if (!deposit) {
    return { ok: false as const, code: "NOT_FOUND", message: "Deposit not found." };
  }
  if (deposit.status === DepositStatus.COMPLETED) {
    return {
      ok: false as const,
      code: "ALREADY_DONE",
      message: "Cannot reject an approved deposit.",
    };
  }
  if (deposit.adminAction === DEPOSIT_CREDIT_LOCK_ACTION) {
    return {
      ok: false as const,
      code: "CREDIT_LOCK",
      message: "Deposit is being credited; try again shortly.",
    };
  }

  const reasonText = note?.trim() || "Rejected by admin";

  const updated = await prisma.deposit.update({
    where: { id: depositId },
    data: {
      status: DepositStatus.FAILED,
      adminAction: "rejected",
      adminNote: reasonText,
      failReason: reasonText,
      reviewedById: reviewerId ?? null,
      reviewedAt: new Date(),
      cancelledAt: new Date(),
    },
  });

  logActivity({
    action: "DEPOSIT_REJECTED",
    category: "ADMIN",
    message: `Deposit ${formatMoney(deposit.amount)} rejected: ${reasonText}`,
    userId: reviewerId,
    metadata: {
      depositId,
      userId: deposit.userId,
      amount: deposit.amount,
      reason: reasonText,
      method: deposit.method,
    },
  });

  void notifyUser({
    userId: deposit.userId,
    type: "deposit_rejected",
    title: "Deposit rejected",
    message: `Your deposit of ${formatMoney(deposit.amount)} was rejected. Reason: ${reasonText}`,
    actionUrl: `/app/deposit/${deposit.id}`,
  }).catch((err) => {
    console.warn("[deposit] notifyUser failed:", err);
  });

  const user = await prisma.user.findUnique({
    where: { id: deposit.userId },
    select: { username: true, email: true },
  });
  void notifyTelegram(
    "manualDeposit",
    [
      "❌ Deposit REJECTED",
      `Amount: ${formatMoney(deposit.amount)}`,
      `User: @${user?.username ?? "?"} (${user?.email ?? deposit.userId})`,
      `Reason: ${reasonText}`,
      `Deposit: ${deposit.id}`,
    ].join("\n"),
  );

  return { ok: true as const, deposit: updated };
}

export async function cancelDeposit(depositId: string, userId: string) {
  const deposit = await prisma.deposit.findFirst({
    where: { id: depositId, userId },
  });
  if (!deposit) {
    return { ok: false as const, code: "NOT_FOUND", message: "Deposit not found." };
  }
  if (
    deposit.status !== DepositStatus.PENDING &&
    deposit.status !== DepositStatus.PROCESSING
  ) {
    return {
      ok: false as const,
      code: "NOT_PENDING",
      message: "Only open deposits can be cancelled.",
    };
  }
  if (deposit.proofImage) {
    return {
      ok: false as const,
      code: "HAS_PROOF",
      message: "Deposits with proof cannot be cancelled — wait for admin review.",
    };
  }

  const updated = await prisma.deposit.update({
    where: { id: depositId },
    data: {
      status: DepositStatus.CANCELLED,
      failReason: "cancelled_by_user",
      cancelledAt: new Date(),
    },
  });

  logActivity({
    action: "DEPOSIT_CANCELLED",
    category: "WALLET",
    message: `Deposit cancelled (${getDepositProviderLabel(deposit.method)})`,
    userId,
    metadata: { depositId, method: deposit.method },
  });

  return { ok: true as const, deposit: updated };
}

export async function attachProof(
  depositId: string,
  userId: string,
  proofImage: string,
) {
  const url = proofImage.trim();
  if (!url || url.length > 500) {
    return { ok: false as const, code: "INVALID_PROOF", message: "Invalid proof URL." };
  }

  const deposit = await prisma.deposit.findFirst({
    where: { id: depositId, userId },
  });
  if (!deposit) {
    return { ok: false as const, code: "NOT_FOUND", message: "Deposit not found." };
  }
  if (!isManualProofDeposit(deposit.method)) {
    return {
      ok: false as const,
      code: "NOT_MANUAL",
      message: "Proof upload is only for manual deposits.",
    };
  }
  if (
    deposit.status !== DepositStatus.PENDING &&
    deposit.status !== DepositStatus.PROCESSING
  ) {
    return {
      ok: false as const,
      code: "CLOSED",
      message: "Cannot attach proof to a closed deposit.",
    };
  }

  const updated = await prisma.deposit.update({
    where: { id: depositId },
    data: {
      proofImage: url,
      proofUploadedAt: new Date(),
      status: DepositStatus.PROCESSING,
    },
  });

  return { ok: true as const, deposit: updated };
}

export async function getDepositStatusForUser(depositId: string, userId: string) {
  const deposit = await prisma.deposit.findFirst({
    where: { id: depositId, userId },
  });
  if (!deposit) {
    return { ok: false as const, code: "NOT_FOUND", message: "Deposit not found." };
  }

  // Soft-expire on read if past window (non-eSewa-with-proof).
  if (
    deposit.expiresAt &&
    deposit.expiresAt < new Date() &&
    (deposit.status === DepositStatus.PENDING ||
      deposit.status === DepositStatus.PROCESSING) &&
    !(isManualProofDeposit(deposit.method) && deposit.proofImage)
  ) {
    await prisma.deposit.update({
      where: { id: deposit.id },
      data: {
        status: DepositStatus.EXPIRED,
        failReason: "expired",
        cancelledAt: deposit.cancelledAt || new Date(),
      },
    });
    deposit.status = DepositStatus.EXPIRED;
    deposit.failReason = "expired";
  }

  const gateway =
    deposit.method === DepositMethod.MANUAL ? undefined : await gatewayForDeposit(deposit);
  const binanceMeta =
    deposit.method === DepositMethod.BINANCE
      ? await runInGateway(gateway, () => getBinancePayMeta())
      : null;

  let label = gateway?.name ?? getDepositProviderLabel(deposit.method);
  let methodIconUrl: string | null = null;
  let methodIconKey: string | null = null;
  if (deposit.method === DepositMethod.MANUAL && deposit.manualMethodKey) {
    const manual = await getManualMethodById(deposit.manualMethodKey);
    if (manual) {
      label = manual.name;
      methodIconUrl = manual.iconUrl ?? null;
      methodIconKey = manual.iconKey ?? null;
    }
  }

  return {
    ok: true as const,
    deposit: {
      id: deposit.id,
      status: deposit.status,
      method: deposit.method,
      manualMethodKey: deposit.manualMethodKey,
      gatewayKey: deposit.gatewayKey,
      amount: deposit.amount,
      currency: deposit.currency,
      payCurrency: deposit.payCurrency,
      requestedAmount: deposit.requestedAmount,
      payableAmount: deposit.payableAmount,
      providerDepositId: deposit.providerDepositId,
      secretCode: deposit.secretCode,
      qrImage: deposit.qrImage,
      qrString: deposit.qrString,
      paymentUrl: deposit.paymentUrl,
      paymentSessionId: null,
      cashfreeMode: null,
      payId: binanceMeta?.payId || null,
      instructions: deposit.instructions,
      expiresAt: deposit.expiresAt,
      proofImage: deposit.proofImage,
      proofUploadedAt: deposit.proofUploadedAt,
      adminAction: deposit.adminAction,
      adminNote: deposit.adminNote,
      failReason: deposit.failReason,
      reviewedAt: deposit.reviewedAt,
      createdAt: deposit.createdAt,
      completedAt: deposit.completedAt,
      cancelledAt: deposit.cancelledAt,
      hasProof: Boolean(deposit.proofImage),
      label,
      methodIconUrl,
      methodIconKey,
    },
  };
}

export async function reportDepositIssue(
  depositId: string,
  userId: string,
  note: string,
) {
  const deposit = await prisma.deposit.findFirst({
    where: { id: depositId, userId },
  });
  if (!deposit) {
    return { ok: false as const, code: "NOT_FOUND", message: "Deposit not found." };
  }

  const updated = await prisma.deposit.update({
    where: { id: depositId },
    data: {
      adminAction: "reported",
      adminNote: note,
    },
  });

  return { ok: true as const, deposit: updated };
}
