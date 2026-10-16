import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/app-ui";
import { getCurrentUser } from "@/lib/auth/customer";
import { getDepositStatusForUser } from "@/lib/deposits";
import { DepositTicket, type TicketDeposit } from "./deposit-ticket";

export const dynamic = "force-dynamic";

export default async function DepositTicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = (await getCurrentUser())!;
  const result = await getDepositStatusForUser(id, user.id).catch(() => null);
  if (!result || !result.ok) notFound();

  // Dates cross the server/client boundary as ISO strings.
  const d = result.deposit;
  const deposit = JSON.parse(JSON.stringify(d)) as TicketDeposit;

  return (
    <>
      <Link href="/app/deposit" className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> All deposits
      </Link>
      <PageHeader title="Deposit ticket" subtitle={`#${id.slice(-8).toUpperCase()}`} />
      <DepositTicket initial={deposit} />
    </>
  );
}
