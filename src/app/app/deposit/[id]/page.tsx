import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/customer";
import { getDepositStatusForUser } from "@/lib/deposits";
import { DepositTicket, type TicketDeposit } from "./deposit-ticket";

export const dynamic = "force-dynamic";
export const metadata = { title: "Deposit" };

export default async function DepositTicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-f0-9]{24}$/i.test(id)) notFound();
  const user = (await getCurrentUser())!;
  const result = await getDepositStatusForUser(id, user.id).catch(() => null);
  if (!result || !result.ok) notFound();

  // Dates cross the server/client boundary as ISO strings.
  const deposit = JSON.parse(JSON.stringify(result.deposit)) as TicketDeposit;

  return (
    <>
      <div className="mx-auto mb-4 hidden max-w-2xl lg:block">
        <Link href="/app/deposit" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="size-4" /> All deposits
        </Link>
      </div>
      <DepositTicket initial={deposit} />
    </>
  );
}
