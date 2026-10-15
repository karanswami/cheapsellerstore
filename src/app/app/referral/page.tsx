import { ReferralView } from "@/components/app/referral-view";
import { getCurrentUser } from "@/lib/auth/customer";
import { getReferralDashboard } from "@/lib/referrals";
import { redirect } from "next/navigation";

export default async function ReferralPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/?auth=login&next=/app/referral");

  const dashboard = await getReferralDashboard(user.id);
  return <ReferralView data={dashboard} />;
}
