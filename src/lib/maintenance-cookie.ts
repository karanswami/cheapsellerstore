/** Edge-safe maintenance cookie helpers (no Prisma / Node APIs). */

export const MAINTENANCE_COOKIE = "drip_maintenance";

export function maintenanceCookieSecure(): boolean {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "").startsWith("https://");
}

export function maintenanceCookieOptions(on: boolean) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: maintenanceCookieSecure(),
    path: "/",
    maxAge: on ? 60 * 60 : 0,
  };
}
