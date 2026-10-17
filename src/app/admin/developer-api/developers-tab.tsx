"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Ban, CheckCircle2, Code2, FlaskConical, KeyRound, Radio, ShieldOff, Users } from "lucide-react";
import { EmptyState, formatDate } from "@/components/app-ui";
import { Chips, ConfirmDialog, Pager, SearchBox, StatCard, TableSkeleton, adminFetch, errMsg, useAdminList, useAdminQuery, useDebounced } from "@/components/admin/kit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserAvatar } from "@/components/user-avatar";
import { HttpStatus, Latency, MethodBadge, SectionLabel, timeAgo } from "./shared";

type Credential = { id: string; keyPrefix: string; mode: string };
type Developer = {
  id: string;
  username: string;
  email: string;
  name: string | null;
  role: string;
  apiEnabled: boolean;
  banned: boolean;
  credentials: Credential[];
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
  const [selected, setSelected] = useState<Developer | null>(null);
  const live = selected ? (list.items.find((d) => d.id === selected.id) ?? selected) : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-3 sm:p-4 lg:flex-row lg:items-center lg:justify-between">
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
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead>Developer</TableHead>
                <TableHead className="hidden sm:table-cell">Role</TableHead>
                <TableHead className="hidden md:table-cell">Keys</TableHead>
                <TableHead className="hidden lg:table-cell">Last used</TableHead>
                <TableHead>API access</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.items.map((d) => (
                <TableRow key={d.id} className="cursor-pointer" onClick={() => setSelected(d)}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <UserAvatar seed={d.username} className="size-9 shrink-0" />
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 text-sm font-medium">
                          @{d.username}
                          {d.banned ? <Badge variant="destructive">Banned</Badge> : null}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">{d.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant="muted" shape="pill" className="capitalize">{d.role.toLowerCase()}</Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {d.credentials.length === 0 ? (
                      <span className="text-xs text-muted-foreground">No active key</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {d.credentials.slice(0, 2).map((c) => (
                          <Badge key={c.id} variant={c.mode === "SANDBOX" ? "warning" : "outline"} className="font-mono">{c.keyPrefix}</Badge>
                        ))}
                        {d.credentials.length > 2 ? <Badge variant="muted">+{d.credentials.length - 2}</Badge> : null}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="hidden whitespace-nowrap text-xs text-muted-foreground lg:table-cell">{timeAgo(d.lastUsedAt)}</TableCell>
                  <TableCell>
                    {d.apiEnabled ? (
                      <Badge variant="success" shape="pill"><CheckCircle2 /> Enabled</Badge>
                    ) : (
                      <Badge variant="destructive" shape="pill"><Ban /> Disabled</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
      <Pager page={page} pageSize={20} total={list.total} onPage={setPage} loading={list.loading} />

      <DeveloperSheet dev={live} onClose={() => setSelected(null)} onChanged={list.reload} />
    </div>
  );
}

type KeyRow = { id: string; name: string; keyPrefix: string; mode: "LIVE" | "SANDBOX"; status: "ACTIVE" | "REVOKED"; lastUsedAt: string | null; createdAt: string };
type UsageRow = { id: string; method: string; path: string; statusCode: number; durationMs: number | null; createdAt: string };

function DeveloperSheet({ dev, onClose, onChanged }: { dev: Developer | null; onClose: () => void; onChanged: () => void }) {
  const [toggle, setToggle] = useState(false);
  const [revoke, setRevoke] = useState<KeyRow | null>(null);
  const keys = useAdminQuery<{ keys: KeyRow[] }>(dev ? `/api/admin/seller-api/keys?userId=${dev.id}&limit=50` : null);
  const usage = useAdminQuery<{ items: UsageRow[]; total: number }>(dev ? `/api/admin/seller-api/usage?userId=${dev.id}&limit=8` : null);

  return (
    <Sheet open={!!dev} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full gap-0 overflow-y-auto sm:max-w-xl">
        {dev ? (
          <>
            <SheetHeader className="border-b bg-gradient-to-br from-primary/10 via-transparent to-transparent p-5 pr-12">
              <div className="flex items-center gap-3">
                <UserAvatar seed={dev.username} className="size-12 shrink-0" />
                <div className="min-w-0">
                  <SheetTitle className="truncate text-lg">@{dev.username}</SheetTitle>
                  <SheetDescription className="truncate">{dev.email}</SheetDescription>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Badge variant="muted" shape="pill" className="capitalize">{dev.role.toLowerCase()}</Badge>
                {dev.apiEnabled ? <Badge variant="success" shape="pill"><CheckCircle2 /> API enabled</Badge> : <Badge variant="destructive" shape="pill"><Ban /> API disabled</Badge>}
                {dev.banned ? <Badge variant="destructive" shape="pill">Banned</Badge> : null}
              </div>
            </SheetHeader>

            <div className="grid gap-6 p-5">
              <div className="grid grid-cols-2 gap-3">
                <StatCard icon={KeyRound} label="Active keys" value={dev.credentials.length} />
                <StatCard icon={Code2} label="Requests logged" value={usage.data ? usage.data.total : "—"} hint={`Last used ${timeAgo(dev.lastUsedAt)}`} />
              </div>

              <section className="space-y-2.5">
                <SectionLabel>API keys</SectionLabel>
                {!keys.data ? (
                  <TableSkeleton rows={2} />
                ) : keys.data.keys.length === 0 ? (
                  <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">No keys created yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {keys.data.keys.map((k) => (
                      <li key={k.id} className="flex items-center gap-3 rounded-xl border p-3">
                        <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${k.mode === "SANDBOX" ? "bg-warning/15 text-warning" : "bg-primary/10 text-primary"}`}>
                          {k.mode === "SANDBOX" ? <FlaskConical className="size-4" /> : <Radio className="size-4" />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{k.name}</p>
                          <p className="font-mono text-xs text-muted-foreground">{k.keyPrefix}… · used {timeAgo(k.lastUsedAt)}</p>
                        </div>
                        {k.status === "ACTIVE" ? (
                          <Button variant="ghost" size="icon-sm" aria-label="Revoke key" className="text-destructive hover:text-destructive" onClick={() => setRevoke(k)}>
                            <ShieldOff />
                          </Button>
                        ) : (
                          <Badge variant="muted">Revoked</Badge>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="space-y-2.5">
                <SectionLabel>Latest requests</SectionLabel>
                {!usage.data ? (
                  <TableSkeleton rows={3} />
                ) : usage.data.items.length === 0 ? (
                  <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">No requests yet.</p>
                ) : (
                  <ul className="divide-y rounded-xl border">
                    {usage.data.items.map((r) => (
                      <li key={r.id} className="flex items-center gap-2 px-3 py-2">
                        <HttpStatus code={r.statusCode} />
                        <MethodBadge method={r.method} />
                        <span className="min-w-0 flex-1 truncate font-mono text-xs" title={formatDate(r.createdAt, true)}>{r.path}</span>
                        <Latency ms={r.durationMs} />
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <Button variant={dev.apiEnabled ? "destructive" : "default"} onClick={() => setToggle(true)}>
                {dev.apiEnabled ? <Ban /> : <CheckCircle2 />} {dev.apiEnabled ? "Disable API access" : "Enable API access"}
              </Button>
            </div>

            <ConfirmDialog
              open={toggle}
              onOpenChange={setToggle}
              title={dev.apiEnabled ? `Disable API for @${dev.username}?` : `Enable API for @${dev.username}?`}
              description={dev.apiEnabled ? "All their keys stop working immediately." : "Their existing keys start working again."}
              confirmLabel={dev.apiEnabled ? "Disable" : "Enable"}
              destructive={dev.apiEnabled}
              onConfirm={async () => {
                try {
                  await adminFetch(`/api/admin/users/${dev.id}`, { method: "PATCH", json: { apiEnabled: !dev.apiEnabled } });
                  toast.success(dev.apiEnabled ? "API disabled." : "API enabled.");
                  onChanged();
                } catch (e) {
                  toast.error(errMsg(e));
                }
              }}
            />
            <ConfirmDialog
              open={!!revoke}
              onOpenChange={(o) => !o && setRevoke(null)}
              title={`Revoke ${revoke?.name ?? "key"}?`}
              description={`${revoke?.keyPrefix}… stops working immediately. This can't be undone.`}
              confirmLabel="Revoke"
              destructive
              onConfirm={async () => {
                try {
                  await adminFetch(`/api/admin/seller-api/keys/${revoke!.id}`, { method: "POST", json: { action: "revoke" } });
                  toast.success("Key revoked.");
                  keys.reload();
                  onChanged();
                } catch (e) {
                  toast.error(errMsg(e));
                }
              }}
            />
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
