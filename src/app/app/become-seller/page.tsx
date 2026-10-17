import { getCurrentUser } from "@/lib/auth/customer";
import { usdToMicrocents } from "@/lib/currencies";
import { prisma } from "@/lib/prisma";
import { sellerHasSellerPanel } from "@/lib/resellers";
import { getSellerProgramConfig } from "@/lib/seller-program";
import { getResellerApplyMinBalanceUsd, isResellerAutoApprove, isResellerProgramEnabled } from "@/lib/settings";
import { getSupportChannels } from "@/lib/support-channels";
import { reapplyAvailableAt, SELLER_FIELDS } from "@/types/seller-program";
import { BecomeSellerClient, type BecomeSellerState } from "./seller-form";

export const dynamic = "force-dynamic";

export default async function BecomeSellerPage() {
  const user = (await getCurrentUser())!;

  const [enabled, autoApprove, minUsd, config, pending, latest, sellerCount, support] = await Promise.all([
    isResellerProgramEnabled(),
    isResellerAutoApprove(),
    getResellerApplyMinBalanceUsd(),
    getSellerProgramConfig(),
    prisma.resellerRequest.findFirst({ where: { userId: user.id, status: "PENDING" }, select: { createdAt: true } }),
    prisma.resellerRequest.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: { status: true, adminNote: true, reviewedAt: true },
    }),
    prisma.user.count({ where: { role: { in: ["SELLER", "RESELLER"] } } }),
    getSupportChannels(),
  ]);

  const retryAt = reapplyAvailableAt(latest, config.reapplyCooldownDays);
  const minBalance = usdToMicrocents(minUsd);

  let state: BecomeSellerState;
  if (user.role !== "USER") state = "seller";
  else if (pending) state = "pending";
  else if (!enabled) state = "closed";
  else if (retryAt) state = "cooldown";
  else if (user.walletBalance < minBalance) state = "locked";
  else state = "apply";

  return (
    <BecomeSellerClient
      state={state}
      headline={config.headline}
      closedMessage={config.closedMessage}
      perks={config.perks}
      fields={SELLER_FIELDS.filter((f) => config.fields[f.key] !== "hidden").map((f) => ({ ...f, required: config.fields[f.key] === "required" }))}
      autoApprove={autoApprove}
      minBalance={minBalance}
      walletBalance={user.walletBalance}
      sellerCount={sellerCount}
      supportHref={support.primaryHref}
      pendingSince={pending?.createdAt.toISOString() ?? null}
      lastRejection={latest?.status === "REJECTED" ? { note: latest.adminNote, retryAt: retryAt?.toISOString() ?? null } : null}
      hasSellerPanel={sellerHasSellerPanel(user)}
    />
  );
}
