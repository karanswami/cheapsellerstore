import { logActivity } from "@/lib/activity-log";
import {
  clearTwoFactorChallengeCookie,
  setTwoFactorChallengeCookie,
} from "@/lib/auth/challenge";
import { setCustomerSessionCookie } from "@/lib/auth/customer";
import { consumeNativeAuthHandoff } from "@/lib/auth/google";
import { getEnv } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { homePathForRole } from "@/lib/roles";
import { NextResponse } from "next/server";

/**
 * Completes Google (or future) OAuth after Custom Tabs → `dripclient://oauth`.
 * Runs inside the Capacitor WebView so the session cookie lands in the app jar.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const base = getEnv().appUrl.replace(/\/$/, "");

  const fail = (code: string) => {
    const dest = new URL("/", base);
    dest.searchParams.set("auth", "login");
    dest.searchParams.set("google_error", code);
    return NextResponse.redirect(dest);
  };

  const handoff = await consumeNativeAuthHandoff(url.searchParams.get("token"));
  if (!handoff) {
    return fail("invalid_state");
  }

  const user = await prisma.user.findUnique({ where: { id: handoff.userId } });
  if (!user || user.banned) {
    return fail(user?.banned ? "banned" : "failed");
  }

  const role = user.role ?? handoff.role;
  const nextPath = handoff.next;

  if (handoff.needs2fa || user.twoFactorEnabled) {
    await setTwoFactorChallengeCookie(user.id);
    logActivity({
      request,
      action: "LOGIN_2FA",
      category: "AUTH",
      message: `Native Google 2FA challenge (@${user.username})`,
      user,
      metadata: { method: "google", stage: "native_challenge" },
    });
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
    message: `Native Google session (@${user.username})`,
    user,
    metadata: { method: "google", stage: "native_session" },
  });

  const dest = new URL(nextPath ?? homePathForRole(role), base);
  return NextResponse.redirect(dest);
}
