import { jsonError } from "@/lib/api";
import {
  createGoogleOAuthState,
  isGoogleAuthConfigured,
  googleAuthUrl,
  isNativeAppUserAgent,
} from "@/lib/auth/google";
import { getSessionUserId } from "@/lib/auth/customer";
import { getEnv, sessionCookieSecure } from "@/lib/env";
import { randomBytes } from "node:crypto";
import { OAUTH_NONCE_COOKIE } from "@/lib/auth/google";
import { isMaintenanceMode } from "@/lib/maintenance";
import { NextResponse } from "next/server";

function redirectMaintenance() {
  const base = getEnv().appUrl.replace(/\/$/, "");
  const url = new URL("/", base);
  url.searchParams.set("auth", "login");
  url.searchParams.set("google_error", "maintenance");
  return NextResponse.redirect(url);
}

export async function GET(request: Request) {
  if (await isMaintenanceMode()) {
    return redirectMaintenance();
  }

  if (!(await isGoogleAuthConfigured())) {
    return jsonError(
      "GOOGLE_NOT_CONFIGURED",
      "Google sign-in is not configured.",
      503,
    );
  }

  const url = new URL(request.url);
  const next = url.searchParams.get("next");
  const ref = url.searchParams.get("ref") || url.searchParams.get("referral");
  const safeNext =
    next && next.startsWith("/") && !next.startsWith("//") ? next : null;

  let linkUserId: string | null = null;
  if (url.searchParams.get("link") === "1") {
    linkUserId = await getSessionUserId();
    if (!linkUserId) {
      return NextResponse.redirect(new URL("/", getEnv().appUrl.replace(/\/$/, "")));
    }
  }

  // Web flow: bind the OAuth round-trip to THIS browser (blocks login-CSRF / forced-login links).
  // The native app uses Custom Tabs (separate cookie jar) so it relies on the signed state alone.
  const native = isNativeAppUserAgent(request);
  const nonce = native ? null : randomBytes(16).toString("hex");

  const state = await createGoogleOAuthState({
    linkUserId,
    nonce,
    native,
    next: safeNext,
    referralCode: ref || null,
  });

  const res = NextResponse.redirect(await googleAuthUrl(state));
  if (nonce) {
    res.cookies.set(OAUTH_NONCE_COOKIE, nonce, {
      httpOnly: true,
      sameSite: "lax",
      secure: sessionCookieSecure(),
      path: "/api/auth/google",
      maxAge: 15 * 60,
    });
  }
  return res;
}
