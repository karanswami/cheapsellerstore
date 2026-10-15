export const runtime = "nodejs";

import { jsonError, jsonOk } from "@/lib/api";
import { runDepositCronPoll } from "@/lib/deposit-cron";

function isAuthorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const header = req.headers.get("x-cron-secret");
  return bearer === secret || header === secret;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return jsonError("UNAUTHORIZED", "Invalid cron secret.", 401);
  }
  return jsonOk(await runDepositCronPoll());
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return jsonError("UNAUTHORIZED", "Invalid cron secret.", 401);
  }
  return jsonOk(await runDepositCronPoll());
}
