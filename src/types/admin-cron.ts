export type CronJobId = "deposits";

export type CronProviderSummary = {
  method: string;
  checked: number;
  completed: number;
  failed: number;
  durationMs: number;
  qrisLiveStatusChecks?: number;
};

export type CronRunRow = {
  id: string;
  jobId: CronJobId;
  startedAt: string;
  finishedAt: string | null;
  durationMs: number;
  expired: number;
  providerGraceMinutes: number;
  providers: CronProviderSummary[];
  ok: boolean;
  errorMessage: string | null;
  createdAt: string;
};

export type CronJobSummary = {
  id: CronJobId;
  name: string;
  description: string;
  endpoint: string;
  scheduleHint: string;
  secretConfigured: boolean;
  providerGraceMinutes: number;
  lastRun: CronRunRow | null;
  stats24h: {
    total: number;
    ok: number;
    failed: number;
    avgDurationMs: number;
    expiredTotal: number;
  };
};

export type CronOverview = {
  jobs: CronJobSummary[];
  serverTime: string;
};

export type CronRunsPage = {
  runs: CronRunRow[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
};

export function formatDurationMs(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "—";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const sec = ms / 1000;
  if (sec < 60) return `${sec.toFixed(sec < 10 ? 1 : 0)}s`;
  const min = Math.floor(sec / 60);
  const rem = Math.round(sec % 60);
  return `${min}m ${rem}s`;
}

export function formatCronWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
