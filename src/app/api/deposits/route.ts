import { jsonError, jsonOk } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth/customer";
import { createManualMethodDeposit, createProviderDeposit } from "@/lib/deposits";
import { maintenanceApiBlock } from "@/lib/maintenance";
import { getDepositFxRates } from "@/lib/deposit-currency-rates";
import {
  getDepositMinsForRole,
  minForCurrency,
} from "@/lib/deposit-mins";
import { getAutoGateways, toPublicGateways } from "@/lib/auto-gateways";
import {
  getDepositQuickAmounts,
} from "@/lib/deposit-quick-amounts";
import {
  getManualDepositMethods,
  manualMethodPayCurrency,
  toPublicManualMethods,
} from "@/lib/manual-deposit-methods";
import { prisma } from "@/lib/prisma";
import { userCanSelfDeposit } from "@/lib/roles";
import { z } from "zod";
import { withIdempotency } from "@/lib/idempotent-route";
import { rateLimitAll } from "@/lib/rate-limit";

const autoSchema = z.object({
  amount: z.number().positive(),
  gatewayId: z.string().trim().min(1).max(40),
});

const manualSchema = z.object({
  amount: z.number().positive(),
  manualMethodKey: z.string().trim().min(1).max(50),
  proofImage: z.string().trim().min(1).max(500),
});

function formatLocalMin(amount: number, currency: string) {
  if (currency === "USD") {
    return `$${amount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
  return `${amount.toLocaleString()} ${currency}`;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return jsonError("UNAUTHORIZED", "Login required.", 401);

  const [deposits, rates, minDeposits, gateways, manualMethods, quickAmounts] =
    await Promise.all([
      prisma.deposit.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      getDepositFxRates(),
      getDepositMinsForRole(user.role),
      getAutoGateways(),
      getManualDepositMethods(),
      getDepositQuickAmounts(),
    ]);

  return jsonOk({
    walletBalance: user.walletBalance,
    currency: "USD",
    depositsEnabled: user.depositsEnabled,
    deposits,
    rates,
    minDeposits,
    quickAmounts,
    gateways: toPublicGateways(gateways),
    manualMethods: toPublicManualMethods(manualMethods),
  });
}

export async function POST(request: Request) {
  const maint = await maintenanceApiBlock();
  if (maint) return maint;

  const user = await getCurrentUser();
  if (!user) return jsonError("UNAUTHORIZED", "Login required.", 401);

  const limited = await rateLimitAll([
    { key: `dep-create:${user.id}`, limit: 10, windowMs: 10 * 60_000 },
  ]);
  if (limited) {
    return jsonError("RATE_LIMITED", "Too many deposit requests. Try again shortly.", 429, {
      headers: { "Retry-After": String(limited.retryAfterSec) },
    });
  }
  return withIdempotency(request, `deposit-create:${user.id}`, () => createDepositFor(request, user.id));
}

async function createDepositFor(request: Request, userId: string) {
  const full = await prisma.user.findUnique({ where: { id: userId } });
  if (!full) return jsonError("UNAUTHORIZED", "Login required.", 401);

  if (!userCanSelfDeposit(full)) {
    return jsonError(
      "DEPOSITS_DISABLED",
      full.role === "RESELLER"
        ? "Self-serve deposits are disabled for this reseller account. Ask your seller to top up your balance."
        : "Self-serve deposits are disabled on this account. Contact support or your account manager.",
      403,
    );
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return jsonError("VALIDATION", "Invalid payload.", 400);
  }

  if ("manualMethodKey" in body) {
    const parsed = manualSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(
        "VALIDATION",
        parsed.error.issues[0]?.message ?? "Invalid.",
        400,
      );
    }

    const manualMethod = (await getManualDepositMethods()).find(
      (m) => m.id === parsed.data.manualMethodKey && m.enabled,
    );
    if (!manualMethod) {
      return jsonError(
        "METHOD_DISABLED",
        "This payment method is temporarily unavailable.",
        400,
      );
    }

    const payCurrency = manualMethodPayCurrency(manualMethod.currency);
    const mins = await getDepositMinsForRole(full.role);
    const minLocal = minForCurrency(mins, payCurrency);

    if (parsed.data.amount + 1e-9 < minLocal) {
      return jsonError(
        "VALIDATION",
        `Minimum deposit is ${formatLocalMin(minLocal, payCurrency)}.`,
        400,
      );
    }

    const result = await createManualMethodDeposit({
      userId: full.id,
      role: full.role,
      manualMethodKey: parsed.data.manualMethodKey,
      localAmount: parsed.data.amount,
      proofImage: parsed.data.proofImage,
    });

    if (!result.ok) return jsonError(result.code, result.message, 400);

    return jsonOk({
      deposit: result.deposit,
      label: result.label,
      redirectPath: result.redirectPath,
    });
  }

  const parsed = autoSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      "VALIDATION",
      parsed.error.issues[0]?.message ?? "Invalid.",
      400,
    );
  }

  const gateway = (await getAutoGateways()).find((g) => g.id === parsed.data.gatewayId);
  if (!gateway || !gateway.enabled) {
    return jsonError("METHOD_DISABLED", "This payment method is temporarily unavailable.", 400);
  }
  if (gateway.maintenance) {
    return jsonError(
      "MAINTENANCE",
      gateway.maintenanceNote || `${gateway.name} is under maintenance. Please try another method.`,
      400,
    );
  }
  const payCurrency = gateway.currency;
  const mins = await getDepositMinsForRole(full.role);
  const minLocal = minForCurrency(mins, payCurrency);

  if (parsed.data.amount + 1e-9 < minLocal) {
    return jsonError(
      "VALIDATION",
      `Minimum deposit is ${formatLocalMin(minLocal, payCurrency)}.`,
      400,
    );
  }

  const result = await createProviderDeposit({
    userId: full.id,
    username: full.username,
    email: full.email,
    phone: null,
    role: full.role,
    gatewayId: gateway.id,
    localAmount: parsed.data.amount,
  });

  if (!result.ok) return jsonError(result.code, result.message, 400);

  return jsonOk({
    deposit: result.deposit,
    redirectPath: result.redirectPath,
    label: result.label,
  });
}
