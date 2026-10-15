import { getEnv, sessionCookieSecure } from "@/lib/env";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";

export const TWO_FA_COOKIE = "drip_2fa_challenge";
const CHALLENGE_TTL_MIN = 5;

function secretKey() {
  return new TextEncoder().encode(getEnv().customerSessionSecret);
}

export async function createTwoFactorChallengeToken(userId: string) {
  return new SignJWT({ sub: userId, purpose: "2fa_pending" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${CHALLENGE_TTL_MIN}m`)
    .setJti(randomBytes(16).toString("hex"))
    .sign(secretKey());
}

export async function setTwoFactorChallengeCookie(userId: string) {
  const token = await createTwoFactorChallengeToken(userId);
  const jar = await cookies();
  jar.set(TWO_FA_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: sessionCookieSecure(),
    path: "/",
    maxAge: CHALLENGE_TTL_MIN * 60,
  });
  return token;
}

export async function clearTwoFactorChallengeCookie() {
  const jar = await cookies();
  jar.delete(TWO_FA_COOKIE);
}

export async function readTwoFactorChallengeUserId(
  tokenOverride?: string | null,
): Promise<string | null> {
  const jar = await cookies();
  const token = tokenOverride || jar.get(TWO_FA_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (payload.purpose !== "2fa_pending") return null;
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}
