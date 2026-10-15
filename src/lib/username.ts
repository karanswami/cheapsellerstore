/**
 * Mask a username for public display: `username` → `user****me`.
 * Own-account / admin UIs should keep the full handle.
 */
export function maskUsername(username: string): string {
  const u = username.trim();
  if (u.length === 0) return "****";
  if (u.length <= 2) return "*".repeat(u.length);
  if (u.length <= 4) return `${u[0]}****${u[u.length - 1]}`;
  if (u.length <= 6) return `${u.slice(0, 2)}****${u.slice(-1)}`;
  return `${u.slice(0, 4)}****${u.slice(-2)}`;
}
