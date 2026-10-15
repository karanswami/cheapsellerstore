import { getEnv, sessionCookieSecure } from "@/lib/env";
import {
  CUSTOMER_COOKIE,
  createCustomerSessionToken,
  setCustomerSessionCookie,
} from "@/lib/auth/customer";
import type { UserRole } from "@prisma/client";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export const IMPERSONATION_COOKIE = "drip_admin_impersonation";

function secretKey() {
  return new TextEncoder().encode(getEnv().customerSessionSecret);
}

export type ImpersonationPayload = {
  adminId: string;
  adminRole: UserRole;
  targetId: string;
  targetUsername: string;
};

export async function startImpersonation(input: {
  adminId: string;
  adminRole: UserRole;
  targetId: string;
  targetRole: UserRole;
  targetUsername: string;
}) {
  const restoreToken = await new SignJWT({
    adminId: input.adminId,
    adminRole: input.adminRole,
    targetId: input.targetId,
    targetUsername: input.targetUsername,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(secretKey());

  const jar = await cookies();
  jar.set(IMPERSONATION_COOKIE, restoreToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: sessionCookieSecure(),
    path: "/",
    maxAge: 8 * 60 * 60,
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
  const token = await createCustomerSessionToken(state.adminId, state.adminRole);
  jar.set(CUSTOMER_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: sessionCookieSecure(),
    path: "/",
    maxAge: 14 * 24 * 60 * 60,
  });
  return { ok: true };
}
