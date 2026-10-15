import {
  CUSTOMER_COOKIE,
  getCurrentUser,
} from "@/lib/auth/customer";
import { sessionCookieSecure } from "@/lib/env";
import { isMaintenanceMode } from "@/lib/maintenance";
import {
  MAINTENANCE_COOKIE,
  maintenanceCookieOptions,
} from "@/lib/maintenance-cookie";
import { NextResponse } from "next/server";

function safeNextPath(raw: string | null): string | null {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return null;
  if (raw.startsWith("/api/")) return null;
  return raw;
}

/**
 * Enter maintenance landing: clear non-admin session, stamp edge cookie, go to `/`.
 * Also clears a stale maintenance cookie when the window has ended.
 * Used by the gate + proxy so we never self-fetch from edge (avoids hangs + loops).
 */
export async function GET(request: Request) {
  const reqUrl = new URL(request.url);
  const next = safeNextPath(reqUrl.searchParams.get("next"));
  const on = await isMaintenanceMode();

  if (!on) {
    const user = await getCurrentUser();
    const destPath =
      next ||
      (user ? (user.role === "ADMIN" ? "/admin" : "/app") : "/");
    const res = NextResponse.redirect(new URL(destPath, request.url));
    res.cookies.set(MAINTENANCE_COOKIE, "", maintenanceCookieOptions(false));
    return res;
  }

  const res = NextResponse.redirect(new URL("/", request.url));
  res.cookies.set(MAINTENANCE_COOKIE, "1", maintenanceCookieOptions(true));

  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    res.cookies.set(CUSTOMER_COOKIE, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: sessionCookieSecure(),
      path: "/",
      maxAge: 0,
    });
  }

  return res;
}
