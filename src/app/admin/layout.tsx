import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { getCurrentUser } from "@/lib/auth/customer";
import { getAdminSidebarStats } from "@/lib/sidebar-stats";
import { getSiteConfig } from "@/lib/site-config";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const [user, config] = await Promise.all([getCurrentUser(), getSiteConfig()]);
  if (!user) redirect("/login?next=/admin");
  if (user.role !== "ADMIN") redirect("/app");
  const stats = await getAdminSidebarStats().catch(() => null);

  return (
    <AdminShell siteName={config.siteName} user={{ name: user.name, username: user.username }} initialBadges={stats?.adminBadges ?? null}>
      {children}
    </AdminShell>
  );
}
