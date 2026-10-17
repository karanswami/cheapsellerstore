"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Copy, FlaskConical, Gauge, KeyRound, MoreHorizontal, Radio, ShieldOff } from "lucide-react";
import { EmptyState, StatusBadge, formatDate } from "@/components/app-ui";
import { Chips, ConfirmDialog, Field, Pager, SearchBox, SubmitButton, TableSkeleton, adminFetch, errMsg, useAdminList, useAdminQuery, useDebounced } from "@/components/admin/kit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { timeAgo } from "./shared";

type ApiKey = {
  id: string;
  name: string;
  keyPrefix: string;
  mode: "LIVE" | "SANDBOX";
  status: "ACTIVE" | "REVOKED";
  rateLimitRpm: number | null;
  expiresAt: string | null;
  ipAllowlist: string[];
  lastUsedAt: string | null;
  createdAt: string;
  user: { username: string; email: string };
};

export function KeysTab() {
  const [status, setStatus] = useState("");
  const [mode, setMode] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const dq = useDebounced(q);
  const params = { page, limit: 20, q: dq, status, mode };
  const list = useAdminList<ApiKey>("/api/admin/seller-api/keys", "keys", params);
  const countsQ = useAdminQuery<{ counts: { active: number; revoked: number; sandbox: number } }>("/api/admin/seller-api/keys?limit=1");
  const counts = countsQ.data?.counts;
  const reloadAll = () => {
    list.reload();
    countsQ.reload();
  };
  const [revoke, setRevoke] = useState<ApiKey | null>(null);
  const [limitFor, setLimitFor] = useState<ApiKey | null>(null);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-xl border bg-card p-3 sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Chips
            value={status}
            onChange={(v) => { setStatus(v); setPage(1); }}
            options={[
              { v: "", label: "All", count: counts ? counts.active + counts.revoked : undefined },
              { v: "ACTIVE", label: "Active", count: counts?.active },
              { v: "REVOKED", label: "Revoked", count: counts?.revoked },
            ]}
          />
          <SearchBox value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Key name, prefix or user…" />
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t pt-3">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Mode</span>
          <Chips
            value={mode}
            onChange={(v) => { setMode(v); setPage(1); }}
            options={[
              { v: "", label: "Any" },
              { v: "LIVE", label: "Live" },
              { v: "SANDBOX", label: "Sandbox", count: counts?.sandbox },
            ]}
          />
        </div>
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
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead>Key</TableHead>
                <TableHead className="hidden md:table-cell">Owner</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead className="hidden sm:table-cell">Status</TableHead>
                <TableHead className="hidden lg:table-cell">Limit</TableHead>
                <TableHead className="hidden lg:table-cell">Last used</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.items.map((k) => (
                <TableRow key={k.id} className={k.status === "REVOKED" ? "opacity-60" : undefined}>
                  <TableCell>
                    <p className="text-sm font-medium">{k.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">{k.keyPrefix}…</p>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <p className="text-sm">@{k.user.username}</p>
                    <p className="text-xs text-muted-foreground">{k.user.email}</p>
                  </TableCell>
                  <TableCell>
                    {k.mode === "SANDBOX" ? (
                      <Badge variant="warning" shape="pill"><FlaskConical /> Sandbox</Badge>
                    ) : (
                      <Badge variant="default" shape="pill"><Radio /> Live</Badge>
                    )}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell"><StatusBadge status={k.status} /></TableCell>
                  <TableCell className="hidden text-xs lg:table-cell">
                    {k.rateLimitRpm ? <span className="font-medium">{k.rateLimitRpm}/min</span> : <span className="text-muted-foreground">Default</span>}
                  </TableCell>
                  <TableCell className="hidden whitespace-nowrap text-xs text-muted-foreground lg:table-cell" title={k.lastUsedAt ? formatDate(k.lastUsedAt, true) : undefined}>
                    {timeAgo(k.lastUsedAt)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label="Actions"><MoreHorizontal /></Button>
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
                          <>
                            <DropdownMenuItem onSelect={() => setLimitFor(k)}><Gauge /> Set rate limit</DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => setRevoke(k)} className="text-destructive"><ShieldOff /> Revoke key</DropdownMenuItem>
                          </>
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

      <LimitDialog key={limitFor?.id ?? "none"} target={limitFor} onClose={() => setLimitFor(null)} onSaved={reloadAll} />
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
            reloadAll();
          } catch (e) {
            toast.error(errMsg(e));
          }
        }}
      />
    </div>
  );
}

function LimitDialog({ target, onClose, onSaved }: { target: ApiKey | null; onClose: () => void; onSaved: () => void }) {
  const [value, setValue] = useState(target?.rateLimitRpm ? String(target.rateLimitRpm) : "");
  const [busy, setBusy] = useState(false);

  async function save(next: number | null) {
    setBusy(true);
    try {
      await adminFetch(`/api/admin/seller-api/keys/${target!.id}`, { method: "POST", json: { action: "setLimit", rateLimitRpm: next } });
      toast.success(next ? `Limit set to ${next}/min.` : "Using the platform default.");
      onSaved();
      onClose();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  const n = Number(value);
  const valid = value === "" || (Number.isFinite(n) && n >= 1 && n <= 300);

  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rate limit for {target?.name}</DialogTitle>
          <DialogDescription>
            {target?.keyPrefix}… · @{target?.user.username}. Leave empty to follow the platform default.
          </DialogDescription>
        </DialogHeader>
        <Field label="Requests per minute" hint="1 – 300">
          <Input type="number" min="1" max="300" placeholder="Platform default" value={value} onChange={(e) => setValue(e.target.value)} />
        </Field>
        <div className="flex flex-wrap gap-1.5">
          {[30, 60, 120, 300].map((p) => (
            <Button key={p} type="button" size="sm" variant="outline" onClick={() => setValue(String(p))}>{p}/min</Button>
          ))}
          <Button type="button" size="sm" variant="ghost" onClick={() => setValue("")}>Default</Button>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
          <SubmitButton busy={busy} disabled={!valid} onClick={() => save(value === "" ? null : Math.round(n))}>Save limit</SubmitButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
