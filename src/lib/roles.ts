import type { UserRole } from "@prisma/client";

export type { UserRole };

export const USER_ROLES = ["USER", "SELLER", "RESELLER", "ADMIN"] as const;

export function isUserRole(value: unknown): value is UserRole {
  return (
    typeof value === "string" &&
    (USER_ROLES as readonly string[]).includes(value)
  );
}

/** Map pre-migrate JWT / stored role tokens to current enums. */
export function normalizeRoleClaim(value: unknown): UserRole | null {
  if (value === "SUB_SELLER") return "RESELLER";
  // Legacy: old RESELLER meant today's SELLER (migrate script also rewrites DB).
  // After migrate, JWT may still say RESELLER for a user who is now SELLER —
  // callers should prefer DB role; this only validates known tokens.
  if (isUserRole(value)) return value;
  return null;
}

export function roleLabel(role: UserRole): string {
  switch (role) {
    case "ADMIN":
      return "Administrator";
    case "SELLER":
      return "Seller";
    case "RESELLER":
      return "Reseller";
    default:
      return "Customer";
  }
}

export function roleBadge(role: UserRole): string {
  switch (role) {
    case "ADMIN":
      return "Admin";
    case "SELLER":
      return "Seller";
    case "RESELLER":
      return "Reseller";
    default:
      return "User";
  }
}

export function consoleTitle(role: UserRole): string {
  switch (role) {
    case "ADMIN":
      return "Admin Console";
    case "SELLER":
      return "Seller Console";
    case "RESELLER":
      return "Reseller Console";
    default:
      return "Customer Console";
  }
}

export function consoleSubtitle(role: UserRole): string {
  switch (role) {
    case "ADMIN":
      return "Full store operations and inventory.";
    case "SELLER":
      return "Wholesale workspace for seller accounts.";
    case "RESELLER":
      return "Shop, keys, wallet and account in one place.";
    default:
      return "Shop, keys, wallet and account in one place.";
  }
}

/** Short access line under the role pill in the console hero card. */
export function roleAccessLine(role: UserRole): string {
  switch (role) {
    case "ADMIN":
      return "Full Access";
    case "SELLER":
      return "Wholesale Access";
    case "RESELLER":
      return "Reseller Access";
    default:
      return "Store Access";
  }
}

export function homePathForRole(role: UserRole): string {
  return role === "ADMIN" ? "/admin" : "/app";
}

/** Seller + Reseller share wholesale catalog / deposit tier. */
export function isWholesaleRole(role: UserRole | string): boolean {
  return role === "SELLER" || role === "RESELLER";
}

/** Main Seller account (can hold reseller-management caps). */
export function isSellerRole(role: UserRole | string): boolean {
  return role === "SELLER";
}

/**
 * Whether the user may open self-serve deposit rails.
 * Resellers are opt-in only (seller-funded by default); other roles default on.
 * Admin toggles `User.depositsEnabled` per account.
 */
export function userCanSelfDeposit(user: {
  role: UserRole | string;
  depositsEnabled?: boolean | null;
}): boolean {
  if (user.role === "RESELLER") {
    return user.depositsEnabled === true;
  }
  return user.depositsEnabled !== false;
}
