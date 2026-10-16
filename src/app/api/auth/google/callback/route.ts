import { logActivity } from "@/lib/activity-log";
import {
  clearTwoFactorChallengeCookie,
  setTwoFactorChallengeCookie,
} from "@/lib/auth/challenge";
import { getSessionUserId, setCustomerSessionCookie } from "@/lib/auth/customer";
import {
  consumeGoogleOAuthState,
  createNativeAuthHandoff,
  exchangeGoogleCode,
  fetchGoogleProfile,
  linkGoogleToUser,
  isNativeAppUserAgent,
  nativeOAuthBridgeResponse,
  nativeOAuthErrorUrl,
  nativeOAuthSuccessUrl,
  upsertGoogleUser,
} from "@/lib/auth/google";
import { getEnv } from "@/lib/env";
import { isMaintenanceMode } from "@/lib/maintenance";
import { homePathForRole } from "@/lib/roles";
import { NextResponse } from "next/server";

function redirectWebError(code: string) {
  const base = getEnv().appUrl.replace(/\/$/, "");
  const url = new URL("/", base);
  url.searchParams.set("auth", "login");
  url.searchParams.set("google_error", code);
  return NextResponse.redirect(url);
}

function redirectError(code: string, nativeHandoff: boolean) {
  if (nativeHandoff) {
    return nativeOAuthBridgeResponse(nativeOAuthErrorUrl(code));
  }
  return redirectWebError(code);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const state = await consumeGoogleOAuthState(url.searchParams.get("state"));
  const inNativeWebView = isNativeAppUserAgent(request);
  // OAuth started in the APK WebView but finished in Chrome Custom Tabs.
  const handoff = state.ok && state.native && !inNativeWebView;

  if (await isMaintenanceMode()) {
    return redirectError("maintenance", handoff);
  }

  const error = url.searchParams.get("error");
  if (error) {
    return redirectError("denied", handoff);
  }

  const code = url.searchParams.get("code");
  if (!code || !state.ok) {
    return redirectError("invalid_state", handoff);
  }

  const nextPath = state.next;

  if (state.linkUserId) {
    const profileUrl = (q: string) =>
      NextResponse.redirect(new URL(`/app/profile?${q}`, getEnv().appUrl.replace(/\/$/, "")));
    try {
      if ((await getSessionUserId()) !== state.linkUserId) return profileUrl("google=session");
      const tokens = await exchangeGoogleCode(code);
      if (!tokens.access_token) return profileUrl("google=failed");
      const profile = await fetchGoogleProfile(tokens.access_token);
      await linkGoogleToUser(state.linkUserId, profile);
      return profileUrl("google=linked");
    } catch (err) {
      const m = err instanceof Error ? err.message : "";
      return profileUrl(m === "GOOGLE_ACCOUNT_TAKEN" ? "google=taken" : "google=failed");
    }
  }

  try {
    const tokens = await exchangeGoogleCode(code);
    if (!tokens.access_token) {
      return redirectError("token", handoff);
    }

    const profile = await fetchGoogleProfile(tokens.access_token);
    const user = await upsertGoogleUser(profile, state.referralCode);
    const role = user.role ?? "USER";

    if (handoff) {
      const token = await createNativeAuthHandoff({
        userId: user.id,
        role,
        needs2fa: Boolean(user.twoFactorEnabled),
        next: nextPath,
      });
      logActivity({
        request,
        action: user.twoFactorEnabled ? "LOGIN_2FA" : "GOOGLE_LOGIN",
        category: "AUTH",
        message: user.twoFactorEnabled
          ? `Google 2FA handoff (@${user.username})`
          : `Google native handoff (@${user.username})`,
        user,
        metadata: {
          method: "google",
          stage: user.twoFactorEnabled
            ? "native_2fa_handoff"
            : "native_handoff",
        },
      });
      return nativeOAuthBridgeResponse(nativeOAuthSuccessUrl(token));
    }

    if (user.twoFactorEnabled) {
      await setTwoFactorChallengeCookie(user.id);
      logActivity({
        request,
        action: "LOGIN_2FA",
        category: "AUTH",
        message: `Google 2FA challenge (@${user.username})`,
        user,
        metadata: { method: "google", stage: "challenge" },
      });
      const base = getEnv().appUrl.replace(/\/$/, "");
      const dest = new URL("/", base);
      dest.searchParams.set("auth", "2fa");
      if (nextPath) dest.searchParams.set("next", nextPath);
      return NextResponse.redirect(dest);
    }

    await clearTwoFactorChallengeCookie();
    await setCustomerSessionCookie(user.id, role);
    logActivity({
      request,
      action: "GOOGLE_LOGIN",
      category: "AUTH",
      message: `Logged in with Google (@${user.username})`,
      user,
      metadata: { method: "google" },
    });
    const base = getEnv().appUrl.replace(/\/$/, "");
    const dest = new URL(nextPath ?? homePathForRole(role), base);
    return NextResponse.redirect(dest);
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message === "GOOGLE_EMAIL_UNVERIFIED") {
      return redirectError("unverified", handoff);
    }
    if (message === "GOOGLE_EMAIL_TAKEN") {
      return redirectError("email_taken", handoff);
    }
    if (message === "BANNED") {
      logActivity({
        request,
        action: "LOGIN_FAILED",
        category: "SECURITY",
        message: "Banned account Google login attempt",
        success: false,
        metadata: { reason: "banned", method: "google" },
      });
      return redirectError("banned", handoff);
    }
    if (message === "GOOGLE_NOT_CONFIGURED") {
      return redirectError("not_configured", handoff);
    }
    return redirectError("failed", handoff);
  }
}
