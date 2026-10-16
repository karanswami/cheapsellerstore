import { Lock } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/app-ui";
import { getCurrentUser } from "@/lib/auth/customer";
import { prisma } from "@/lib/prisma";
import { sellerHasSellerPanel } from "@/lib/resellers";
import { getResellerCreateMinFundingUsd } from "@/lib/settings";
import { SellerClient } from "./seller-client";

export const dynamic = "force-dynamic";

export default async function SellerPage() {
  const user = (await getCurrentUser())!;
  if (!sellerHasSellerPanel(user)) {
    return (
      <>
        <PageHeader title="Seller panel" />
        <EmptyState icon={Lock} title="Seller panel isn't enabled" hint="This area is for sellers with reseller-management permissions." />
      </>
    );
  }

  const [rows, minUsd] = await Promise.all([
    prisma.user.findMany({
      where: { referredById: user.id, role: "RESELLER", NOT: { username: { startsWith: "del_" } } },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, username: true, email: true, walletBalance: true, banned: true, createdAt: true },
    }),
    getResellerCreateMinFundingUsd(),
  ]);

  return (
    <>
      <PageHeader title="Seller panel" subtitle="Create, fund and manage your resellers." />
      <SellerClient
        resellers={rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }))}
        minUsd={minUsd}
        can={{ create: user.canCreateResellers, manage: user.canManageResellers, fund: user.canFundResellers }}
      />
    </>
  );
}
