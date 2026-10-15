import {
  getGoogleClientId,
  getGoogleClientSecret,
  isGoogleAuthConfigured as isGoogleAuthConfiguredFromConfig,
} from "@/lib/auth-config";
import { getEnv } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { normalizeRoleClaim } from "@/lib/roles";
import { ensureReferralCode } from "@/lib/referral-code";
import {
  normalizeReferralCode,
  resolveReferrerByCode,
} from "@/lib/referrals";
import type { User, UserRole } from "@prisma/client";
import { SignJWT, jwtVerify } from "jose";
import { createHash, randomBytes } from "node:crypto";
import { notifyTelegram } from "@/lib/telegram-notify";

/** Capacitor `appendUserAgent` marker — present in the APK WebView only. */
export const NATIVE_APP_UA_MARKER = "DripNativeApp";
/** Custom scheme that returns OAuth results from Chrome Custom Tabs → APK. */
export const NATIVE_OAUTH_SCHEME = "dripclient";

const STATE_TTL = "10m";
const HANDOFF_TTL = "2m";

export type GoogleProfile = {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string;
  picture: string | null;
};

export type GoogleOAuthState = {
  ok: true;
  native: boolean;
  next: string | null;
  referralCode: string | null;
};

export type NativeAuthHandoff = {
  userId: string;
  role: UserRole;
  needs2fa: boolean;
  next: string | null;
};

function secretKey() {
  return new TextEncoder().encode(getEnv().customerSessionSecret);
}

function safeNextPath(value: unknown): string | null {
  return typeof value === "string" &&
    value.startsWith("/") &&
    !value.startsWith("//")
    ? value
    : null;
}

async function requireGoogleConfig() {
  const [clientId, clientSecret] = await Promise.all([
    getGoogleClientId(),
    getGoogleClientSecret(),
  ]);
  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_NOT_CONFIGURED");
  }
  return { clientId, clientSecret };
}

export async function isGoogleAuthConfigured() {
  return isGoogleAuthConfiguredFromConfig();
}

/** True when the request came from the Capacitor WebView (not Chrome Custom Tabs). */
export function isNativeAppUserAgent(request: Request): boolean {
  const ua = request.headers.get("user-agent") ?? "";
  return ua.includes(NATIVE_APP_UA_MARKER);
}

export function googleRedirectUri() {
  const base = getEnv().appUrl.replace(/\/$/, "");
  return `${base}/api/auth/google/callback`;
}

