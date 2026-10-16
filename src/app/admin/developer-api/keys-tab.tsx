"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Copy, FlaskConical, KeyRound, MoreHorizontal, Radio, ShieldOff } from "lucide-react";
import { EmptyState, StatusBadge, formatDate } from "@/components/app-ui";
import { Chips, ConfirmDialog, Pager, SearchBox, TableSkeleton, adminFetch, errMsg, useAdminList, useDebounced } from "@/components/admin/kit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type ApiKey = {
  id: string;
  name: string;
  keyPrefix: string;
  mode: "LIVE" | "SANDBOX";
  status: "ACTIVE" | "REVOKED";
  rateLimitRpm: number | null;
  lastUsedAt: string | null;
  createdAt: string;
  user: { username: string; email: string };
};

const STATUS = [
  { v: "", label: "All" },
  { v: "ACTIVE", label: "Active" },
  { v: "REVOKED", label: "Revoked" },
];
const MODE = [
  { v: "", label: "Any mode" },
  { v: "LIVE", label: "Live" },
  { v: "SANDBOX", label: "Sandbox" },
];

export function KeysTab() {
  const [status, setStatus] = useState("");
  const [mode, setMode] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const dq = useDebounced(q);
  const list = useAdminList<ApiKey>("/api/admin/seller-api/keys", "keys", { page, limit: 20, q: dq, status, mode });
  const [revoke, setRevoke] = useState<ApiKey | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          <Chips value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={STATUS} />
          <Chips value={mode} onChange={(v) => { setMode(v); setPage(1); }} options={MODE} />
        </div>
        <SearchBox value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Key name, prefix or user…" />
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        {list.loading && list.items.length === 0 ? (
          <TableSkeleton />
        ) : list.items.length === 0 ? (
          <div className="p-6">
            <EmptyState icon={KeyRound} title="No API keys" hint="Try changing the filters." />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Key</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last used</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.items.map((k) => (
                <TableRow key={k.id}>
                  <TableCell>
                    <p className="text-sm font-medium">{k.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">{k.keyPrefix}…</p>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm">@{k.user.username}</p>
                    <p className="text-xs text-muted-foreground">{k.user.email}</p>
                  </TableCell>
                  <TableCell>
                    {k.mode === "SANDBOX" ? (
                      <Badge variant="warning" shape="pill">
                        <FlaskConical /> Sandbox
                      </Badge>
                    ) : (
                      <Badge variant="default" shape="pill">
                        <Radio /> Live
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={k.status} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{k.lastUsedAt ? formatDate(k.lastUsedAt, true) : "Never"}</TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{formatDate(k.createdAt)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label="Actions">
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onSelect={() => {
                            void navigator.clipboard.writeText(k.keyPrefix);
                            toast.success("Prefix copied.");
                          }}
                        >
                          <Copy /> Copy prefix
                        </DropdownMenuItem>
                        {k.status === "ACTIVE" ? (
                          <DropdownMenuItem onSelect={() => setRevoke(k)} className="text-destructive">
                            <ShieldOff /> Revoke key
                          </DropdownMenuItem>
                        ) : null}
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
        open={!!revoke}
        onOpenChange={(o) => !o && setRevoke(null)}
        title={`Revoke ${revoke?.name ?? "key"}?`}
        description={`${revoke?.keyPrefix}… owned by @${revoke?.user.username} stops working immediately. This can't be undone.`}
        confirmLabel="Revoke"
        destructive
        onConfirm={async () => {
          try {
            await adminFetch(`/api/admin/seller-api/keys/${revoke!.id}`, { method: "POST", json: { action: "revoke" } });
            toast.success("Key revoked.");
            list.reload();
          } catch (e) {
            toast.error(errMsg(e));
          }
        }}
      />
    </div>
  );
}
