import { getEnv, sessionCookieSecure } from "@/lib/env";
import {
  CUSTOMER_COOKIE,
  createCustomerSessionToken,
  setCustomerSessionCookie,
} from "@/lib/auth/customer";
import type { UserRole } from "@prisma/client";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getSecurityConfig } from "@/lib/security-config";

export const IMPERSONATION_COOKIE = "drip_admin_impersonation";

function secretKey() {
  return new TextEncoder().encode(getEnv().customerSessionSecret);
}

export type ImpersonationPayload = {
  adminId: string;
  adminRole: UserRole;
  targetId: string;
  targetUsername: string;
  /** Restore-token issue time (seconds), used for session revocation checks. */
  issuedAt?: number;
};

export async function startImpersonation(input: {
  adminId: string;
  adminRole: UserRole;
  targetId: string;
  targetRole: UserRole;
  targetUsername: string;
}) {
  const { impersonationHours } = await getSecurityConfig();
  const restoreToken = await new SignJWT({
    adminId: input.adminId,
    adminRole: input.adminRole,
    targetId: input.targetId,
    targetUsername: input.targetUsername,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${impersonationHours}h`)
    .sign(secretKey());

  const jar = await cookies();
  jar.set(IMPERSONATION_COOKIE, restoreToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: sessionCookieSecure(),
    path: "/",
    maxAge: impersonationHours * 60 * 60,
  });

  await setCustomerSessionCookie(input.targetId, input.targetRole);
}

export async function getImpersonationState(): Promise<ImpersonationPayload | null> {
  const jar = await cookies();
  const token = jar.get(IMPERSONATION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    const adminId = payload.adminId;
    const adminRole = payload.adminRole;
    const targetId = payload.targetId;
    const targetUsername = payload.targetUsername;
    if (
      typeof adminId !== "string" ||
      typeof targetId !== "string" ||
      typeof targetUsername !== "string" ||
      typeof adminRole !== "string"
    ) {
      return null;
    }
    return {
      adminId,
      adminRole: adminRole as UserRole,
      targetId,
      targetUsername,
      issuedAt: typeof payload.iat === "number" ? payload.iat : undefined,
    };
  } catch {
    return null;
  }
}

export async function exitImpersonation(): Promise<{ ok: boolean }> {
  const state = await getImpersonationState();
  const jar = await cookies();
  jar.delete(IMPERSONATION_COOKIE);
  if (!state) {
    jar.delete(CUSTOMER_COOKIE);
    return { ok: false };
  }
  // Re-check the admin NOW: a demoted/banned/revoked admin must not get a session back from an old cookie.
  const admin = await prisma.user.findUnique({ where: { id: state.adminId } });
  const issuedAtMs = (state.issuedAt ?? 0) * 1000;
  if (
    !admin ||
    admin.banned ||
    admin.role !== "ADMIN" ||
    (admin.sessionsValidAfter && issuedAtMs < admin.sessionsValidAfter.getTime())
  ) {
    jar.delete(CUSTOMER_COOKIE);
    return { ok: false };
  }
  const token = await createCustomerSessionToken(admin.id, admin.role);
  jar.set(CUSTOMER_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: sessionCookieSecure(),
    path: "/",
    maxAge: 14 * 24 * 60 * 60,
  });
  return { ok: true };
}
