import type { UserRole } from "@/lib/roles";
import { isWholesaleRole } from "@/lib/roles";

/**
 * Path segments that must never be claimable as public profile usernames
 * (would collide with app routes).
 */
export const RESERVED_PROFILE_USERNAMES = new Set([
  "admin",
  "api",
  "app",
  "auth",
  "bio",
  "billing",
  "cart",
  "cdn",
  "checkout",
  "cron",
  "deposit",
  "deposits",
  "dev",
  "developers",
  "docs",
  "download",
  "downloads",
  "faq",
  "faqs",
  "help",
  "history",
  "keys",
  "leaderboard",
  "login",
  "logout",
  "mail",
  "media",
  "official",
  "order",
  "orders",
  "pages",
  "premium",
  "profile",
  "referral",
  "register",
  "robots.txt",
  "root",
  "seller",
  "sitemap.xml",
  "ssl",
  "static",
  "status",
  "store",
  "support",
  "uploads",
  "users",
  "webhooks",
  "www",
  "_next",
  "favicon.ico",
  "become-seller",
  "become-reseller",
]);

/** Normalize a public profile username from a URL or input. */
export function normalizeProfileUsername(raw: string): string {
  return raw.trim().replace(/^@+/, "").toLowerCase();
}

export function isReservedProfileUsername(raw: string): boolean {
  const username = normalizeProfileUsername(raw);
  return !username || RESERVED_PROFILE_USERNAMES.has(username);
}

/** Public share path: `/{username}` (no login required). */
export function buildPublicProfilePath(username: string): string {
  return `/${encodeURIComponent(normalizeProfileUsername(username))}`;
}

export function buildPublicProfileUrl(origin: string, username: string): string {
  const base = origin.replace(/\/$/, "");
  return `${base}${buildPublicProfilePath(username)}`;
}

export function roleLabel(role: UserRole | string): string {
  switch (role) {
    case "ADMIN":
      return "Admin";
    case "SELLER":
      return "Seller";
    case "RESELLER":
      return "Reseller";
    default:
      return "Customer";
  }
}

export function roleDescription(role: UserRole | string): string {
  switch (role) {
    case "ADMIN":
      return "Store administrator";
    case "SELLER":
      return "Verified seller account";
    case "RESELLER":
      return "Seller team reseller";
    default:
      return "Standard customer account";
  }
}

export function extractSubdomainFromHost(host?: string | null): string | null {
  if (!host) {
    if (typeof window !== "undefined") {
      host = window.location.hostname;
    }
  }
  if (!host) return null;
  const cleanHost = host.split(":")[0].trim().toLowerCase();
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(cleanHost) || cleanHost === "localhost") {
    return null;
  }
  if (cleanHost.endsWith(".localhost")) {
    const sub = cleanHost.replace(/\.localhost$/, "");
    return sub && sub !== "www" && !isReservedProfileUsername(sub) ? sub : null;
  }
  const parts = cleanHost.split(".");
  if (parts.length >= 3) {
    const sub = parts[0];
    if (sub && sub !== "www" && !isReservedProfileUsername(sub)) {
      return sub;
    }
  }
  return null;
}

export function isSubdomainHost(host?: string | null): boolean {
  return Boolean(extractSubdomainFromHost(host));
}

export function isPublicProfilePath(pathname: string | null | undefined): boolean {
  if (!pathname || pathname === "/") return false;
  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/app") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/_") ||
    pathname.startsWith("/pages") ||
    pathname.startsWith("/faq") ||
    pathname.startsWith("/developers") ||
    pathname.startsWith("/docs") ||
    pathname.startsWith("/checkout") ||
    pathname.startsWith("/order") ||
    pathname.startsWith("/downloads") ||
    pathname.startsWith("/maintenance") ||
    pathname.startsWith("/banned") ||
    pathname.startsWith("/session-expired")
  ) {
    return false;
  }
  const segment = pathname.replace(/^\//, "").split("/")[0].toLowerCase();
  return Boolean(segment && !isReservedProfileUsername(segment));
}

export function isStandaloneBioRoute(pathname?: string | null, host?: string | null): boolean {
  if (isPublicProfilePath(pathname)) return true;
  if (isSubdomainHost(host)) return true;
  return false;
}

export function isSellerRole(role: UserRole | string): boolean {
  // Profile badge helper: Seller, Reseller, or Admin (not retail USER).
  return isWholesaleRole(role) || role === "ADMIN";
}


