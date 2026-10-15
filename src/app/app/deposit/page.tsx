import { DepositView } from "@/components/app/deposit-view";
import { getCurrentUser } from "@/lib/auth/customer";
import { resolveUpiDepositReturn } from "@/lib/deposit-upi-return";
import { redirect } from "next/navigation";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DepositPage({ searchParams }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect("/?auth=login&next=/app/deposit");

  const params = await searchParams;
  const returnPath = await resolveUpiDepositReturn(user.id, params);
  if (returnPath) redirect(returnPath);

  return <DepositView initialBalance={user.walletBalance} />;
}
