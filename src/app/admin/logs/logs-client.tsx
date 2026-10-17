"use client";

import { useState } from "react";
import { Activity, History } from "lucide-react";
import { EmptyState, StatusBadge, formatDate } from "@/components/app-ui";
import { Chips, Pager, SearchBox, TableSkeleton, useAdminList, useDebounced } from "@/components/admin/kit";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatMoney } from "@/lib/currencies";
import { ACTIVITY_CATEGORY_LABEL, ACTIVITY_LOG_CATEGORIES, type ActivityLogRow } from "@/types/activity-log";
import { HISTORY_KIND_LABEL, formatWhen, type AdminHistoryEvent } from "@/types/admin-stats";

export function AdminLogsClient() {
  return (
    <Tabs defaultValue="activity" className="space-y-4">
      <TabsList>
        <TabsTrigger value="activity">
          <Activity className="size-4" /> Activity
        </TabsTrigger>
        <TabsTrigger value="events">
          <History className="size-4" /> Store events
        </TabsTrigger>
      </TabsList>
      <TabsContent value="activity">
        <ActivityLogs />
      </TabsContent>
      <TabsContent value="events">
        <Events />
      </TabsContent>
    </Tabs>
  );
}

const LIMIT = 20;

function ActivityLogs() {
  const [category, setCategory] = useState("all");
  const [success, setSuccess] = useState("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const dq = useDebounced(q);
  const list = useAdminList<ActivityLogRow>("/api/admin/logs", "items", { page, limit: LIMIT, category, q: dq, success: success === "all" ? undefined : success });
  const [open, setOpen] = useState<ActivityLogRow | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Select value={category} onValueChange={(v) => { setCategory(v); setPage(1); }}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {ACTIVITY_LOG_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {ACTIVITY_CATEGORY_LABEL[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Chips value={success} onChange={(v) => { setSuccess(v); setPage(1); }} options={[{ v: "all", label: "All" }, { v: "true", label: "Success" }, { v: "false", label: "Failed" }]} />
        </div>
        <SearchBox value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="User, message, IP, action…" />
      </div>
      <div className="rounded-xl border bg-card">
        {list.loading && list.items.length === 0 ? (
          <TableSkeleton />
        ) : list.items.length === 0 ? (
          <div className="p-6">
            <EmptyState icon={Activity} title="No activity" hint="Logs are kept for a few days." />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>IP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.items.map((l) => (
                <TableRow key={l.id} className="cursor-pointer" onClick={() => setOpen(l)}>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{formatDate(l.createdAt, true)}</TableCell>
                  <TableCell>
                    <Badge variant={l.success ? "outline" : "destructive"}>{l.action}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">{l.username ? `@${l.username}` : <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell className="max-w-72 truncate text-sm">{l.message}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{l.ip ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
      <Pager page={page} pageSize={LIMIT} total={list.total} onPage={setPage} loading={list.loading} />
      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-xl">
          {open ? (
            <>
              <DialogHeader>
                <DialogTitle>{open.action}</DialogTitle>
                <DialogDescription>{formatDate(open.createdAt, true)}</DialogDescription>
              </DialogHeader>
              <p className="text-sm">{open.message}</p>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">User</dt>
                  <dd>{open.username ? `@${open.username}` : "—"} {open.role ? `(${open.role})` : ""}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Email</dt>
                  <dd className="break-all">{open.email ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">IP</dt>
                  <dd className="font-mono text-xs">{open.ip ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Category</dt>
                  <dd>{open.category}</dd>
                </div>
              </dl>
              {open.userAgent ? <p className="break-words text-xs text-muted-foreground">{open.userAgent}</p> : null}
              {open.metadata ? (
                <ScrollArea className="max-h-64 rounded-lg border bg-muted/50">
                  <pre className="p-3 text-xs">{JSON.stringify(open.metadata, null, 2)}</pre>
                </ScrollArea>
              ) : null}
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Events() {
  const [kind, setKind] = useState("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const dq = useDebounced(q);
  const list = useAdminList<AdminHistoryEvent>("/api/admin/history", "events", { page, limit: LIMIT, kind, q: dq });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Chips
          value={kind}
          onChange={(v) => {
            setKind(v);
            setPage(1);
          }}
          options={Object.entries(HISTORY_KIND_LABEL).map(([v, label]) => ({ v, label }))}
        />
        <SearchBox value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search events…" />
      </div>
      <div className="rounded-xl border bg-card">
        {list.loading && list.items.length === 0 ? (
          <TableSkeleton />
        ) : list.items.length === 0 ? (
          <div className="p-6">
            <EmptyState icon={History} title="No events" />
          </div>
        ) : (
          <ul className="divide-y">
            {list.items.map((e) => (
              <li key={e.id} className="flex items-center gap-3 px-4 py-3">
                <Badge variant="muted" className="w-20 justify-center">
                  {HISTORY_KIND_LABEL[e.kind]}
                </Badge>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{e.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {e.subtitle}
                    {e.meta ? ` · ${e.meta}` : ""} · {formatWhen(e.at)}
                  </p>
                </div>
                {e.amount != null ? <span className="text-sm font-semibold">{formatMoney(e.amount)}</span> : null}
                {e.status ? <StatusBadge status={e.status} /> : null}
              </li>
            ))}
          </ul>
        )}
      </div>
      <Pager page={page} pageSize={LIMIT} total={list.total} onPage={setPage} loading={list.loading} />
    </div>
  );
}
