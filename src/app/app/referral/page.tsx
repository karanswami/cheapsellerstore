import { headers } from "next/headers";
import { getCurrentUser } from "@/lib/auth/customer";
import { getReferralDashboard } from "@/lib/referrals";
import { isReferralCommissionEnabled } from "@/lib/settings";
import { getSpinState, getSpinTotals, spinEarnedFriendIds } from "@/lib/spin";
import { ReferralClient } from "./referral-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Invite & spin" };

export default async function ReferralPage() {
  const user = (await getCurrentUser())!;
  const [data, spin, totals, commission] = await Promise.all([
    getReferralDashboard(user.id),
    getSpinState(user.id),
    getSpinTotals(user.id),
    isReferralCommissionEnabled(),
  ]);
  const earned = await spinEarnedFriendIds(
    user.id,
    data.network.map((n) => n.id),
  );
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  // The wheel and invite ticket carry the page title.
  return (
    <ReferralClient
      data={data}
      spin={spin}
      totals={totals}
      earnedFriendIds={[...earned]}
      commission={commission}
      role={user.role}
      isAdmin={user.role === "ADMIN"}
      origin={`${proto}://${host}`}
    />
  );
}
