import Link from "next/link";
import { BadgeCheck, Clock, Store } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/app-ui";
import { getCurrentUser } from "@/lib/auth/customer";
import { formatMoney, usdToMicrocents } from "@/lib/currencies";
import { prisma } from "@/lib/prisma";
import { getResellerApplyMinBalanceUsd, isResellerProgramEnabled } from "@/lib/settings";
import { Button } from "@/components/ui/button";
import { BecomeSellerForm } from "./seller-form";

export const dynamic = "force-dynamic";

export default async function BecomeSellerPage() {
  const user = (await getCurrentUser())!;

  if (user.role !== "USER") {
    return (
      <>
        <PageHeader title="Become a Seller" />
        <EmptyState icon={BadgeCheck} title="You already have wholesale access" hint="Your account is already upgraded.">
          <Button asChild>
            <Link href="/app/seller">Open seller panel</Link>
          </Button>
        </EmptyState>
      </>
    );
  }

  const [enabled, minUsd, pending, latest] = await Promise.all([
    isResellerProgramEnabled(),
    getResellerApplyMinBalanceUsd(),
    prisma.resellerRequest.findFirst({ where: { userId: user.id, status: "PENDING" }, select: { createdAt: true } }),
    prisma.resellerRequest.findFirst({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, select: { status: true } }),
  ]);
  const enough = user.walletBalance >= usdToMicrocents(minUsd);

  return (
    <>
      <PageHeader title="Become a Seller" subtitle="Get wholesale prices, a seller panel and bigger commissions." />
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div>
          {!enabled ? (
            <EmptyState icon={Store} title="Applications are closed" hint="The seller program isn't accepting requests right now." />
          ) : pending ? (
            <EmptyState icon={Clock} title="Application under review" hint="We'll notify you as soon as an admin has reviewed your request." />
          ) : !enough ? (
            <EmptyState icon={Store} title={`Wallet needs ${formatMoney(usdToMicrocents(minUsd))}`} hint={`Your balance is ${formatMoney(user.walletBalance)}. Top up to unlock the application form.`}>
              <Button asChild>
                <Link href="/app/deposit">Deposit now</Link>
              </Button>
            </EmptyState>
          ) : (
            <BecomeSellerForm lastStatus={latest?.status ?? null} />
          )}
        </div>
        <aside className="space-y-3 rounded-xl border bg-card p-5 text-sm">
          <h2 className="font-display text-lg font-semibold">What you get</h2>
          <ul className="space-y-2 text-muted-foreground">
            <li>• Wholesale pricing on the full catalog</li>
            <li>• Platform API access &amp; webhooks</li>
            <li>• Seller leaderboard &amp; higher referral commission</li>
          </ul>
          <p className="border-t pt-3 text-xs text-muted-foreground">Minimum wallet balance to apply: {formatMoney(usdToMicrocents(minUsd))}</p>
        </aside>
      </div>
    </>
  );
}
