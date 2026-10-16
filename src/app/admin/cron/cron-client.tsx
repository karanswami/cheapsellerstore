"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Clock, Copy, Play, RefreshCw } from "lucide-react";
import { EmptyState, formatDate } from "@/components/app-ui";
import { Chips, Pager, StatCard, SubmitButton, TableSkeleton, adminFetch, errMsg, useAdminList, useAdminQuery } from "@/components/admin/kit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDurationMs, type CronJobSummary, type CronOverview, type CronRunRow, type CronRunsPage } from "@/types/admin-cron";

type OkFilter = "all" | "true" | "false";

const PAGE_SIZE = 15;

export function AdminCronClient() {
  const overview = useAdminQuery<CronOverview>("/api/admin/cron");
  const [page, setPage] = useState(1);
  const [ok, setOk] = useState<OkFilter>("all");
  const [auto, setAuto] = useState(true);
  const [detail, setDetail] = useState<CronRunRow | null>(null);
  const [running, setRunning] = useState<string | null>(null);
  const runs = useAdminList<CronRunsPage["runs"][number]>("/api/admin/cron/runs", "runs", {
    page,
    limit: PAGE_SIZE,
    ok: ok === "all" ? undefined : ok,
  });

  // Auto-refresh every 30s so the history stays live while the page is open.
  const { reload: reloadOverview } = overview;
  const { reload: reloadRuns } = runs;
  useEffect(() => {
    if (!auto) return;
    const t = setInterval(() => {
      reloadOverview();
      reloadRuns();
    }, 30_000);
    return () => clearInterval(t);
  }, [auto, reloadOverview, reloadRuns]);

  async function runNow(job: CronJobSummary) {
    setRunning(job.id);
    try {
      await adminFetch("/api/admin/cron/run", { method: "POST", json: { job: job.id } });
      toast.success(`${job.name} finished.`);
      overview.reload();
      runs.reload();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setRunning(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <Button variant={auto ? "secondary" : "outline"} size="sm" onClick={() => setAuto((v) => !v)}>
          <RefreshCw className={auto ? "animate-spin [animation-duration:3s]" : ""} /> Auto-refresh {auto ? "on" : "off"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            overview.reload();
            runs.reload();
          }}
        >
          <RefreshCw /> Refresh
        </Button>
      </div>

      {overview.data ? (
        overview.data.jobs.map((job) => <JobCard key={job.id} job={job} running={running === job.id} onRun={() => runNow(job)} />)
      ) : (
        <TableSkeleton rows={3} />
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-lg font-semibold">Run history</h3>
        <Chips<OkFilter>
          value={ok}
          onChange={(v) => {
            setOk(v);
            setPage(1);
          }}
          options={[
            { v: "all", label: "All" },
            { v: "true", label: "Succeeded" },
            { v: "false", label: "Failed" },
          ]}
        />
      </div>

      <div className="rounded-xl border bg-card">
        {runs.loading && runs.items.length === 0 ? (
          <TableSkeleton />
        ) : runs.items.length === 0 ? (
          <div className="p-6">
            <EmptyState icon={Clock} title="No runs found" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Started</TableHead>
                <TableHead>Job</TableHead>
                <TableHead>Result</TableHead>
                <TableHead className="text-right">Duration</TableHead>
                <TableHead className="text-right">Expired</TableHead>
                <TableHead>Providers</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.items.map((r) => (
                <TableRow key={r.id} className="cursor-pointer" onClick={() => setDetail(r)}>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{formatDate(r.startedAt, true)}</TableCell>
                  <TableCell className="text-sm">{r.jobId}</TableCell>
                  <TableCell>
                    <Badge variant={r.ok ? "success" : "destructive"}>{r.ok ? "OK" : "Failed"}</Badge>
                    {r.errorMessage ? <span className="ml-1 line-clamp-1 text-xs text-muted-foreground">{r.errorMessage}</span> : null}
                  </TableCell>
                  <TableCell className="text-right text-sm">{formatDurationMs(r.durationMs)}</TableCell>
                  <TableCell className="text-right text-sm">{r.expired}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.providers.map((p) => `${p.method} ${p.completed}/${p.checked}`).join(" · ") || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
      <Pager page={page} pageSize={PAGE_SIZE} total={runs.total} onPage={setPage} loading={runs.loading} />

      <RunDialog run={detail} onClose={() => setDetail(null)} />
    </div>
  );
}

function JobCard({ job, running, onRun }: { job: CronJobSummary; running: boolean; onRun: () => void }) {
  const crontab = `* * * * * curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" https://YOUR_DOMAIN${job.endpoint} >/dev/null`;
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="font-display text-lg font-semibold">{job.name}</h3>
          <p className="text-sm text-muted-foreground">{job.description}</p>
          <p className="mt-2 font-mono text-xs text-muted-foreground">
            {job.endpoint} · {job.scheduleHint}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant={job.secretConfigured ? "success" : "warning"}>{job.secretConfigured ? "Secret set" : "No secret"}</Badge>
            <Badge variant="muted">Grace {job.providerGraceMinutes} min</Badge>
            {job.lastRun ? <Badge variant={job.lastRun.ok ? "success" : "destructive"}>Last run {job.lastRun.ok ? "OK" : "failed"}</Badge> : <Badge variant="warning">Never run</Badge>}
          </div>
        </div>
        <SubmitButton busy={running} onClick={onRun}>
          <Play /> Run now
        </SubmitButton>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Runs 24h" value={job.stats24h.total} hint={`${job.stats24h.ok} ok · ${job.stats24h.failed} failed`} tone={job.stats24h.failed ? "destructive" : "default"} />
        <StatCard label="Avg duration" value={formatDurationMs(job.stats24h.avgDurationMs)} />
        <StatCard label="Expired 24h" value={job.stats24h.expiredTotal} />
        <StatCard label="Last run" value={job.lastRun ? formatDate(job.lastRun.startedAt, true) : "Never"} />
      </div>
      <div className="mt-4 flex items-center gap-2 rounded-lg bg-muted/50 p-2">
        <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap font-mono text-xs">{crontab}</code>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Copy crontab line"
          onClick={() => navigator.clipboard.writeText(crontab).then(() => toast.success("Crontab line copied."))}
        >
          <Copy />
        </Button>
      </div>
    </div>
  );
}

function RunDialog({ run, onClose }: { run: CronRunRow | null; onClose: () => void }) {
  return (
    <Dialog open={run !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        {run ? (
          <>
            <DialogHeader>
              <DialogTitle>Run details</DialogTitle>
              <DialogDescription>
                {run.jobId} · {formatDate(run.startedAt, true)}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              <div className="flex flex-wrap gap-2">
                <Badge variant={run.ok ? "success" : "destructive"}>{run.ok ? "OK" : "Failed"}</Badge>
                <Badge variant="muted">{formatDurationMs(run.durationMs)}</Badge>
                <Badge variant="muted">{run.expired} expired</Badge>
                <Badge variant="muted">Grace {run.providerGraceMinutes} min</Badge>
              </div>
              {run.errorMessage ? <p className="rounded-lg bg-destructive/10 p-2 text-destructive">{run.errorMessage}</p> : null}
              {run.providers.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Provider</TableHead>
                      <TableHead className="text-right">Checked</TableHead>
                      <TableHead className="text-right">Done</TableHead>
                      <TableHead className="text-right">Failed</TableHead>
                      <TableHead className="text-right">Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {run.providers.map((p) => (
                      <TableRow key={p.method}>
                        <TableCell>{p.method}</TableCell>
                        <TableCell className="text-right">{p.checked}</TableCell>
                        <TableCell className="text-right">{p.completed}</TableCell>
                        <TableCell className="text-right">{p.failed}</TableCell>
                        <TableCell className="text-right">{formatDurationMs(p.durationMs)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-muted-foreground">No provider activity in this run.</p>
              )}
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
