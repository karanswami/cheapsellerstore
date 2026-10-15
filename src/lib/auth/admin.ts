import { getCurrentUser, type SafeUser } from "@/lib/auth/customer";

/** Admin panel access is role-based only (User.role === ADMIN). */
export async function isAdminAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser();
  return user?.role === "ADMIN";
}

export async function requireAdmin(): Promise<SafeUser> {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    throw new Error("UNAUTHORIZED");
  }
  return user;
}
