import { HubPageSkeleton } from "@/components/app/hub/hub-page-skeleton";

export default function LeaderboardLoading() {
  return <HubPageSkeleton rows={5} showToolbar={false} showChips={false} />;
}
