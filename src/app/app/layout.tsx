import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getCurrentUser } from "@/lib/auth/customer";
import { formatMoney } from "@/lib/currencies";
import { sellerHasSellerPanel } from "@/lib/resellers";
import { roleLabel } from "@/lib/roles";
import { getCustomerSidebarBadges } from "@/lib/sidebar-stats";
import { getSiteConfig } from "@/lib/site-config";
import { countAvailableSpins } from "@/lib/spin";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [user, config] = await Promise.all([getCurrentUser(), getSiteConfig()]);
  if (!user) redirect("/login?next=/app");

  // Nav badges are nice-to-have: never block the shell on them.
  const [spins, badges] = await Promise.all([
    countAvailableSpins(user.id).catch(() => 0),
    getCustomerSidebarBadges(user.id).catch(() => null),
  ]);

  return (
    <AppShell
      siteName={config.siteName}
      user={{
        name: user.name,
        username: user.username,
        avatarUrl: user.avatarUrl,
        role: user.role,
        roleLabel: roleLabel(user.role),
        balance: formatMoney(user.walletBalance, user.currency),
        hasSellerPanel: sellerHasSellerPanel(user),
      }}
      badges={{
        spins,
        pendingDeposits: badges?.pendingDeposits ?? 0,
        activeReports: badges?.activeReports ?? 0,
      }}
    >
      {children}
    </AppShell>
  );
}
