import Link from "next/link";
import { Lock, Store } from "lucide-react";
import { Surface, IconTile } from "@/components/app-kit";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/customer";
import { prisma } from "@/lib/prisma";
import { getSellerFundedBalances, isIndependentReseller, sellerHasSellerPanel } from "@/lib/resellers";
import { getResellerCreateMinFundingUsd } from "@/lib/settings";
import { SellerClient } from "./seller-client";

export const dynamic = "force-dynamic";

/** Resellers whose last paid order falls within the past `days`. */
function countActiveSince(lastOrders: (Date | null)[], days: number) {
  const since = Date.now() - days * 86_400_000;
  return lastOrders.filter((d) => d && d.getTime() > since).length;
}

export default async function SellerPage() {
  const user = (await getCurrentUser())!;
  if (!sellerHasSellerPanel(user)) {
    return (
      <Surface className="mx-auto mt-6 max-w-md p-6 text-center">
        <IconTile icon={Lock} tone="violet" className="mx-auto size-14 rounded-3xl [&_svg]:size-6" />
        <h1 className="mt-4 font-display text-xl font-bold tracking-tight">Seller panel isn&apos;t enabled</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          This area is for sellers with reseller-management permissions. Ask support to enable it for your account.
        </p>
        {user.role === "USER" ? (
          <Button asChild className="mt-5">
            <Link href="/app/become-seller">
              <Store /> Become a seller
            </Link>
          </Button>
        ) : null}
      </Surface>
    );
  }

  const [rows, minUsd] = await Promise.all([
    prisma.user.findMany({
      where: { referredById: user.id, role: "RESELLER", NOT: { username: { startsWith: "del_" } } },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, username: true, email: true, role: true, walletBalance: true, banned: true, depositsEnabled: true, createdAt: true },
    }),
    getResellerCreateMinFundingUsd(),
  ]);

  const [stats, funded] = await Promise.all([
    rows.length
      ? prisma.order.groupBy({
          by: ["userId"],
          where: { userId: { in: rows.map((r) => r.id) }, status: { in: ["PAID", "FULFILLED"] } },
          _count: { _all: true },
          _sum: { total: true },
          _max: { createdAt: true },
        })
      : [],
    getSellerFundedBalances(rows.filter(isIndependentReseller)),
  ]);
  const byUser = new Map(stats.map((s) => [s.userId, s]));
  const active30 = countActiveSince(stats.map((s) => s._max.createdAt), 30);

  return (
    <SellerClient
      walletBalance={user.walletBalance}
      active30={active30}
      resellers={rows.map(({ role, depositsEnabled, ...r }) => {
        const s = byUser.get(r.id);
        const independent = isIndependentReseller({ role, depositsEnabled });
        return {
          ...r,
          independent,
          reclaimable: independent ? (funded.get(r.id) ?? 0) : r.walletBalance,
          createdAt: r.createdAt.toISOString(),
          orders: s?._count._all ?? 0,
          spent: s?._sum.total ?? 0,
          lastOrderAt: s?._max.createdAt?.toISOString() ?? null,
        };
      })}
      minUsd={minUsd}
      can={{ create: user.canCreateResellers, manage: user.canManageResellers, fund: user.canFundResellers }}
    />
  );
}
