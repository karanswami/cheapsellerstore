import { jsonError } from "@/lib/api";
import {
  createGoogleOAuthState,
  isGoogleAuthConfigured,
  googleAuthUrl,
  isNativeAppUserAgent,
} from "@/lib/auth/google";
import { getEnv } from "@/lib/env";
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

  const state = await createGoogleOAuthState({
    native: isNativeAppUserAgent(request),
    next: safeNext,
    referralCode: ref || null,
  });

  return NextResponse.redirect(await googleAuthUrl(state));
}
