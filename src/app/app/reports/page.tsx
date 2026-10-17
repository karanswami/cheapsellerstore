import { getCurrentUser } from "@/lib/auth/customer";
import { getUserIssueReport, getUserIssueReportCounts, listUserIssueReports } from "@/lib/issue-reports";
import { ReportsClient } from "./reports-client";

export const dynamic = "force-dynamic";

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ id?: string; new?: string; target?: string }> }) {
  const user = (await getCurrentUser())!;
  const { id, new: newKind, target } = await searchParams;
  const [first, counts, focus] = await Promise.all([
    listUserIssueReports(user.id, { limit: 15 }).catch(() => ({
      reports: [],
      page: 1,
      limit: 15,
      total: 0,
      hasMore: false,
    })),
    getUserIssueReportCounts(user.id).catch(() => ({ total: 0, open: 0, done: 0 })),
    // Notifications deep-link straight into a ticket.
    id && /^[a-f0-9]{24}$/i.test(id) ? getUserIssueReport(user.id, id).catch(() => null) : null,
  ]);
  const kind = newKind === "deposit" ? "DEPOSIT" : newKind === "key" ? "KEY" : newKind === "general" ? "GENERAL" : null;
  const compose = kind ? { kind, target: target && /^[a-f0-9]{24}$/i.test(target) ? target : undefined } as const : null;
  return <ReportsClient initial={first} counts={counts} focus={focus} compose={compose} />;
}
