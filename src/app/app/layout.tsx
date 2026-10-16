import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getCurrentUser } from "@/lib/auth/customer";
import { formatMoney } from "@/lib/currencies";
import { roleLabel } from "@/lib/roles";
import { getSiteConfig } from "@/lib/site-config";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [user, config] = await Promise.all([getCurrentUser(), getSiteConfig()]);
  if (!user) redirect("/login?next=/app");

  return (
    <AppShell
      siteName={config.siteName}
      user={{
        name: user.name,
        username: user.username,
        role: user.role,
        roleLabel: roleLabel(user.role),
        balance: formatMoney(user.walletBalance, user.currency),
      }}
    >
      {children}
    </AppShell>
  );
}
