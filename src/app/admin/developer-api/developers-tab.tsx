"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Ban, CheckCircle2, MoreHorizontal, Users } from "lucide-react";
import { EmptyState, formatDate } from "@/components/app-ui";
import { Chips, ConfirmDialog, Pager, SearchBox, TableSkeleton, adminFetch, errMsg, useAdminList, useDebounced } from "@/components/admin/kit";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Developer = {
  id: string;
  username: string;
  email: string;
  role: string;
  apiEnabled: boolean;
  banned: boolean;
  credentials: { id: string; keyPrefix: string; mode: string }[];
  lastUsedAt: string | null;
};

const FILTERS = [
  { v: "all", label: "All" },
  { v: "active", label: "Has active key" },
  { v: "none", label: "No key" },
  { v: "disabled", label: "API disabled" },
];

export function DevelopersTab() {
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const dq = useDebounced(q);
  const list = useAdminList<Developer>("/api/admin/seller-api/developers", "items", { page, limit: 20, status, q: dq });
  const [target, setTarget] = useState<Developer | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Chips value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={FILTERS} />
        <SearchBox value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Username or email…" />
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        {list.loading && list.items.length === 0 ? (
          <TableSkeleton />
        ) : list.items.length === 0 ? (
          <div className="p-6">
            <EmptyState icon={Users} title="No developers found" hint="Users appear here once they create an API key." />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Developer</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Keys</TableHead>
                <TableHead>Last used</TableHead>
                <TableHead>API access</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.items.map((d) => (
                <TableRow key={d.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="size-9">
                        <AvatarFallback className="text-xs font-semibold uppercase">{d.username.slice(0, 2)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 text-sm font-medium">
                          @{d.username}
                          {d.banned ? <Badge variant="destructive">Banned</Badge> : null}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">{d.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="muted" shape="pill" className="capitalize">
                      {d.role.toLowerCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {d.credentials.length === 0 ? (
                      <span className="text-xs text-muted-foreground">No active key</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {d.credentials.map((c) => (
                          <Badge key={c.id} variant={c.mode === "SANDBOX" ? "warning" : "outline"} className="font-mono">
                            {c.keyPrefix}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{d.lastUsedAt ? formatDate(d.lastUsedAt, true) : "Never"}</TableCell>
                  <TableCell>
                    {d.apiEnabled ? (
                      <Badge variant="success" shape="pill">
                        <CheckCircle2 /> Enabled
                      </Badge>
                    ) : (
                      <Badge variant="destructive" shape="pill">
                        <Ban /> Disabled
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label="Actions">
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => setTarget(d)} className={d.apiEnabled ? "text-destructive" : undefined}>
                          {d.apiEnabled ? <Ban /> : <CheckCircle2 />} {d.apiEnabled ? "Disable API access" : "Enable API access"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
      <Pager page={page} pageSize={20} total={list.total} onPage={setPage} loading={list.loading} />

      <ConfirmDialog
        open={!!target}
        onOpenChange={(o) => !o && setTarget(null)}
        title={target?.apiEnabled ? `Disable API for @${target?.username}?` : `Enable API for @${target?.username}?`}
        description={target?.apiEnabled ? "All their keys stop working immediately." : "Their existing keys start working again."}
        confirmLabel={target?.apiEnabled ? "Disable" : "Enable"}
        destructive={target?.apiEnabled}
        onConfirm={async () => {
          try {
            await adminFetch(`/api/admin/users/${target!.id}`, { method: "PATCH", json: { apiEnabled: !target!.apiEnabled } });
            toast.success(target!.apiEnabled ? "API disabled." : "API enabled.");
            list.reload();
          } catch (e) {
            toast.error(errMsg(e));
          }
        }}
      />
    </div>
  );
}
