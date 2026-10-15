import { AdminShell } from "@/components/admin/admin-shell";
import {
  clearCustomerSessionCookie,
  getCurrentUser,
} from "@/lib/auth/customer";
import { isMaintenanceMode } from "@/lib/maintenance";
import { getAdminSidebarStats } from "@/lib/sidebar-stats";
import { redirect } from "next/navigation";

export default async function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) {
    await clearCustomerSessionCookie();
    redirect("/?auth=login&next=/admin");
  }
  if (user.role !== "ADMIN") {
    redirect("/app");
  }

  const [stats, maintenanceMode] = await Promise.all([
    getAdminSidebarStats(),
    isMaintenanceMode(),
  ]);

  return (
    <AdminShell
      user={user}
      stats={stats}
      maintenanceMode={maintenanceMode}
    >
      {children}
    </AdminShell>
  );
}
