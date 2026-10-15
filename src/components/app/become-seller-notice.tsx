import { HubPageShell } from "@/components/app/hub/hub-page-shell";
import { HubPanelCard } from "@/components/app/hub/hub-list-row";
import { Button } from "@/components/ui/button";
import Link from "next/link";

type Props =
  | { reason: "disabled" }
  | { reason: "pending" }
  | { reason: "min-balance"; minBalanceUsd: number };

export function BecomeSellerNotice(props: Props) {
  let title: string;
  let body: string;
  let action = { href: "/app/profile", label: "Back to profile" };

  switch (props.reason) {
    case "disabled":
      title = "Applications are closed";
      body =
        "Seller applications are not being accepted right now. Please check back later.";
      break;
    case "pending":
      title = "Application under review";
      body =
        "You already have a pending application. We'll notify you once it has been reviewed.";
      break;
    case "min-balance":
      title = "Add funds to apply";
      body = `Your wallet needs at least $${props.minBalanceUsd} before you can apply to become a seller.`;
      action = { href: "/app/deposit", label: "Add funds" };
      break;
  }

  return (
    <HubPageShell maxWidth="md">
      <HubPanelCard>
        <div className="space-y-3 p-6 text-center">
          <h1 className="text-lg font-semibold">{title}</h1>
          <p className="text-sm text-muted-foreground">{body}</p>
          <Button asChild>
            <Link href={action.href}>{action.label}</Link>
          </Button>
        </div>
      </HubPanelCard>
    </HubPageShell>
  );
}
