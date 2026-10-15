import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { MAINTENANCE_COOKIE } from "@/lib/maintenance-cookie";

import { isPublicProfilePath, isReservedProfileUsername } from "@/lib/profile";

const CUSTOMER_COOKIE = "drip_customer_session";

function extractSubdomain(host: string | null): string | null {
  if (!host) return null;
  const cleanHost = host.split(":")[0].trim().toLowerCase();

  // Exclude raw IPs
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(cleanHost) || cleanHost === "localhost") {
    return null;
  }

  // Local development support: e.g. "venom.localhost:3102"
  if (cleanHost.endsWith(".localhost")) {
    const sub = cleanHost.replace(/\.localhost$/, "");
    return sub && sub !== "www" ? sub : null;
  }

  // Production domains: e.g. "venom.dripclientofficial.dev"
  const parts = cleanHost.split(".");
  if (parts.length >= 3) {
    const sub = parts[0];
    if (sub && sub !== "www" && !isReservedProfileUsername(sub)) {
      return sub;
    }
  }

  return null;
}

function customerSecret() {
  const secret = process.env.CUSTOMER_SESSION_SECRET;
  if (!secret) return null;
  return new TextEncoder().encode(secret);
}

type CustomerPayload = { role?: string } | null;

async function verifyCustomer(
  request: NextRequest,
): Promise<CustomerPayload> {
  const token = request.cookies.get(CUSTOMER_COOKIE)?.value;
  const key = customerSecret();
  if (!token || !key) return null;
  try {
    const { payload } = await jwtVerify(token, key);
    return { role: typeof payload.role === "string" ? payload.role : undefined };
  } catch {
    return null;
  }
}

function safeNextPath(raw: string | null): string | null {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
}

function nextWithPath(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-drip-pathname", request.nextUrl.pathname);
  if (isPublicProfilePath(request.nextUrl.pathname)) {
    requestHeaders.set("x-drip-is-bio", "1");
  }
  const res = NextResponse.next({
    request: { headers: requestHeaders },
  });
  res.headers.set("x-drip-pathname", request.nextUrl.pathname);
  if (isPublicProfilePath(request.nextUrl.pathname)) {
    res.headers.set("x-drip-is-bio", "1");
  }
  return res;
}

function isMaintenanceFlag(request: NextRequest): boolean {
  return request.cookies.get(MAINTENANCE_COOKIE)?.value === "1";
}

function redirectToMaintenanceEnter(request: NextRequest, next?: string) {
  const url = request.nextUrl.clone();
  url.pathname = "/api/maintenance/enter";
  url.search = "";
  if (next) url.searchParams.set("next", next);
  return NextResponse.redirect(url);
}

function redirectToHub(request: NextRequest, customer: CustomerPayload) {
  const url = request.nextUrl.clone();
  const next = safeNextPath(url.searchParams.get("next"));
  url.search = "";
  url.pathname =
    next ?? (customer?.role === "ADMIN" ? "/admin" : "/app");
  return NextResponse.redirect(url);
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    request.nextUrl.hostname;
  const subdomain = extractSubdomain(host);

  // Subdomain routing: rewrite root path to `/[username]` for reseller personal hubs
  if (subdomain && !isReservedProfileUsername(subdomain)) {
    if (pathname === "/") {
      const url = request.nextUrl.clone();
      url.pathname = `/${subdomain}`;
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set("x-drip-subdomain", subdomain);
      requestHeaders.set("x-drip-pathname", `/${subdomain}`);
      requestHeaders.set("x-drip-is-bio", "1");
      const res = NextResponse.rewrite(url, {
        request: { headers: requestHeaders },
      });
      res.headers.set("x-drip-subdomain", subdomain);
      res.headers.set("x-drip-pathname", `/${subdomain}`);
      res.headers.set("x-drip-is-bio", "1");
      return res;
    }
  }

  // Public profile routes (e.g. `/[username]`): never redirect logged-in users or owners away
  if (isPublicProfilePath(pathname)) {
    return nextWithPath(request);
  }


  const customer = await verifyCustomer(request);
  const authMode = request.nextUrl.searchParams.get("auth");
  const forcingAuthDialog =
    authMode === "login" ||
    authMode === "register" ||
    authMode === "forgot";

  // Old admin login removed — send people through normal auth
  if (pathname === "/admin/login" || pathname.startsWith("/admin/login/")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.set("auth", "login");
    url.searchParams.set("next", "/admin");
    return NextResponse.redirect(url);
  }

  // Landing is guests-only — logged-in users go to their hub.
  // Exception: ?auth=login|register|forgot must stay on `/` so the dialog can open.
  // Exception: maintenance cookie + non-admin session → /api/maintenance/enter
  // (clears session, stays on `/`). Never bounce / ↔ /app.
  if (pathname === "/") {
    if (forcingAuthDialog) {
      return nextWithPath(request);
    }

    if (customer) {
      if (customer.role !== "ADMIN" && isMaintenanceFlag(request)) {
        return redirectToMaintenanceEnter(request);
      }
      return redirectToHub(request, customer);
    }

    return nextWithPath(request);
  }

  // System status screens — no auth required
  if (
    pathname === "/maintenance" ||
    pathname === "/banned" ||
    pathname === "/session-expired"
  ) {
    return nextWithPath(request);
  }

  if (pathname.startsWith("/admin")) {
    if (!customer) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      url.searchParams.set("auth", "login");
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    if (customer.role !== "ADMIN") {
      const url = request.nextUrl.clone();
      url.pathname = "/app";
      url.search = "";
      return NextResponse.redirect(url);
    }
    return nextWithPath(request);
  }

  if (pathname.startsWith("/app")) {
    if (!customer) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      url.searchParams.set("auth", "login");
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    if (customer.role !== "ADMIN" && isMaintenanceFlag(request)) {
      return redirectToMaintenanceEnter(request, "/app");
    }
    return nextWithPath(request);
  }

  return nextWithPath(request);
}

export const config = {
  matcher: [
    /*
     * Gate auth redirects + stamp x-drip-pathname for maintenance.
     * Skip static assets, Next internals, uploads, and the service worker.
     */
    "/((?!_next/static|_next/image|favicon.ico|sw\\.js|offline\\.html|uploads/|downloads/|pwa/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|xml|woff2?|apk)$).*)",
  ],
};
