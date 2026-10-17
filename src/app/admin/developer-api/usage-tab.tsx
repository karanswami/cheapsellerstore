"use client";

import { useEffect, useState } from "react";
import { Activity, Check, Copy, Radio } from "lucide-react";
import { toast } from "sonner";
import { EmptyState, formatDate } from "@/components/app-ui";
import { Chips, Pager, SearchBox, TableSkeleton, useAdminList, useDebounced } from "@/components/admin/kit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { HttpStatus, Latency, MethodBadge, timeAgo } from "./shared";

type UsageRow = {
  id: string;
  method: string;
  path: string;
  statusCode: number;
  durationMs: number | null;
  errorCode: string | null;
  requestId: string;
  ip: string | null;
  username: string;
  keyPrefix: string;
  createdAt: string;
};

const FILTERS = [
  { v: "all", label: "All" },
  { v: "ok", label: "Success" },
  { v: "error", label: "Errors" },
  { v: "busy", label: "Rate limited" },
  { v: "slow", label: "Slow (1s+)" },
  { v: "purchases", label: "Purchases" },
];

export function UsageTab() {
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [auto, setAuto] = useState(false);
  const [open, setOpen] = useState<UsageRow | null>(null);
  const dq = useDebounced(q);
  const list = useAdminList<UsageRow>("/api/admin/seller-api/usage", "items", { page, limit: 20, filter, q: dq });
  const { reload } = list;

  // Optional tail -f: refetch every 5s while "Live" is on.
  useEffect(() => {
    if (!auto) return;
    const t = setInterval(reload, 5000);
    return () => clearInterval(t);
  }, [auto, reload]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-3 sm:p-4 lg:flex-row lg:items-center lg:justify-between">
        <Chips value={filter} onChange={(v) => { setFilter(v); setPage(1); }} options={FILTERS} />
        <div className="flex items-center gap-2">
          <Button type="button" variant={auto ? "default" : "secondary"} size="sm" onClick={() => setAuto((v) => !v)} aria-pressed={auto}>
            <Radio className={cn(auto && "animate-pulse")} /> {auto ? "Live" : "Go live"}
          </Button>
          <SearchBox value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Path, user or key prefix…" />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        {list.loading && list.items.length === 0 ? (
          <TableSkeleton />
        ) : list.items.length === 0 ? (
          <div className="p-6">
            <EmptyState icon={Activity} title="No requests" hint="API calls will show up here." />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead>When</TableHead>
                <TableHead>Request</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Developer</TableHead>
                <TableHead className="text-right">Latency</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.items.map((r) => (
                <TableRow key={r.id} className={cn("cursor-pointer", r.statusCode >= 500 && "bg-destructive/5")} onClick={() => setOpen(r)}>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground" title={formatDate(r.createdAt, true)}>
                    {timeAgo(r.createdAt)}
                  </TableCell>
                  <TableCell className="max-w-64">
                    <div className="flex items-center gap-2">
                      <MethodBadge method={r.method} />
                      <span className="truncate font-mono text-xs">{r.path}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <HttpStatus code={r.statusCode} />
                    {r.errorCode ? <span className="ml-1.5 hidden text-xs text-muted-foreground sm:inline">{r.errorCode}</span> : null}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span className="text-sm">@{r.username}</span>{" "}
                    <Badge variant="outline" className="font-mono">{r.keyPrefix}</Badge>
                  </TableCell>
                  <TableCell className="text-right text-xs"><Latency ms={r.durationMs} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
      <Pager page={page} pageSize={20} total={list.total} onPage={setPage} loading={list.loading} />

      <RequestDialog row={open} onClose={() => setOpen(null)} />
    </div>
  );
}

function RequestDialog({ row, onClose }: { row: UsageRow | null; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const rows: [string, React.ReactNode][] = row
    ? [
        ["Time", formatDate(row.createdAt, true)],
        ["Developer", `@${row.username}`],
        ["API key", <code key="k" className="font-mono text-xs">{row.keyPrefix}…</code>],
        ["IP address", row.ip ?? "—"],
        ["Latency", <Latency key="l" ms={row.durationMs} />],
        ["Error code", row.errorCode ?? "—"],
      ]
    : [];
  return (
    <Dialog open={!!row} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {row ? <HttpStatus code={row.statusCode} /> : null} Request details
          </DialogTitle>
          <DialogDescription className="sr-only">Details of a single API request.</DialogDescription>
        </DialogHeader>
        {row ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-3">
              <MethodBadge method={row.method} />
              <span className="min-w-0 flex-1 break-all font-mono text-xs">{row.path}</span>
            </div>
            <dl className="divide-y rounded-lg border text-sm">
              {rows.map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-4 px-3 py-2">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="text-right font-medium">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="flex items-center gap-2 rounded-lg border p-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">Request ID</p>
                <p className="truncate font-mono text-xs">{row.requestId}</p>
              </div>
              <Button
                variant="secondary"
                size="icon-sm"
                aria-label="Copy request ID"
                onClick={() => {
                  void navigator.clipboard.writeText(row.requestId);
                  setCopied(true);
                  toast.success("Request ID copied.");
                  setTimeout(() => setCopied(false), 1500);
                }}
              >
                {copied ? <Check /> : <Copy />}
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
