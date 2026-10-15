import { jsonError, jsonOk } from "@/lib/api";
import { listCronRuns, type CronJobId } from "@/lib/admin-cron";
import { requireAdmin } from "@/lib/auth/admin";

const JOBS = new Set<CronJobId | "all">(["all", "deposits"]);

export async function GET(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return jsonError("UNAUTHORIZED", "Admin required.", 401);
  }

  const url = new URL(req.url);
  const rawJob = url.searchParams.get("job") ?? "all";
  const job = JOBS.has(rawJob as CronJobId | "all")
    ? (rawJob as CronJobId | "all")
    : "all";
  const page = Number(url.searchParams.get("page") ?? "1");
  const limit = Number(url.searchParams.get("limit") ?? "20");
  const okParam = url.searchParams.get("ok");
  const ok =
    okParam === "true" ? true : okParam === "false" ? false : null;

  const data = await listCronRuns({
    job,
    page: Number.isFinite(page) ? page : 1,
    limit: Number.isFinite(limit) ? limit : 20,
    ok,
  });

  return jsonOk(data);
}
