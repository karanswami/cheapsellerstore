import { BecomeResellerForm } from "@/components/app/become-reseller-form";
import { BecomeSellerNotice } from "@/components/app/become-seller-notice";
import { getCurrentUser } from "@/lib/auth/customer";
import { usdToMicrocents } from "@/lib/currencies";
import { prisma } from "@/lib/prisma";
import {
  getResellerApplyMinBalanceUsd,
  isResellerProgramEnabled,
} from "@/lib/settings";
import { ResellerRequestStatus } from "@prisma/client";
import { redirect } from "next/navigation";

export default async function BecomeSellerPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/?auth=login&next=/app/become-seller");

  if (user.role !== "USER") {
    redirect("/app/profile");
  }

  const enabled = await isResellerProgramEnabled();
  if (!enabled) {
    return <BecomeSellerNotice reason="disabled" />;
  }

  const pending = await prisma.resellerRequest.findFirst({
    where: { userId: user.id, status: ResellerRequestStatus.PENDING },
  });
  if (pending) return <BecomeSellerNotice reason="pending" />;

  const minUsd = await getResellerApplyMinBalanceUsd();
  if (user.walletBalance < usdToMicrocents(minUsd)) {
    return <BecomeSellerNotice reason="min-balance" minBalanceUsd={minUsd} />;
  }

  return <BecomeResellerForm user={user} minBalanceUsd={minUsd} />;
}
