import { ProfileView } from "@/components/app/profile-view";
import { getCurrentUser } from "@/lib/auth/customer";
import { usdToMicrocents } from "@/lib/currencies";
import { prisma } from "@/lib/prisma";
import {
  getResellerApplyMinBalanceUsd,
  isResellerProgramEnabled,
} from "@/lib/settings";
import { getActiveStaticPagesNav } from "@/lib/static-pages";
import { ResellerRequestStatus } from "@prisma/client";
import { redirect } from "next/navigation";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/?auth=login&next=/app/profile");

  const programEnabled = await isResellerProgramEnabled();
  const minUsd = await getResellerApplyMinBalanceUsd();
  const [pending, staticPages] = await Promise.all([
    prisma.resellerRequest.findFirst({
      where: { userId: user.id, status: ResellerRequestStatus.PENDING },
      select: { id: true },
    }),
    getActiveStaticPagesNav(),
  ]);

  const showJoinReseller =
    programEnabled &&
    user.role === "USER" &&
    !pending &&
    user.walletBalance >= usdToMicrocents(minUsd);

  const resellerStatus = pending
    ? ("pending" as const)
    : user.role === "SELLER" || user.role === "RESELLER"
      ? ("reseller" as const)
      : !programEnabled
        ? ("closed" as const)
        : user.role === "USER" && user.walletBalance < usdToMicrocents(minUsd)
          ? ("low_balance" as const)
          : user.role === "USER"
            ? ("eligible" as const)
            : ("hidden" as const);

  return (
    <ProfileView
      user={user}
      resellerCta={{
        showJoin: showJoinReseller,
        status: resellerStatus,
        minBalanceUsd: minUsd,
      }}
      staticPages={staticPages}
    />
  );
}
