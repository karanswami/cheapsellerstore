/** Full-screen status routes — no site chrome / splash / install banner. */
export const SYSTEM_STATUS_PREFIXES = [
  "/maintenance",
  "/banned",
  "/session-expired",
] as const;

export function isSystemStatusPath(pathname: string): boolean {
  return SYSTEM_STATUS_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}
