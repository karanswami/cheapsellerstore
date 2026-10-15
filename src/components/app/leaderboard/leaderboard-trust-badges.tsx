import { Badge } from "@/components/ui/badge";
import { PremiumBadge } from "@/components/ui/premium-badge";
import { cn } from "@/lib/utils";
import { BadgeCheck, Sparkles } from "lucide-react";

type LeaderboardTrustBadgesProps = {
  isPremium?: boolean;
  emailVerified?: boolean;
  isYou?: boolean;
  className?: string;
};

export function LeaderboardTrustBadges({
  isPremium,
  emailVerified,
  isYou,
  className,
}: LeaderboardTrustBadgesProps) {
  if (!isPremium && !emailVerified && !isYou) return null;

  return (
    <span className={cn("inline-flex flex-wrap items-center gap-1", className)}>
      {isYou ? (
        <Badge
          variant="secondary"
          className="h-5 border border-primary/40 bg-primary/15 px-1.5 text-[10px] font-semibold text-primary"
        >
          <Sparkles className="size-2.5" aria-hidden />
          You
        </Badge>
      ) : null}
      {isPremium ? <PremiumBadge size="xs" animated={false} /> : null}
      {emailVerified ? (
        <Badge
          variant="secondary"
          className="h-5 gap-0.5 border border-sky-400/35 bg-sky-500/12 px-1.5 text-[10px] font-semibold text-sky-300"
        >
          <BadgeCheck className="size-2.5" aria-hidden />
          Verified
        </Badge>
      ) : null}
    </span>
  );
}
