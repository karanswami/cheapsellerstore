import { jsonError, jsonOk } from "@/lib/api";
import type { CronJobId } from "@/lib/admin-cron";
import { requireAdmin } from "@/lib/auth/admin";
import { runDepositCronPoll } from "@/lib/deposit-cron";

const JOBS = new Set<CronJobId>(["deposits"]);

export async function POST(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return jsonError("UNAUTHORIZED", "Admin required.", 401);
  }

  let body: { job?: string } = {};
  try {
    body = (await req.json()) as { job?: string };
  } catch {
    body = {};
  }

  const job = (body.job ?? "deposits") as CronJobId;
  if (!JOBS.has(job)) {
    return jsonError("BAD_REQUEST", "Unknown cron job.", 400);
  }

  if (job === "deposits") {
    const result = await runDepositCronPoll();
    return jsonOk(result);
  }

  return jsonError("BAD_REQUEST", "Unknown cron job.", 400);
}
