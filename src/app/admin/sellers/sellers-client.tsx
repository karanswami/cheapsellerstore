"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AtSign,
  Ban,
  BadgeCheck,
  BellRing,
  Check,
  ChevronRight,
  Code2,
  Landmark,
  ShieldCheck,
  ShieldOff,
  UserCheck,
  Share2,
  Globe,
  Handshake,
  Layers,
  Link2,
  MapPin,
  Network,
  Phone,
  Send,
  Settings2,
  Store,
  UserPlus,
  Users,
  Wallet,
  X,
  Play,
  type LucideIcon,
} from "lucide-react";
import { PageHeader, EmptyState, StatusBadge, formatDate } from "@/components/app-ui";
import { Chips, ConfirmDialog, Field, Pager, SearchBox, StatCard, SubmitButton, TableSkeleton, adminFetch, errMsg, useAdminQuery } from "@/components/admin/kit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "@/components/user-avatar";
import { formatMoney } from "@/lib/currencies";
import { cn } from "@/lib/utils";
import { AccessChips, RoleBadge, StatusChip, UserManage, hasResellerSystem, type UserRow } from "../users/users-client";
import { SellersSection } from "../settings/section-sellers";
import type { AdminSettings } from "../settings/settings-kit";

export function AdminSellersClient() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const apps = useAdminQuery<{ requests: Application[] }>("/api/admin/resellers");
  const pending = (apps.data?.requests ?? []).filter((r) => r.status === "PENDING").length;
  // Land on Applications whenever something is waiting for review; until the admin picks a tab themselves.
  const [picked, setPicked] = useState<string | null>(null);
  const tab = picked ?? (pending > 0 ? "applications" : "accounts");

  return (
    <>
      <PageHeader
        title="Sellers"
        subtitle="Accounts, applications and bulk actions."
        actions={
          <Button variant="secondary" onClick={() => setSettingsOpen(true)}>
            <Settings2 /> Seller / Reseller settings
          </Button>
        }
      />
      <Tabs value={tab} onValueChange={setPicked} className="space-y-4">
        <TabsList>
          <TabsTrigger value="accounts">
            <Users className="size-4" /> Accounts
          </TabsTrigger>
          <TabsTrigger value="applications">
            <Store className="size-4" /> Applications
            {pending > 0 ? (
              <span className="rounded-full bg-warning/20 px-1.5 text-[10px] font-semibold tabular-nums text-warning">{pending}</span>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="bulk">
            <Layers className="size-4" /> Bulk actions
          </TabsTrigger>
        </TabsList>
        <TabsContent value="accounts">
          <Accounts />
        </TabsContent>
        <TabsContent value="applications">
          <Applications query={apps} />
        </TabsContent>
        <TabsContent value="bulk">
          <BulkActions />
        </TabsContent>
      </Tabs>
      <SettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
}

/* ───────────────────────────── Settings sheet ───────────────────────────── */

function SettingsSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { data, error } = useAdminQuery<AdminSettings>(open ? "/api/admin/settings" : null);
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 overflow-y-auto sm:max-w-2xl">
        <SheetHeader className="border-b bg-gradient-to-br from-primary/10 via-transparent to-transparent p-5 pr-12">
          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
              <Settings2 className="size-5" />
            </span>
            <div className="min-w-0">
              <SheetTitle className="text-lg">Seller / Reseller settings</SheetTitle>
              <SheetDescription>Applications, the Become a Seller page, form fields and account rules.</SheetDescription>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Badge variant="default" shape="pill">
              <Store /> Sellers
            </Badge>
            <Badge variant="warning" shape="pill">
              <Handshake /> Resellers
            </Badge>
            <a href="/admin/developer-api" className="inline-flex">
              <Badge variant="outline" shape="pill" className="hover:bg-accent">
                <Code2 /> Developer API <Link2 />
              </Badge>
            </a>
          </div>
        </SheetHeader>
        <div className="grid gap-5 p-4 sm:p-5">
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {!data ? <TableSkeleton rows={6} /> : <SellersSection s={data} />}
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ───────────────────────────── Accounts ───────────────────────────── */

type AccFilter = "ALL" | "SELLER" | "RESELLER";
type AccFlag = "ANY" | "NO_RESELLER_SYSTEM" | "API_OFF" | "INDEPENDENT" | "BANNED";
const ACC_LIMIT = 15;

function Accounts() {
  const { data, loading, reload } = useAdminQuery<{ users: UserRow[] }>("/api/admin/users");
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<AccFilter>("ALL");
  const [flag, setFlag] = useState<AccFlag>("ANY");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const all = useMemo(() => data?.users ?? [], [data]);
  const accounts = useMemo(() => all.filter((u) => u.role === "SELLER" || u.role === "RESELLER"), [all]);
  const stats = useMemo(() => {
    const sellers = accounts.filter((u) => u.role === "SELLER");
    const resellers = accounts.filter((u) => u.role === "RESELLER");
    return {
      sellers: sellers.length,
      resellers: resellers.length,
      independent: resellers.filter((u) => u.depositsEnabled).length,
      noSystem: sellers.filter((u) => !hasResellerSystem(u)).length,
      apiOff: accounts.filter((u) => !u.apiEnabled).length,
      banned: accounts.filter((u) => u.banned).length,
      float: accounts.reduce((n, u) => n + u.walletBalance, 0),
    };
  }, [accounts]);
  const childCount = useMemo(() => {
    const m = new Map<string, number>();
    for (const u of accounts) if (u.role === "RESELLER" && u.referredBy?.id) m.set(u.referredBy.id, (m.get(u.referredBy.id) ?? 0) + 1);
    return m;
  }, [accounts]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return accounts.filter(
      (u) =>
        (kind === "ALL" || u.role === kind) &&
        (flag === "ANY" ||
          (flag === "NO_RESELLER_SYSTEM" && u.role === "SELLER" && !hasResellerSystem(u)) ||
          (flag === "API_OFF" && !u.apiEnabled) ||
          (flag === "INDEPENDENT" && u.role === "RESELLER" && u.depositsEnabled) ||
          (flag === "BANNED" && u.banned)) &&
        (!s || `${u.name} ${u.username} ${u.email} ${u.referredBy?.username ?? ""}`.toLowerCase().includes(s)),
    );
  }, [accounts, q, kind, flag]);
  const pageRows = filtered.slice((page - 1) * ACC_LIMIT, page * ACC_LIMIT);
  const selected = all.find((u) => u.id === selectedId) ?? null;
  const team = selected?.role === "SELLER" ? accounts.filter((u) => u.role === "RESELLER" && u.referredBy?.id === selected.id) : undefined;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Sellers" value={stats.sellers} hint={`${stats.noSystem} without reseller system`} icon={Store} />
        <StatCard label="Resellers" value={stats.resellers} hint={`${stats.independent} independent`} icon={Handshake} tone="warning" />
        <StatCard label="Wallet float" value={formatMoney(stats.float)} hint="Sellers + resellers" icon={Wallet} tone="success" />
        <StatCard label="API off / banned" value={`${stats.apiOff} / ${stats.banned}`} hint="Across all accounts" icon={Ban} tone={stats.banned ? "destructive" : "default"} />
      </div>

      <div className="grid gap-3 rounded-xl border bg-card p-3 sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Chips
            value={kind}
            onChange={(v) => {
              setKind(v);
              setPage(1);
            }}
            options={[
              { v: "ALL", label: "All", count: accounts.length },
              { v: "SELLER", label: "Sellers", count: stats.sellers },
              { v: "RESELLER", label: "Resellers", count: stats.resellers },
            ]}
          />
          <SearchBox
            value={q}
            onChange={(v) => {
              setQ(v);
              setPage(1);
            }}
            placeholder="Name, username, email, seller…"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t pt-3">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Settings</span>
          <Chips
            value={flag}
            onChange={(v) => {
              setFlag(v);
              setPage(1);
            }}
            options={[
              { v: "ANY", label: "Any" },
              { v: "NO_RESELLER_SYSTEM", label: "Reseller system off", count: stats.noSystem },
              { v: "API_OFF", label: "API off", count: stats.apiOff },
              { v: "INDEPENDENT", label: "Independent", count: stats.independent },
              { v: "BANNED", label: "Banned", count: stats.banned },
            ]}
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        {loading && !data ? (
          <TableSkeleton />
        ) : pageRows.length === 0 ? (
          <div className="p-6">
            <EmptyState icon={Store} title="No accounts found" hint="Try another filter or search." />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-full">Account</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="hidden lg:table-cell">Settings</TableHead>
                <TableHead className="hidden text-center md:table-cell">Team</TableHead>
                <TableHead className="text-right">Wallet</TableHead>
                <TableHead className="hidden sm:table-cell">Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((u) => (
                <TableRow key={u.id} className={cn("group cursor-pointer", u.banned && "bg-destructive/[0.04]")} onClick={() => setSelectedId(u.id)}>
                  <TableCell className="w-full max-w-0">
                    <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
                      <UserAvatar seed={u.username} className={cn("size-9 shrink-0", u.banned && "opacity-50 grayscale")} />
                      <div className="min-w-0">
                        <p className="flex min-w-0 items-center gap-1.5 text-sm font-semibold">
                          <span className="hidden truncate sm:inline">{u.name}</span>
                          <span className="truncate sm:font-normal sm:text-muted-foreground">@{u.username}</span>
                        </p>
                        <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="grid gap-1">
                      <RoleBadge role={u.role} />
                      {u.role === "RESELLER" && u.referredBy ? <span className="hidden text-[11px] text-muted-foreground sm:block">of @{u.referredBy.username}</span> : null}
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <AccessChips user={u} />
                  </TableCell>
                  <TableCell className="hidden text-center md:table-cell">
                    {u.role === "SELLER" ? (
                      <Badge variant={childCount.get(u.id) ? "default" : "muted"} shape="pill">
                        <Network /> {childCount.get(u.id) ?? 0}
                      </Badge>
                    ) : u.depositsEnabled ? (
                      <Badge variant="highlight" shape="pill">
                        Independent
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className={cn("text-right font-semibold tabular-nums", u.walletBalance === 0 && "text-muted-foreground")}>{formatMoney(u.walletBalance)}</TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <StatusChip user={u} />
                  </TableCell>
                  <TableCell>
                    <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
      <Pager page={page} pageSize={ACC_LIMIT} total={filtered.length} onPage={setPage} />

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelectedId(null)}>
        <DialogContent className="max-w-xl grid-cols-[minmax(0,1fr)] gap-0 overflow-x-hidden p-0">
          {selected ? (
            <UserManage
              key={selected.id}
              user={selected}
              team={team}
              onOpenUser={setSelectedId}
              onChanged={reload}
              onDeleted={() => {
                setSelectedId(null);
                reload();
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ───────────────────────────── Applications ───────────────────────────── */

type Application = {
  id: string;
  status: string;
  fullName: string;
  phone: string;
  country: string;
  facebookUrl: string;
  telegram: string;
  youtubeUrl: string | null;
  telegramChannelUrl: string | null;
  websiteUrl: string | null;
  followerCount: string;
  experience: string | null;
  sellingPlatform: string;
  reason: string;
  adminNote: string | null;
  createdAt: string;
  user: { id: string; name: string; email: string; username: string; role: string; walletBalance: number; banned: boolean };
};

const APP_LIMIT = 12;

function Applications({ query }: { query: ReturnType<typeof useAdminQuery<{ requests: Application[] }>> }) {
  const { data, loading, reload } = query;
  const [status, setStatus] = useState("PENDING");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<Application | null>(null);
  const [creating, setCreating] = useState(false);
  const all = useMemo(() => data?.requests ?? [], [data]);
  const count = (s: string) => all.filter((r) => r.status === s).length;
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return all.filter((r) => (status === "ALL" || r.status === status) && (!s || `${r.fullName} ${r.user.username} ${r.user.email} ${r.country}`.toLowerCase().includes(s)));
  }, [all, status, q]);
  const pageRows = rows.slice((page - 1) * APP_LIMIT, page * APP_LIMIT);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-xl border bg-card p-3 sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Chips
            value={status}
            onChange={(v) => {
              setStatus(v);
              setPage(1);
            }}
            options={[
              { v: "PENDING", label: "Pending", count: count("PENDING") },
              { v: "APPROVED", label: "Approved", count: count("APPROVED") },
              { v: "REJECTED", label: "Rejected", count: count("REJECTED") },
              { v: "ALL", label: "All", count: all.length },
            ]}
          />
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <SearchBox
              value={q}
              onChange={(v) => {
                setQ(v);
                setPage(1);
              }}
              placeholder="Name, username, country…"
            />
            <Button onClick={() => setCreating(true)}>
              <UserPlus /> Create reseller
            </Button>
          </div>
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border bg-card">
        {loading && !data ? (
          <TableSkeleton />
        ) : pageRows.length === 0 ? (
          <div className="p-6">
            <EmptyState icon={Store} title="No applications" hint="Nothing in this view." />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-full">Applicant</TableHead>
                <TableHead className="hidden sm:table-cell">Country</TableHead>
                <TableHead className="hidden md:table-cell">Platform</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Applied</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((r) => (
                <TableRow key={r.id} className="group cursor-pointer" onClick={() => setOpen(r)}>
                  <TableCell className="w-full max-w-0">
                    <div className="flex min-w-0 items-center gap-3">
                      <UserAvatar seed={r.user.username} className="size-9 shrink-0" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{r.fullName}</p>
                        <p className="truncate text-xs text-muted-foreground">@{r.user.username}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant="muted" shape="pill">
                      <MapPin /> {r.country}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden max-w-40 md:table-cell">
                    <Badge variant="outline" shape="pill" className="max-w-full truncate">
                      {r.sellingPlatform}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={r.status} />
                  </TableCell>
                  <TableCell className="hidden whitespace-nowrap text-xs text-muted-foreground md:table-cell">{formatDate(r.createdAt)}</TableCell>
                  <TableCell>
                    <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
      <Pager page={page} pageSize={APP_LIMIT} total={rows.length} onPage={setPage} />
      <ApplicationDialog
        app={open}
        onClose={() => setOpen(null)}
        onDone={() => {
          setOpen(null);
          reload();
        }}
      />
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          {creating ? (
            <CreateResellerForm
              onDone={() => {
                setCreating(false);
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ApplicationDialog({ app, onClose, onDone }: { app: Application | null; onClose: () => void; onDone: () => void }) {
  const [note, setNote] = useState("");
  const [confirm, setConfirm] = useState<"approve" | "reject" | null>(null);

  async function act(action: "approve" | "reject") {
    try {
      await adminFetch(`/api/admin/resellers/${app!.id}`, { method: "PATCH", json: { action, adminNote: note.trim() || undefined } });
      toast.success(action === "approve" ? "Seller approved." : "Application rejected.");
      setNote("");
      onDone();
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  const links: { icon: LucideIcon; label: string; href: string | null }[] = app
    ? [
        { icon: Share2, label: "Facebook", href: app.facebookUrl },
        { icon: Play, label: "YouTube", href: app.youtubeUrl },
        { icon: Send, label: "TG channel", href: app.telegramChannelUrl },
        { icon: Globe, label: "Website", href: app.websiteUrl },
      ]
    : [];

  return (
    <>
      <Dialog open={!!app} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-xl grid-cols-[minmax(0,1fr)] gap-0 overflow-x-hidden p-0">
          {app ? (
            <>
              <div className="border-b bg-gradient-to-br from-primary/10 via-transparent to-transparent px-5 pb-4 pt-4 sm:px-6">
                <div className="flex items-start gap-4 pr-6">
                  <UserAvatar seed={app.user.username} className="size-12 shrink-0 rounded-xl ring-2 ring-background" />
                  <div className="min-w-0 flex-1">
                    <DialogTitle className="truncate text-xl">{app.fullName}</DialogTitle>
                    <DialogDescription className="truncate">
                      @{app.user.username} · {app.user.email}
                    </DialogDescription>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <StatusBadge status={app.status} />
                      <RoleBadge role={app.user.role as UserRow["role"]} />
                      <Badge variant="outline" shape="pill">
                        <Wallet /> {formatMoney(app.user.walletBalance)}
                      </Badge>
                      {app.user.banned ? (
                        <Badge variant="destructive" shape="pill">
                          <Ban /> Banned
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid gap-4 px-5 py-4 sm:px-6">
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="muted" shape="pill">
                    <MapPin /> {app.country}
                  </Badge>
                  <Badge variant="muted" shape="pill">
                    <Phone /> {app.phone}
                  </Badge>
                  <Badge variant="muted" shape="pill">
                    <AtSign /> {app.telegram}
                  </Badge>
                  <Badge variant="muted" shape="pill">
                    <Users /> {app.followerCount} followers
                  </Badge>
                  <Badge variant="default" shape="pill">
                    <Store /> {app.sellingPlatform}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {links.map((l) =>
                    l.href ? (
                      <a
                        key={l.label}
                        href={l.href}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
                      >
                        <l.icon className="size-4 text-primary" /> {l.label} <Link2 className="ml-auto size-3.5 text-muted-foreground" />
                      </a>
                    ) : (
                      <div key={l.label} className="flex items-center gap-2 rounded-xl border border-dashed px-3 py-2 text-sm text-muted-foreground">
                        <l.icon className="size-4" /> {l.label} <span className="ml-auto text-xs">—</span>
                      </div>
                    ),
                  )}
                </div>
                {app.experience ? (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Experience</p>
                    <p className="mt-1 text-sm">{app.experience}</p>
                  </div>
                ) : null}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Why they want to sell</p>
                  <p className="mt-1 whitespace-pre-wrap rounded-xl bg-muted p-3 text-sm">{app.reason}</p>
                </div>
                {app.adminNote ? <p className="text-sm text-muted-foreground">Note: {app.adminNote}</p> : null}
                <Field label="Note to applicant (optional)">
                  <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={500} />
                </Field>
                <DialogFooter>
                  {app.status !== "REJECTED" ? (
                    <Button variant="destructive" onClick={() => setConfirm("reject")}>
                      <X /> {app.status === "APPROVED" ? "Revoke" : "Reject"}
                    </Button>
                  ) : null}
                  {app.status !== "APPROVED" ? (
                    <Button onClick={() => setConfirm("approve")}>
                      <Check /> Approve
                    </Button>
                  ) : null}
                </DialogFooter>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={confirm === "approve" ? "Approve this seller?" : "Reject this application?"}
        description={confirm === "approve" ? "The user's role becomes Seller." : "If they are a Seller they drop back to User and lose reseller permissions."}
        confirmLabel={confirm === "approve" ? "Approve" : "Reject"}
        destructive={confirm === "reject"}
        onConfirm={() => act(confirm!)}
      />
    </>
  );
}

function CreateResellerForm({ onDone }: { onDone: () => void }) {
  const [f, setF] = useState({ username: "", email: "", name: "", password: "", initialUsd: "10" });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  async function save() {
    setBusy(true);
    try {
      await adminFetch("/api/admin/resellers/create", {
        method: "POST",
        json: { username: f.username.trim(), email: f.email.trim(), name: f.name.trim() || undefined, password: f.password, initialUsd: Number(f.initialUsd) || 0 },
      });
      toast.success("Reseller created.");
      onDone();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Create reseller</DialogTitle>
        <DialogDescription>Creates an account attached to you and funds it from your wallet.</DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Username">
          <Input value={f.username} onChange={set("username")} />
        </Field>
        <Field label="Display name">
          <Input value={f.name} onChange={set("name")} />
        </Field>
        <Field label="Email" className="sm:col-span-2">
          <Input type="email" value={f.email} onChange={set("email")} />
        </Field>
        <Field label="Password">
          <Input type="password" value={f.password} onChange={set("password")} />
        </Field>
        <Field label="Initial funding (USD)">
          <Input type="number" min="0" step="0.01" value={f.initialUsd} onChange={set("initialUsd")} />
        </Field>
      </div>
      <DialogFooter>
        <SubmitButton busy={busy} onClick={save}>
          Create reseller
        </SubmitButton>
      </DialogFooter>
    </>
  );
}

/* ───────────────────────────── Bulk actions ───────────────────────────── */

type BulkStats = {
  totalMatching: number;
  activeCount: number;
  bannedCount: number;
  verifiedCount: number;
  canCreateCount: number;
  canManageCount: number;
  canFundCount: number;
  depositsEnabledCount: number;
  apiEnabledCount: number;
  totalWalletBalance: number;
};

type Kind = "none" | "bool" | "amount" | "ban" | "notify";
type Tone = "default" | "success" | "warning" | "destructive";
type BulkAction = { v: string; label: string; hint: string; icon: LucideIcon; kind: Kind; tone?: Tone };

const GROUPS: { title: string; hint: string; actions: BulkAction[] }[] = [
  {
    title: "Reseller system",
    hint: "Sellers only. Create, manage and fund resellers.",
    actions: [
      { v: "GRANT_ALL_CAPS", label: "Turn ON", hint: "Create + manage + fund, all at once.", icon: ShieldCheck, kind: "none", tone: "success" },
      { v: "REVOKE_ALL_CAPS", label: "Turn OFF", hint: "Remove every reseller permission.", icon: ShieldOff, kind: "none", tone: "warning" },
      { v: "SET_CAN_CREATE_RESELLERS", label: "Can create resellers", hint: "Set on or off.", icon: UserPlus, kind: "bool" },
      { v: "SET_CAN_MANAGE_RESELLERS", label: "Can manage resellers", hint: "Suspend and delete.", icon: UserCheck, kind: "bool" },
      { v: "SET_CAN_FUND_RESELLERS", label: "Can fund resellers", hint: "Send and reclaim balance.", icon: Network, kind: "bool" },
    ],
  },
  {
    title: "Access",
    hint: "Per-account switches.",
    actions: [
      { v: "SET_API_ENABLED", label: "Developer API", hint: "Allow API keys.", icon: Code2, kind: "bool" },
      { v: "SET_DEPOSITS_ENABLED", label: "Own deposit access", hint: "Self-deposit on or off.", icon: Landmark, kind: "bool" },
      { v: "SET_EMAIL_VERIFIED", label: "Email verified", hint: "Mark as confirmed.", icon: BadgeCheck, kind: "bool" },
    ],
  },
  {
    title: "Money and messages",
    hint: "Applies to every matching account.",
    actions: [
      { v: "WALLET_ADJUST", label: "Adjust wallets", hint: "Add or deduct USD from each.", icon: Wallet, kind: "amount", tone: "warning" },
      { v: "SEND_NOTIFICATION", label: "Send notification", hint: "In-app + push message.", icon: BellRing, kind: "notify" },
    ],
  },
  {
    title: "Moderation",
    hint: "Use with care.",
    actions: [
      { v: "MASS_BAN", label: "Ban all", hint: "Signs them out, blocks the API.", icon: Ban, kind: "ban", tone: "destructive" },
      { v: "MASS_UNBAN", label: "Unban all", hint: "Restore access.", icon: UserCheck, kind: "none", tone: "success" },
    ],
  },
];
const ACTIONS = GROUPS.flatMap((g) => g.actions);
const TONE_TILE: Record<Tone, string> = {
  default: "bg-primary/15 text-primary",
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
  destructive: "bg-destructive/15 text-destructive",
};
const AUDIENCES: { v: string; label: string; icon: LucideIcon }[] = [
  { v: "SELLERS", label: "Sellers", icon: Store },
  { v: "RESELLERS", label: "Resellers", icon: Handshake },
  { v: "ALL_SELLERS_AND_RESELLERS", label: "Both", icon: Users },
];

function BulkActions() {
  const [target, setTarget] = useState("SELLERS");
  const stats = useAdminQuery<{ stats: BulkStats }>(`/api/admin/sellers/bulk-action?target=${target}`);
  const [action, setAction] = useState("GRANT_ALL_CAPS");
  const [bool, setBool] = useState(true);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [banReason, setBanReason] = useState("");
  const [nTitle, setNTitle] = useState("");
  const [nMsg, setNMsg] = useState("");
  const [nUrl, setNUrl] = useState("");
  const [confirm, setConfirm] = useState(false);
  const def = ACTIONS.find((a) => a.v === action)!;
  const s = stats.data?.stats;
  const count = s?.totalMatching ?? 0;
  const aud = AUDIENCES.find((a) => a.v === target)!;
  const danger = def.kind === "ban" || def.kind === "amount";

  const payload = {
    target,
    action,
    ...(def.kind === "bool" ? { booleanValue: bool } : {}),
    ...(def.kind === "amount" ? { amountUsd: Number(amount), note: note.trim() || undefined } : {}),
    ...(def.kind === "ban" ? { banReason: banReason.trim() || undefined } : {}),
    ...(def.kind === "notify" ? { notificationTitle: nTitle.trim(), notificationMessage: nMsg.trim(), notificationActionUrl: nUrl.trim() || undefined } : {}),
  };
  const valid = def.kind === "amount" ? Number(amount) !== 0 && !Number.isNaN(Number(amount)) : def.kind === "notify" ? !!nTitle.trim() && !!nMsg.trim() : true;

  const summary =
    def.kind === "bool"
      ? `${def.label}: ${bool ? "On" : "Off"}`
      : def.kind === "amount"
        ? `${def.label}: ${Number(amount) > 0 ? "+" : ""}${amount || "0"} USD each`
        : def.label;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-xl border bg-card p-3 sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold">Who should this apply to?</p>
            <p className="text-xs text-muted-foreground">Pick an audience, then an action below.</p>
          </div>
          <div className="grid grid-cols-3 gap-1 rounded-xl border bg-muted/40 p-1">
            {AUDIENCES.map((a) => (
              <button
                key={a.v}
                type="button"
                onClick={() => setTarget(a.v)}
                className={cn(
                  "flex h-9 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors",
                  target === a.v ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <a.icon className="size-4" /> {a.label}
              </button>
            ))}
          </div>
        </div>
        {s ? (
          <div className="grid grid-cols-2 gap-3 border-t pt-3 lg:grid-cols-4">
            <StatCard label="Accounts" value={s.totalMatching} hint={`${s.activeCount} active · ${s.bannedCount} banned`} icon={Users} />
            <StatCard label="Wallet total" value={formatMoney(s.totalWalletBalance)} icon={Wallet} tone="success" />
            <StatCard label="Create / manage / fund" value={`${s.canCreateCount} / ${s.canManageCount} / ${s.canFundCount}`} icon={Network} />
            <StatCard label="Deposits / API on" value={`${s.depositsEnabledCount} / ${s.apiEnabledCount}`} hint={`${s.verifiedCount} verified`} icon={Code2} />
          </div>
        ) : (
          <TableSkeleton rows={2} />
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <div className="grid gap-4">
          {GROUPS.map((g) => (
            <section key={g.title} className="rounded-xl border bg-card p-3 sm:p-4">
              <div className="mb-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{g.title}</h3>
                <p className="text-xs text-muted-foreground">{g.hint}</p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {g.actions.map((a) => {
                  const on = a.v === action;
                  return (
                    <button
                      key={a.v}
                      type="button"
                      onClick={() => setAction(a.v)}
                      className={cn(
                        "flex items-center gap-3 rounded-xl border p-3 text-left transition-all",
                        on ? "border-primary bg-primary/[0.06] ring-2 ring-primary/20" : "hover:border-primary/40 hover:bg-muted/40",
                      )}
                    >
                      <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg", TONE_TILE[a.tone ?? "default"])}>
                        <a.icon className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1 leading-tight">
                        <span className="block text-sm font-semibold">{a.label}</span>
                        <span className="block truncate text-xs text-muted-foreground">{a.hint}</span>
                      </span>
                      {on ? <Check className="size-4 shrink-0 text-primary" /> : null}
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        <aside className="grid gap-4 rounded-xl border bg-card p-4 lg:sticky lg:top-4">
          <div className="flex items-center gap-3">
            <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", TONE_TILE[def.tone ?? "default"])}>
              <def.icon className="size-5" />
            </span>
            <div className="min-w-0 leading-tight">
              <p className="truncate font-display text-base font-semibold">{def.label}</p>
              <p className="text-xs text-muted-foreground">{def.hint}</p>
            </div>
          </div>

          {def.kind === "bool" ? (
            <div className="grid grid-cols-2 gap-1 rounded-xl border bg-muted/40 p-1">
              {[true, false].map((v) => (
                <button
                  key={String(v)}
                  type="button"
                  onClick={() => setBool(v)}
                  className={cn(
                    "h-9 rounded-lg text-sm font-medium transition-colors",
                    bool === v ? (v ? "bg-success/15 text-success shadow-sm" : "bg-destructive/15 text-destructive shadow-sm") : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {v ? "Turn on" : "Turn off"}
                </button>
              ))}
            </div>
          ) : null}
          {def.kind === "amount" ? (
            <>
              <Field label="Amount per account (USD)" hint="Negative to deduct.">
                <Input type="number" step="0.01" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-11 text-lg font-semibold tabular-nums" />
              </Field>
              <div className="flex flex-wrap gap-1.5">
                {[5, 10, 25, -5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setAmount(String(n))}
                    className={cn("rounded-full border px-3 py-1 text-xs font-medium transition-colors", Number(amount) === n ? "border-primary bg-primary/15 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground")}
                  >
                    {n > 0 ? "+" : ""}${n}
                  </button>
                ))}
              </div>
              <Field label="Note">
                <Input value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="Shown in their history (optional)" />
              </Field>
            </>
          ) : null}
          {def.kind === "ban" ? (
            <Field label="Ban reason">
              <Input value={banReason} onChange={(e) => setBanReason(e.target.value)} maxLength={500} placeholder="Shown to the user (optional)" />
            </Field>
          ) : null}
          {def.kind === "notify" ? (
            <>
              <Field label="Title">
                <Input value={nTitle} onChange={(e) => setNTitle(e.target.value)} maxLength={120} />
              </Field>
              <Field label="Message">
                <Textarea value={nMsg} onChange={(e) => setNMsg(e.target.value)} rows={3} maxLength={2000} />
              </Field>
              <Field label="Link (optional)">
                <Input value={nUrl} onChange={(e) => setNUrl(e.target.value)} placeholder="/app/deposit" />
              </Field>
            </>
          ) : null}

          <div className="grid gap-2 rounded-xl border bg-muted/30 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Summary</p>
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="default" shape="pill">
                <aud.icon /> {aud.label}
              </Badge>
              <Badge variant={count ? "muted" : "warning"} shape="pill">
                {count} account{count === 1 ? "" : "s"}
              </Badge>
              <Badge variant={danger ? "destructive" : "success"} shape="pill">
                {summary}
              </Badge>
            </div>
          </div>

          <Button size="lg" variant={def.kind === "ban" ? "destructive" : "default"} disabled={!valid || !count} onClick={() => setConfirm(true)}>
            <def.icon /> Run on {count} account{count === 1 ? "" : "s"}
          </Button>
        </aside>
      </div>

      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Run bulk action?"
        description={`"${summary}" will apply to ${count} ${aud.label.toLowerCase()} account${count === 1 ? "" : "s"}. This is logged and cannot be undone automatically.`}
        confirmLabel="Run action"
        destructive={danger}
        onConfirm={async () => {
          try {
            const r = await adminFetch<{ affectedCount: number; message?: string }>("/api/admin/sellers/bulk-action", { method: "POST", json: payload });
            toast.success(r.message ?? `Done. ${r.affectedCount} accounts affected.`);
            stats.reload();
          } catch (e) {
            toast.error(errMsg(e));
          }
        }}
      />
    </div>
  );
}
