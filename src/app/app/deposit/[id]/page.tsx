import { DepositWaitingView } from "@/components/app/deposit-waiting-view";
import { getCurrentUser } from "@/lib/auth/customer";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

type Props = { params: Promise<{ id: string }> };

export default async function DepositDetailPage({ params }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect("/?auth=login&next=/app/deposit");

  const { id } = await params;
  const deposit = await prisma.deposit.findFirst({
    where: { id, userId: user.id },
  });
  if (!deposit) redirect("/app/deposit");

  return <DepositWaitingView depositId={deposit.id} />;
}
