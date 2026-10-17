import { jsonError, jsonOk } from "@/lib/api";
import { clientIpFromHeaders, rateLimitAll, tooManyRequests } from "@/lib/rate-limit";
import {
  normalizeReferralCode,
  resolveReferrerByCode,
} from "@/lib/referrals";

/** Public: validate an optional referral code during register. */
export async function GET(request: Request) {
  const limited = await rateLimitAll([
    { key: `referral-check:${clientIpFromHeaders(request.headers)}`, limit: 30, windowMs: 60_000 },
  ]);
  if (limited) return tooManyRequests(limited);
  const url = new URL(request.url);
  const code = normalizeReferralCode(url.searchParams.get("code"));

  if (!code) {
    return jsonOk({ valid: false as const, message: "" });
  }

  if (code.length < 4 || code.length > 64) {
    return jsonError("VALIDATION", "Invalid referral code length.", 400);
  }

  const referrer = await resolveReferrerByCode(code);
  if (!referrer) {
    return jsonOk({
      valid: false as const,
      message: "Referral code not found.",
    });
  }

  return jsonOk({
    valid: true as const,
    username: referrer.username,
    message: `Linked to @${referrer.username}`,
  });
}
