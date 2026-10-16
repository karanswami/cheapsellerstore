"use client";

import { useState } from "react";
import { Activity } from "lucide-react";
import { EmptyState, formatDate } from "@/components/app-ui";
import { Chips, Pager, SearchBox, TableSkeleton, useAdminList, useDebounced } from "@/components/admin/kit";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type UsageRow = {
  id: string;
  method: string;
  path: string;
  statusCode: number;
  durationMs: number | null;
  errorCode: string | null;
  username: string;
  keyPrefix: string;
  createdAt: string;
};

const FILTERS = [
  { v: "all", label: "All" },
  { v: "ok", label: "Success" },
  { v: "error", label: "Errors" },
  { v: "busy", label: "Rate limited" },
  { v: "purchases", label: "Purchases" },
];

function statusVariant(code: number) {
  return code < 400 ? "success" : code === 429 ? "warning" : "destructive";
}

export function UsageTab() {
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const dq = useDebounced(q);
  const list = useAdminList<UsageRow>("/api/admin/seller-api/usage", "items", { page, limit: 20, filter, q: dq });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Chips value={filter} onChange={(v) => { setFilter(v); setPage(1); }} options={FILTERS} />
        <SearchBox value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Path, user or key prefix…" />
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
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Request</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Developer</TableHead>
                <TableHead className="text-right">Latency</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.items.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{formatDate(r.createdAt, true)}</TableCell>
                  <TableCell className="max-w-64">
                    <div className="flex items-center gap-2">
                      <Badge variant={r.method === "GET" ? "muted" : "highlight"} className="font-mono">
                        {r.method}
                      </Badge>
                      <span className="truncate font-mono text-xs">{r.path}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(r.statusCode)}>{r.statusCode}</Badge>
                    {r.errorCode ? <span className="ml-1.5 text-xs text-muted-foreground">{r.errorCode}</span> : null}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">@{r.username}</span>{" "}
                    <Badge variant="outline" className="font-mono">
                      {r.keyPrefix}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">{r.durationMs != null ? `${r.durationMs} ms` : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
      <Pager page={page} pageSize={20} total={list.total} onPage={setPage} loading={list.loading} />
    </div>
  );
}
