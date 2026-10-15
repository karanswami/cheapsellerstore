import { MaintenanceView } from "@/components/layout/maintenance-view";
import {
  assertNotMaintenance,
  isMaintenanceExemptPath,
  isMaintenanceLandingPath,
  isMaintenanceMode,
} from "@/lib/maintenance";
import { getSupportChannels, type SupportChannels } from "@/lib/support-channels";
import { getCurrentUser } from "@/lib/auth/customer";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

/**
 * Server gate: when maintenance_mode is on, non-admins only see landing `/`
 * with a pinned maintenance banner. Other routes redirect via
 * `/api/maintenance/enter` (clears session + stamps edge cookie).
 * Admins bypass entirely. Sign-in stays the regular header AuthDialog —
 * only ADMIN sessions succeed (API-enforced, no public admin CTA).
 */
export async function MaintenanceGate({
  children,
  banner,
}: {
  children: React.ReactNode;
  /** Optional chrome (e.g. install banner) — hidden while maintenance notice is active. */
  banner?: React.ReactNode;
}) {
  const h = await headers();
  const pathname = h.get("x-drip-pathname") ?? "";

  if (pathname && isMaintenanceExemptPath(pathname)) {
    return (
      <>
        {children}
        {banner}
      </>
    );
  }

  if (!(await isMaintenanceMode())) {
    return (
      <>
        {children}
        {banner}
      </>
    );
  }

  const user = await getCurrentUser();
  if (user?.role === "ADMIN") {
    return (
      <>
        {children}
        {banner}
      </>
    );
  }

  if (isMaintenanceLandingPath(pathname)) {
    // Force non-admin sessions through enter (clear cookie) before showing landing.
    if (user) {
      redirect("/api/maintenance/enter");
    }
    const supportChannels = await getSupportChannels();
    return (
      <>
        <MaintenanceView supportChannels={supportChannels} />
        {children}
      </>
    );
  }

  await assertNotMaintenance(pathname || undefined);
  return (
    <>
      {children}
      {banner}
    </>
  );
}
