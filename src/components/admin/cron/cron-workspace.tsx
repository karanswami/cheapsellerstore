"use client";

import {
  AdminEmptyState,
  AdminListSkeleton,
  AdminPageHeader,
} from "@/components/admin/admin-page-header";
import { KpiCard } from "@/components/admin/stats/kpi-card";
import { adminMutate, useAdminFetch } from "@/components/admin/use-admin-fetch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  formatCronWhen,
  formatDurationMs,
  type CronJobSummary,
  type CronOverview,
  type CronRunRow,
  type CronRunsPage,
} from "@/types/admin-cron";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  Play,
  RefreshCw,
  Timer,
  XCircle,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

type StatusFilter = "all" | "ok" | "failed";

const PAGE_SIZE = 20;

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "ok", label: "OK" },
  { value: "failed", label: "Failed" },
];

function providerCheckedTotal(run: CronRunRow) {
  return run.providers.reduce((sum, p) => sum + p.checked, 0);
}

function providerCompletedTotal(run: CronRunRow) {
  return run.providers.reduce((sum, p) => sum + p.completed, 0);
}

function JobCard({
  job,
  onRun,
  running,
}: {
  job: CronJobSummary;
  onRun: () => void;
  running: boolean;
}) {
  const last = job.lastRun;
  const healthy = last ? last.ok : null;

  return (
    <section className="rounded-xl bg-card ring-1 ring-foreground/10">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-3.5 py-3 sm:px-4">
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <h2 className="text-sm font-semibold">{job.name}</h2>
            {healthy === true ? (
              <Badge className="bg-success/15 text-success hover:bg-success/15">
                Last OK
              </Badge>
            ) : healthy === false ? (
              <Badge variant="destructive">Last failed</Badge>
            ) : (
              <Badge variant="secondary">No runs yet</Badge>
            )}
            {job.secretConfigured ? (
              <Badge variant="outline">CRON_SECRET set</Badge>
            ) : (
              <Badge
                variant="outline"
                className="border-amber-500/40 text-amber-700 dark:text-amber-400"
              >
                Secret missing
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{job.description}</p>
          <p className="text-[11px] text-muted-foreground">
            {job.scheduleHint} · grace {job.providerGraceMinutes}m ·{" "}
            <span className="font-mono">{job.endpoint}</span>
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          className="shrink-0"
          disabled={running}
          onClick={onRun}
        >
          {running ? (
            <LoaderCircle className="size-3.5 animate-spin" />
          ) : (
            <Play className="size-3.5" />
          )}
          Run now
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-4 sm:p-4">
        <KpiCard
          label="Runs (24h)"
          value={String(job.stats24h.total)}
          hint={`${job.stats24h.ok} ok · ${job.stats24h.failed} fail`}
        />
        <KpiCard
          label="Avg duration"
          value={formatDurationMs(job.stats24h.avgDurationMs)}
          hint="Last 24 hours"
        />
        <KpiCard
          label="Expired (24h)"
          value={String(job.stats24h.expiredTotal)}
          hint="Tickets closed by cron"
        />
        <KpiCard
          label="Last run"
          value={
            last ? formatDurationMs(last.durationMs) : "—"
          }
          hint={
            last
              ? `${formatCronWhen(last.startedAt)} · expired ${last.expired}`
              : "Waiting for first poll"
          }
        />
      </div>
    </section>
  );
}

export function CronWorkspace() {
  const {
    data: overview,
    loading: overviewLoading,
    reload: reloadOverview,
  } = useAdminFetch<CronOverview>("/api/admin/cron");

  const [status, setStatus] = useState<StatusFilter>("all");
  const [runs, setRuns] = useState<CronRunRow[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selected, setSelected] = useState<CronRunRow | null>(null);
  const [confirmJob, setConfirmJob] = useState<CronJobSummary | null>(null);
  const [running, setRunning] = useState(false);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const fetchGen = useRef(0);
  const loadingMoreLock = useRef(false);

  const fetchPage = useCallback(
    async (pageNum: number, mode: "replace" | "append") => {
      const gen = ++fetchGen.current;
      if (mode === "replace") {
        setLoading(true);
        loadingMoreLock.current = false;
      } else {
        if (loadingMoreLock.current) return;
        loadingMoreLock.current = true;
        setLoadingMore(true);
      }

      try {
        const params = new URLSearchParams({
          job: "deposits",
          page: String(pageNum),
          limit: String(PAGE_SIZE),
        });
        if (status === "ok") params.set("ok", "true");
        if (status === "failed") params.set("ok", "false");

        const res = await fetch(`/api/admin/cron/runs?${params}`, {
          credentials: "include",
        });
        const json = (await res.json()) as {
          data?: CronRunsPage;
          error?: { message: string };
        };
        if (gen !== fetchGen.current) return;
        if (!res.ok) {
          toast.error(json.error?.message ?? "Failed to load cron runs");
          return;
        }
        const data = json.data;
        if (!data) return;
        setTotal(data.total);
        setHasMore(data.hasMore);
        setPage(data.page);
        setRuns((prev) =>
          mode === "append" ? [...prev, ...data.runs] : data.runs,
        );
      } catch {
        if (gen === fetchGen.current) toast.error("Network error");
      } finally {
        if (gen === fetchGen.current) {
          setLoading(false);
          setLoadingMore(false);
          loadingMoreLock.current = false;
        }
      }
    },
    [status],
  );

  useEffect(() => {
    setRuns([]);
    setPage(1);
    void fetchPage(1, "replace");
  }, [fetchPage]);

  const loadMore = useCallback(() => {
    if (!hasMore || loadingMore || loading) return;
    void fetchPage(page + 1, "append");
  }, [fetchPage, hasMore, loading, loadingMore, page]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loadMore, runs.length]);

  async function runJob() {
    if (!confirmJob) return;
    setRunning(true);
    const result = await adminMutate("/api/admin/cron/run", {
      method: "POST",
      body: JSON.stringify({ job: confirmJob.id }),
    });
    setRunning(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    const payload = result.data as {
      ok?: boolean;
      expired?: number;
      durationMs?: number;
      errorMessage?: string | null;
    };
    if (payload.ok === false) {
      toast.error(payload.errorMessage ?? "Cron run failed");
    } else {
      toast.success(
        `Deposit poll finished · expired ${payload.expired ?? 0} · ${formatDurationMs(payload.durationMs ?? 0)}`,
      );
    }
    setConfirmJob(null);
    void reloadOverview();
    void fetchPage(1, "replace");
  }

  function refreshAll() {
    void reloadOverview();
    void fetchPage(1, "replace");
  }

  return (
    <main className="space-y-6">
      <AdminPageHeader
        title="Cron"
        description="Monitor scheduled jobs, inspect run history, and trigger a deposit poll safely from the admin console."
        actions={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={refreshAll}
            disabled={overviewLoading || loading}
          >
            <RefreshCw
              className={cn(
                "size-3.5",
                (overviewLoading || loading) && "animate-spin",
              )}
            />
            Refresh
          </Button>
        }
      />

      {overviewLoading || !overview ? (
        <AdminListSkeleton rows={3} />
      ) : (
        <div className="space-y-3">
          {overview.jobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              running={running && confirmJob?.id === job.id}
              onRun={() => setConfirmJob(job)}
            />
          ))}
          <p className="text-[11px] text-muted-foreground">
            Server time {formatCronWhen(overview.serverTime)}
          </p>
        </div>
      )}

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Run history</h2>
          <div
            className="flex gap-1.5 overflow-x-auto pb-0.5"
            role="tablist"
            aria-label="Cron status filters"
          >
            {FILTERS.map((f) => (
              <Button
                key={f.value}
                type="button"
                role="tab"
                aria-selected={status === f.value}
                size="sm"
                variant={status === f.value ? "default" : "outline"}
                className="h-8 shrink-0"
                onClick={() => setStatus(f.value)}
              >
                {f.label}
              </Button>
            ))}
          </div>
        </div>

        {loading && runs.length === 0 ? (
          <AdminListSkeleton rows={6} />
        ) : !runs.length ? (
          <AdminEmptyState message="No cron runs match this filter." />
        ) : (
          <div className="space-y-3">
            <ul className="divide-y divide-border/40 overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
              {runs.map((run) => {
                const checked = providerCheckedTotal(run);
                const completed = providerCompletedTotal(run);
                return (
                  <li key={run.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(run)}
                      className="flex w-full items-start gap-3 px-3.5 py-3 text-left transition-colors hover:bg-muted/50 active:bg-muted/70 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg",
                          run.ok
                            ? "bg-success/15 text-success"
                            : "bg-destructive/15 text-destructive",
                        )}
                      >
                        {run.ok ? (
                          <CheckCircle2 className="size-4" />
                        ) : (
                          <XCircle className="size-4" />
                        )}
                      </span>
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="truncate text-sm font-medium">
                            Deposit poll
                          </p>
                          <Badge
                            variant={run.ok ? "secondary" : "destructive"}
                            className="shrink-0 text-[10px]"
                          >
                            {run.ok ? "OK" : "Failed"}
                          </Badge>
                        </div>
                        <p className="truncate text-xs text-muted-foreground">
                          Expired {run.expired} · checked {checked} · completed{" "}
                          {completed}
                          {run.errorMessage ? ` · ${run.errorMessage}` : ""}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {formatCronWhen(run.startedAt)}
                        </p>
                      </div>
                      <p className="shrink-0 pt-0.5 text-xs font-medium tabular-nums text-muted-foreground">
                        {formatDurationMs(run.durationMs)}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="flex flex-col items-stretch gap-2 pt-1">
              <p className="text-center text-xs text-muted-foreground sm:text-left">
                Showing {runs.length} of {total} run{total === 1 ? "" : "s"}
              </p>

              {loadingMore ? (
                <div className="space-y-2" aria-busy="true" aria-live="polite">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full rounded-xl" />
                  ))}
                  <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                    <LoaderCircle className="size-3.5 animate-spin" />
                    Loading more…
                  </p>
                </div>
              ) : null}

              {hasMore ? (
                <div ref={sentinelRef} className="flex justify-center py-1">
                  {!loadingMore ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full sm:w-auto"
                      onClick={loadMore}
                    >
                      Load more
                    </Button>
                  ) : null}
                </div>
              ) : (
                <p className="pb-2 text-center text-[11px] text-muted-foreground">
                  You’re all caught up
                </p>
              )}
            </div>
          </div>
        )}
      </section>

      <Dialog
        open={!!confirmJob}
        onOpenChange={(open) => {
          if (!open && !running) setConfirmJob(null);
        }}
      >
        <DialogContent className="flex max-h-[min(92dvh,520px)] w-full max-w-[calc(100%-1.25rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
          {confirmJob ? (
            <>
              <div className="shrink-0 border-b border-border/40 bg-muted/40 px-4 pt-4 pb-3.5 sm:px-5">
                <DialogHeader className="gap-3 pr-8 text-left">
                  <div className="flex items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Play className="size-5" />
                    </span>
                    <div className="min-w-0 space-y-1.5">
                      <DialogTitle className="text-lg leading-snug">
                        Run {confirmJob.name}?
                      </DialogTitle>
                      <DialogDescription>
                        Starts the same poll used by the VPS crontab. Safe to
                        run anytime — it expires stale tickets and rechecks
                        pending auto rails.
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>
              </div>
              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-4 text-sm text-muted-foreground sm:px-5">
                <p className="flex items-center gap-2">
                  <Timer className="size-3.5 shrink-0" />
                  Grace window {confirmJob.providerGraceMinutes} minutes
                </p>
                <p className="flex items-center gap-2">
                  <Clock3 className="size-3.5 shrink-0" />
                  Endpoint{" "}
                  <span className="font-mono text-foreground">
                    {confirmJob.endpoint}
                  </span>
                </p>
                {!confirmJob.secretConfigured ? (
                  <p className="flex items-start gap-2 text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                    CRON_SECRET is not set — VPS crontab auth may fail in
                    production. Admin Run now still works.
                  </p>
                ) : null}
              </div>
              <DialogFooter className="shrink-0 gap-2 border-t border-border px-4 py-3 sm:px-5">
                <Button
                  type="button"
                  variant="outline"
                  disabled={running}
                  onClick={() => setConfirmJob(null)}
                >
                  Cancel
                </Button>
                <Button type="button" disabled={running} onClick={runJob}>
                  {running ? (
                    <LoaderCircle className="size-3.5 animate-spin" />
                  ) : (
                    <Play className="size-3.5" />
                  )}
                  Run now
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent className="flex max-h-[min(92dvh,640px)] w-full max-w-[calc(100%-1.25rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
          {selected ? (
            <>
              <div className="shrink-0 border-b border-border/40 bg-muted/40 px-4 pt-4 pb-3.5 sm:px-5">
                <DialogHeader className="gap-3 pr-8 text-left">
                  <div className="flex items-start gap-3">
                    <span
                      className={cn(
                        "flex size-10 shrink-0 items-center justify-center rounded-xl",
                        selected.ok
                          ? "bg-success/15 text-success"
                          : "bg-destructive/15 text-destructive",
                      )}
                    >
                      {selected.ok ? (
                        <CheckCircle2 className="size-5" />
                      ) : (
                        <XCircle className="size-5" />
                      )}
                    </span>
                    <div className="min-w-0 space-y-1.5">
                      <DialogTitle className="text-lg leading-snug">
                        Deposit poll run
                      </DialogTitle>
                      <DialogDescription>
                        {formatCronWhen(selected.startedAt)}
                      </DialogDescription>
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        <Badge
                          variant={selected.ok ? "secondary" : "destructive"}
                        >
                          {selected.ok ? "OK" : "Failed"}
                        </Badge>
                        <Badge variant="outline">
                          {formatDurationMs(selected.durationMs)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </DialogHeader>
              </div>

              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4 sm:px-5">
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-card ring-1 ring-foreground/10 px-3 py-2.5">
                    <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                      Expired
                    </p>
                    <p className="mt-1 text-base font-semibold tabular-nums">
                      {selected.expired}
                    </p>
                  </div>
                  <div className="rounded-xl bg-card ring-1 ring-foreground/10 px-3 py-2.5">
                    <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                      Grace
                    </p>
                    <p className="mt-1 text-base font-semibold tabular-nums">
                      {selected.providerGraceMinutes}m
                    </p>
                  </div>
                </div>

                {selected.errorMessage ? (
                  <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-3.5 py-3 text-sm text-destructive">
                    {selected.errorMessage}
                  </div>
                ) : null}

                <Separator />

                <div className="space-y-2">
                  <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                    Providers
                  </p>
                  {selected.providers.length ? (
                    <ul className="space-y-2">
                      {selected.providers.map((p) => (
                        <li
                          key={p.method}
                          className="rounded-xl bg-card ring-1 ring-foreground/10 px-3.5 py-3"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium">{p.method}</p>
                            <p className="text-[11px] tabular-nums text-muted-foreground">
                              {formatDurationMs(p.durationMs)}
                            </p>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Checked {p.checked} · completed {p.completed} ·
                            failed {p.failed}
                            {p.qrisLiveStatusChecks != null
                              ? ` · live status ${p.qrisLiveStatusChecks}`
                              : ""}
                          </p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No provider stats recorded.
                    </p>
                  )}
                </div>

                <div className="space-y-1 text-[11px] text-muted-foreground">
                  <p>Started {formatCronWhen(selected.startedAt)}</p>
                  {selected.finishedAt ? (
                    <p>Finished {formatCronWhen(selected.finishedAt)}</p>
                  ) : null}
                  <p className="font-mono break-all">ID {selected.id}</p>
                </div>
              </div>

              <DialogFooter className="shrink-0 border-t border-border px-4 py-3 sm:px-5">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => setSelected(null)}
                >
                  Close
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </main>
  );
}
