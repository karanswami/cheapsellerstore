import { Lock, Trophy } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/app-ui";
import { Badge } from "@/components/ui/badge";
import { getCurrentUser } from "@/lib/auth/customer";
import { formatMoney } from "@/lib/currencies";
import { isWholesaleRole } from "@/lib/roles";
import { getSellerLeaderboard } from "@/lib/seller-leaderboard";
import { UserAvatar } from "@/components/user-avatar";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SellerLeaderboardPage() {
  const user = (await getCurrentUser())!;
  if (!isWholesaleRole(user.role) && user.role !== "ADMIN") {
    return (
      <>
        <PageHeader title="Seller board" />
        <EmptyState icon={Lock} title="Sellers only" hint="This board is private to seller and reseller accounts." />
      </>
    );
  }
  const rows = await getSellerLeaderboard(50, user.id).catch(() => []);
  const medal = ["text-warning", "text-slate-300", "text-orange-400"];

  return (
    <>
      <PageHeader title="Seller board" subtitle="Private seller rankings by referral earnings." />
      {rows.length === 0 ? (
        <EmptyState icon={Trophy} title="No data yet" />
      ) : (
        <ul className="divide-y rounded-xl border bg-card">
          {rows.map((s, i) => (
            <li key={s.id} className={cn("flex items-center gap-3 p-3.5", s.id === user.id && "bg-primary/10")}>
              <span className={cn("w-8 text-center font-display text-lg font-bold", medal[i] ?? "text-muted-foreground")}>{i + 1}</span>
              <UserAvatar src={s.avatarUrl} seed={s.username ?? s.id} className="size-10" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {s.emojiStatus ? `${s.emojiStatus} ` : ""}
                  {s.username} {s.id === user.id ? <span className="text-xs text-primary">(you)</span> : null}
                </p>
                <p className="text-xs text-muted-foreground">
                  <Badge variant="muted" className="mr-1.5">{s.role === "SELLER" ? "Seller" : "Reseller"}</Badge>
                  {s.referrals} referrals · {formatMoney(s.sales)} sales
                </p>
              </div>
              <span className="text-sm font-semibold text-success">{formatMoney(s.earnings)}</span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
