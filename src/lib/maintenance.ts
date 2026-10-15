import { getSettingInt, getSettingText, SETTING_KEYS } from "@/lib/settings";
import { getCurrentUser } from "@/lib/auth/customer";
import { jsonError } from "@/lib/api";
import type { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";

export async function isMaintenanceMode(): Promise<boolean> {
  return (await getSettingInt(SETTING_KEYS.maintenanceMode, 0)) === 1;
}

export async function getSupportContact(): Promise<string> {
  return (await getSettingText(SETTING_KEYS.supportContact, "")).trim();
}

/** Normalize support contact into a usable href (URL, mailto, or tel). */
export function supportContactHref(contact: string): string | null {
  const v = contact.trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  if (/^mailto:/i.test(v) || /^tel:/i.test(v)) return v;
  if (v.includes("@") && !v.includes(" ")) return `mailto:${v}`;
  if (/^\+?[\d\s()-]{7,}$/.test(v)) return `tel:${v.replace(/[\s()-]/g, "")}`;
  if (/^t\.me\//i.test(v) || /^telegram\.me\//i.test(v)) return `https://${v}`;
  if (/^@[\w]+$/.test(v)) return `https://t.me/${v.slice(1)}`;
  return v;
}

const MAINTENANCE_EXEMPT_PREFIXES = [
  "/banned",
  "/session-expired",
  "/admin",
  "/api/auth",
  "/api/admin",
  "/api/webhooks",
  "/api/cron",
  "/api/maintenance",
  "/uploads",
  "/pwa",
  "/offline.html",
  "/sw.js",
] as const;

/** Full-screen status routes — no site chrome / splash / install banner. */
export {
  SYSTEM_STATUS_PREFIXES,
  isSystemStatusPath,
} from "@/lib/system-status-paths";

import { isPublicProfilePath } from "@/lib/profile";

export function isMaintenanceExemptPath(pathname: string): boolean {
  if (!pathname) return false;
  if (isPublicProfilePath(pathname)) return true;
  return MAINTENANCE_EXEMPT_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}


/** Landing `/` (and legacy `/maintenance`) show the maintenance screen in-place. */
export function isMaintenanceLandingPath(pathname: string): boolean {
  return (
    !pathname ||
    pathname === "/" ||
    pathname === "/maintenance" ||
    pathname.startsWith("/maintenance/")
  );
}

/**
 * When maintenance is on, only ADMIN may establish a session.
 * Non-admins get a soft unavailable message — never advertise an admin bypass.
 */
export async function maintenanceLoginBlock(
  role: UserRole | string | null | undefined,
): Promise<Response | null> {
  if (!(await isMaintenanceMode())) return null;
  if (role === "ADMIN") return null;
  return jsonError(
    "MAINTENANCE",
    "The store is temporarily unavailable. Please try again later.",
    503,
  );
}

/**
 * Redirect non-admins off gated surfaces when maintenance is on.
 * Landing `/` is handled by MaintenanceGate (pinned banner) — do not redirect it.
 * Sends users through `/api/maintenance/enter` so the session is cleared and the
 * edge maintenance cookie is stamped — preventing / ↔ /app redirect loops.
 */
export async function assertNotMaintenance(pathname?: string): Promise<void> {
  if (pathname && isMaintenanceExemptPath(pathname)) return;
  if (pathname && isMaintenanceLandingPath(pathname)) return;
  if (!(await isMaintenanceMode())) return;
  const user = await getCurrentUser();
  if (user?.role === "ADMIN") return;
  redirect("/api/maintenance/enter");
}

/** API response when commerce mutations must not run during maintenance. */
export async function maintenanceApiBlock(): Promise<Response | null> {
  if (!(await isMaintenanceMode())) return null;
  const user = await getCurrentUser();
  if (user?.role === "ADMIN") return null;
  return jsonError(
    "MAINTENANCE",
    "Store is under maintenance. Please try again later.",
    503,
  );
}
