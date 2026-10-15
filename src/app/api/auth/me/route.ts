import { jsonError, jsonOk } from "@/lib/api";
import {
  CUSTOMER_COOKIE,
  clearCustomerSessionCookie,
  getCurrentUser,
  getSessionRoleFromToken,
  getSessionUserId,
  setCustomerSessionCookie,
} from "@/lib/auth/customer";
import { isMaintenanceMode } from "@/lib/maintenance";
import { getPagesEnabled } from "@/lib/pages-enabled";
import { prisma } from "@/lib/prisma";
import { getCustomerSidebarBadges } from "@/lib/sidebar-stats";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const pagesEnabled = await getPagesEnabled();
    const userId = await getSessionUserId();
    if (userId) {
      const raw = await prisma.user.findUnique({ where: { id: userId } });
      if (raw?.banned) {
        await clearCustomerSessionCookie();
        return jsonOk({
          user: null,
          reason: "banned" as const,
          pagesEnabled,
        });
      }
    }

    const user = await getCurrentUser();
    if (!user) {
      const jar = await cookies();
      if (jar.get(CUSTOMER_COOKIE)?.value) {
        await clearCustomerSessionCookie();
      }
      return jsonOk({ user: null, pagesEnabled });
    }

    if ((await isMaintenanceMode()) && user.role !== "ADMIN") {
      await clearCustomerSessionCookie();
      return jsonOk({
        user: null,
        reason: "maintenance" as const,
        pagesEnabled,
      });
    }

    const jar = await cookies();
    const token = jar.get(CUSTOMER_COOKIE)?.value;
    if (token) {
      const claim = await getSessionRoleFromToken(token);
      if (claim !== user.role) {
        await setCustomerSessionCookie(user.id, user.role);
      }
    }

    const sidebarBadges = await getCustomerSidebarBadges(user.id);
    return jsonOk({ user, pagesEnabled, sidebarBadges });
  } catch (err) {
    console.error("[auth/me]", err);
    return jsonError("INTERNAL", "Session check failed.", 503);
  }
}
