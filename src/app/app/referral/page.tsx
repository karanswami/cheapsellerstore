import { headers } from "next/headers";
import { PageHeader } from "@/components/app-ui";
import { getCurrentUser } from "@/lib/auth/customer";
import { getReferralDashboard } from "@/lib/referrals";
import { ReferralClient } from "./referral-client";

export const dynamic = "force-dynamic";

export default async function ReferralPage() {
  const user = (await getCurrentUser())!;
  const data = await getReferralDashboard(user.id);
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return (
    <>
      <PageHeader title="Referral" subtitle="Share your link — earn a commission on every purchase your friends make." />
      <ReferralClient data={data} role={user.role} origin={`${proto}://${host}`} />
    </>
  );
}
