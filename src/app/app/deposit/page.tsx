import { Wallet } from "lucide-react";
import { PageHeader } from "@/components/app-ui";
import { getCurrentUser } from "@/lib/auth/customer";
import { formatMoney } from "@/lib/currencies";
import {
  getDepositCurrencies,
  getDepositFxRates,
} from "@/lib/deposit-currency-rates";
import { getAutoGateways, toPublicGateways } from "@/lib/auto-gateways";
import { getDepositMinsForRole } from "@/lib/deposit-mins";
import { getDepositQuickAmounts } from "@/lib/deposit-quick-amounts";
import {
  getManualDepositMethods,
  toPublicManualMethods,
} from "@/lib/manual-deposit-methods";
import { prisma } from "@/lib/prisma";
import { userCanSelfDeposit } from "@/lib/roles";
import { DepositClient, type DepositRow } from "./deposit-client";

export const dynamic = "force-dynamic";

export default async function DepositPage({
  searchParams,
}: {
  searchParams: Promise<{ method?: string; amount?: string }>;
}) {
  const { method, amount } = await searchParams;
  const user = (await getCurrentUser())!;
  const [rows, rates, currencies, mins, methods, manual, quick] =
    await Promise.all([
      prisma.deposit.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      getDepositFxRates(),
      getDepositCurrencies(),
      getDepositMinsForRole(user.role),
      getAutoGateways().then(toPublicGateways),
      getManualDepositMethods().then(toPublicManualMethods),
      getDepositQuickAmounts(),
    ]);

  const deposits: DepositRow[] = rows.map((d) => ({
    id: d.id,
    status: d.status,
    method: d.method,
    manualMethodKey: d.manualMethodKey,
    amount: d.amount,
    payCurrency: d.payCurrency,
    requestedAmount: d.requestedAmount,
    createdAt: d.createdAt.toISOString(),
  }));

  return (
    <>
      {/* Phones already show the balance in the app bar; keep the keypad above the fold. */}
      <div className="hidden sm:block">
        <PageHeader
          title="Deposit"
          subtitle="Top up your wallet — credited in USD the moment payment is confirmed."
          actions={
            <span className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm font-semibold">
              <Wallet className="size-4 text-primary" />{" "}
              {formatMoney(user.walletBalance, user.currency)}
            </span>
          }
        />
      </div>
      <DepositClient
        initial={method ? { method, amount } : undefined}
        canDeposit={userCanSelfDeposit(user)}
        rates={rates}
        currencies={currencies.map((c) => ({
          code: c.code,
          name: c.name,
          symbol: c.symbol,
        }))}
        mins={mins}
        quick={quick}
        gateways={methods}
        manualMethods={manual}
        deposits={deposits}
      />
    </>
  );
}