export async function googleAuthUrl(state: string) {
  const { clientId } = await requireGoogleConfig();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: googleRedirectUri(),
    response_type: "code",
    scope: "openid email profile",
    state,
    access_type: "online",
    prompt: "select_account",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Signed OAuth `state` (no cookie). Survives Custom Tabs because the callback
 * validates the JWT itself — Chrome never sees the WebView cookie jar.
 */
export async function createGoogleOAuthState(opts: {
  native: boolean;
  next?: string | null;
  referralCode?: string | null;
}): Promise<string> {
  const next = safeNextPath(opts.next);
  const referralCode = opts.referralCode?.trim() || null;
  return new SignJWT({
    purpose: "google_oauth",
    native: opts.native,
    ...(next ? { next } : {}),
    ...(referralCode ? { ref: referralCode } : {}),
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(STATE_TTL)
    .setJti(randomBytes(16).toString("hex"))
    .sign(secretKey());
}

export async function consumeGoogleOAuthState(
  incoming: string | null,
): Promise<GoogleOAuthState | { ok: false }> {
  if (!incoming) return { ok: false };
  try {
    const { payload } = await jwtVerify(incoming, secretKey());
    if (payload.purpose !== "google_oauth") return { ok: false };
    const ref = typeof payload.ref === "string" ? payload.ref : null;
    return {
      ok: true,
      native: payload.native === true,
      next: safeNextPath(payload.next),
      referralCode: ref,
    };
  } catch {
    return { ok: false };
  }
}

/** One-shot bridge token: Custom Tabs → `dripclient://oauth` → WebView session. */
export async function createNativeAuthHandoff(opts: {
  userId: string;
  role: UserRole;
  needs2fa: boolean;
  next?: string | null;
}): Promise<string> {
  const next = safeNextPath(opts.next);
  return new SignJWT({
    purpose: "native_auth_handoff",
    role: opts.role,
    needs2fa: opts.needs2fa,
    ...(next ? { next } : {}),
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(opts.userId)
    .setIssuedAt()
    .setExpirationTime(HANDOFF_TTL)
    .setJti(randomBytes(16).toString("hex"))
    .sign(secretKey());
}

export async function consumeNativeAuthHandoff(
  token: string | null,
): Promise<NativeAuthHandoff | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (payload.purpose !== "native_auth_handoff") return null;
    const userId = typeof payload.sub === "string" ? payload.sub : null;
    const role = normalizeRoleClaim(payload.role);
    if (!userId || !role) return null;
    return {
      userId,
      role,
      needs2fa: payload.needs2fa === true,
      next: safeNextPath(payload.next),
    };
  } catch {
    return null;
  }
}

export function nativeOAuthSuccessUrl(token: string) {
  return `${NATIVE_OAUTH_SCHEME}://oauth?token=${encodeURIComponent(token)}`;
}

export function nativeOAuthErrorUrl(code: string) {
  return `${NATIVE_OAUTH_SCHEME}://oauth?error=${encodeURIComponent(code)}`;
}

/**
 * Custom Tabs often ignore bare `Location: dripclient://…` redirects.
 * Return a tiny HTML bridge with meta + JS + manual link fallback.
 */
export function nativeOAuthBridgeResponse(targetUrl: string): Response {
  const safeHref = targetUrl
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
  const safeJs = JSON.stringify(targetUrl);
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta http-equiv="refresh" content="0;url=${safeHref}"/>
<title>Returning to DRIP…</title>
<style>
body{margin:0;min-height:100dvh;display:grid;place-items:center;background:#0c0c0e;color:#f4f4f5;
font-family:system-ui,sans-serif;padding:24px;text-align:center}
a{color:#e84fff;font-weight:600}
p{opacity:.75;font-size:14px;line-height:1.5;max-width:28rem}
</style>
<script>location.replace(${safeJs});</script>
</head>
<body>
<p>Opening the app…</p>
<p><a href="${safeHref}">Tap here if nothing happens</a></p>
</body>
</html>`;
  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

type TokenResponse = {
  access_token?: string;
  id_token?: string;
  error?: string;
};

export async function exchangeGoogleCode(code: string): Promise<TokenResponse> {
  const { clientId, clientSecret } = await requireGoogleConfig();
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: googleRedirectUri(),
      grant_type: "authorization_code",
    }),
  });
  return (await res.json()) as TokenResponse;
}

type GoogleUserInfo = {
  sub?: string;
  email?: string;
  email_verified?: boolean | string;
  name?: string;
  picture?: string;
  error?: { message?: string };
};

/** Fetch verified Google profile via userinfo (requires verified email). */
export async function fetchGoogleProfile(
  accessToken: string,
): Promise<GoogleProfile> {
  const res = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = (await res.json()) as GoogleUserInfo;
  if (!res.ok || !data.sub || !data.email) {
    throw new Error("GOOGLE_PROFILE_FAILED");
  }

  const emailVerified =
    data.email_verified === true || data.email_verified === "true";
  if (!emailVerified) {
    throw new Error("GOOGLE_EMAIL_UNVERIFIED");
  }

  return {
    sub: data.sub,
    email: data.email.toLowerCase(),
    emailVerified: true,
    name: (data.name ?? data.email.split("@")[0] ?? "User").trim() || "User",
    picture: data.picture ?? null,
  };
}

function usernameFromEmail(email: string) {
  const base = email
    .split("@")[0]!
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 24);
  return base.length >= 3 ? base : `user_${createHash("sha1").update(email).digest("hex").slice(0, 8)}`;
}

async function uniqueUsername(seed: string) {
  let candidate = seed;
  for (let i = 0; i < 12; i++) {
    const existing = await prisma.user.findUnique({
      where: { username: candidate },
    });
    if (!existing) return candidate;
    const suffix = randomBytes(2).toString("hex");
    candidate = `${seed.slice(0, 24)}_${suffix}`.slice(0, 32);
  }
  return `g_${randomBytes(8).toString("hex")}`.slice(0, 32);
}

/** Find or create a user from a verified Google profile. */
export async function upsertGoogleUser(
  profile: GoogleProfile,
  referralCode?: string | null,
): Promise<User> {
  const byGoogle = await prisma.user.findFirst({
    where: { googleId: profile.sub },
  });
  if (byGoogle) {
    if (byGoogle.banned) throw new Error("BANNED");
    return prisma.user.update({
      where: { id: byGoogle.id },
      data: {
        emailVerified: true,
        ...(profile.picture && !byGoogle.avatarUrl
          ? { avatarUrl: profile.picture }
          : {}),
      },
    });
  }

  const byEmail = await prisma.user.findUnique({
    where: { email: profile.email },
  });
  if (byEmail) {
    if (byEmail.banned) throw new Error("BANNED");
    if (byEmail.googleId && byEmail.googleId !== profile.sub) {
      throw new Error("GOOGLE_EMAIL_TAKEN");
    }
    return prisma.user.update({
      where: { id: byEmail.id },
      data: {
        googleId: profile.sub,
        emailVerified: true,
        ...(profile.picture && !byEmail.avatarUrl
          ? { avatarUrl: profile.picture }
          : {}),
      },
    });
  }

  const cleanRef = referralCode ? normalizeReferralCode(referralCode) : null;
  const referrer = cleanRef ? await resolveReferrerByCode(cleanRef) : null;

  const username = await uniqueUsername(usernameFromEmail(profile.email));
  const created = await prisma.user.create({
    data: {
      name: profile.name.slice(0, 80),
      username,
      email: profile.email,
      passwordHash: null,
      googleId: profile.sub,
      emailVerified: true,
      avatarUrl: profile.picture,
      currency: "USD",
      role: "USER",
      referredById: referrer?.id ?? null,
    },
  });

  await ensureReferralCode(created.id);

  if (referrer) {
    await prisma.notification
      .create({
        data: {
          userId: referrer.id,
          type: "REFERRAL",
          title: "New recruit joined",
          message: `@${created.username} registered with Google using your referral link.`,
          actionUrl: "/app/referral",
        },
      })
      .catch(() => {
        // Non-fatal
      });
  }

  void notifyTelegram(
    "register",
    [
      "🆕 New registration (Google)",
      `User: @${created.username}`,
      `Email: ${created.email}`,
      `Name: ${created.name}`,
      referrer ? `Referral: @${referrer.username}` : "Referral: —",
      `ID: ${created.id}`,
    ].join("\n"),
  );

  return created;
}
