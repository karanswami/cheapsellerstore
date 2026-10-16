"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check, Eye, Layers, Store, UserPlus, X } from "lucide-react";
import { EmptyState, StatusBadge, formatDate } from "@/components/app-ui";
import { Chips, ConfirmDialog, Field, StatCard, SubmitButton, TableSkeleton, adminFetch, errMsg, useAdminQuery } from "@/components/admin/kit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { formatMoney } from "@/lib/currencies";

export function AdminSellersClient() {
  return (
    <Tabs defaultValue="applications" className="space-y-4">
      <TabsList>
        <TabsTrigger value="applications">
          <Store className="size-4" /> Applications
        </TabsTrigger>
        <TabsTrigger value="bulk">
          <Layers className="size-4" /> Bulk actions
        </TabsTrigger>
      </TabsList>
      <TabsContent value="applications">
        <Applications />
      </TabsContent>
      <TabsContent value="bulk">
        <BulkActions />
      </TabsContent>
    </Tabs>
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

function Applications() {
  const { data, loading, reload } = useAdminQuery<{ requests: Application[] }>("/api/admin/resellers");
  const [status, setStatus] = useState("PENDING");
  const [open, setOpen] = useState<Application | null>(null);
  const [creating, setCreating] = useState(false);
  const rows = (data?.requests ?? []).filter((r) => status === "ALL" || r.status === status);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Chips
          value={status}
          onChange={setStatus}
          options={[
            { v: "PENDING", label: "Pending" },
            { v: "APPROVED", label: "Approved" },
            { v: "REJECTED", label: "Rejected" },
            { v: "ALL", label: "All" },
          ]}
        />
        <Button onClick={() => setCreating(true)}>
          <UserPlus /> Create reseller
        </Button>
      </div>
      <div className="rounded-xl border bg-card">
        {loading && !data ? (
          <TableSkeleton />
        ) : rows.length === 0 ? (
          <div className="p-6">
            <EmptyState icon={Store} title="No applications" hint="Nothing in this view." />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Applicant</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Applied</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id} className="cursor-pointer" onClick={() => setOpen(r)}>
                  <TableCell>
                    <p className="text-sm font-medium">{r.fullName}</p>
                    <p className="text-xs text-muted-foreground">@{r.user.username}</p>
                  </TableCell>
                  <TableCell className="text-sm">{r.country}</TableCell>
                  <TableCell className="max-w-40 truncate text-sm">{r.sellingPlatform}</TableCell>
                  <TableCell>
                    <StatusBadge status={r.status} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{formatDate(r.createdAt)}</TableCell>
                  <TableCell>
                    <Eye className="size-4 text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
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

  const link = (href: string | null, label: string) =>
    href ? (
      <a href={href} target="_blank" rel="noreferrer" className="break-all text-primary hover:underline">
        {label}
      </a>
    ) : (
      "—"
    );

  return (
    <>
      <Dialog open={!!app} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-xl">
          {app ? (
            <>
              <DialogHeader>
                <DialogTitle>{app.fullName}</DialogTitle>
                <DialogDescription>
                  @{app.user.username} · {app.user.email} · wallet {formatMoney(app.user.walletBalance)}
                </DialogDescription>
              </DialogHeader>
              <div className="flex items-center gap-2">
                <StatusBadge status={app.status} />
                <Badge variant="muted">Currently {app.user.role}</Badge>
                {app.user.banned ? <Badge variant="destructive">Banned</Badge> : null}
              </div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <KV k="Phone" v={app.phone} />
                <KV k="Country" v={app.country} />
                <KV k="Telegram" v={app.telegram} />
                <KV k="Followers" v={app.followerCount} />
                <KV k="Selling on" v={app.sellingPlatform} />
                <KV k="Experience" v={app.experience || "—"} />
                <KV k="Facebook" v={link(app.facebookUrl, "Open")} />
                <KV k="YouTube" v={link(app.youtubeUrl, "Open")} />
                <KV k="TG channel" v={link(app.telegramChannelUrl, "Open")} />
                <KV k="Website" v={link(app.websiteUrl, "Open")} />
              </dl>
              <div>
                <p className="text-xs text-muted-foreground">Why they want to sell</p>
                <p className="mt-1 whitespace-pre-wrap rounded-lg bg-muted p-3 text-sm">{app.reason}</p>
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

function KV({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{k}</dt>
      <dd className="break-words">{v}</dd>
    </div>
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

const ACTIONS: { v: string; label: string; kind: "none" | "bool" | "amount" | "ban" | "notify" }[] = [
  { v: "GRANT_ALL_CAPS", label: "Grant all reseller capabilities", kind: "none" },
  { v: "REVOKE_ALL_CAPS", label: "Revoke all reseller capabilities", kind: "none" },
  { v: "SET_CAN_CREATE_RESELLERS", label: "Set: can create resellers", kind: "bool" },
  { v: "SET_CAN_MANAGE_RESELLERS", label: "Set: can manage resellers", kind: "bool" },
  { v: "SET_CAN_FUND_RESELLERS", label: "Set: can fund resellers", kind: "bool" },
  { v: "SET_DEPOSITS_ENABLED", label: "Set: deposits enabled", kind: "bool" },
  { v: "SET_API_ENABLED", label: "Set: Platform API enabled", kind: "bool" },
  { v: "SET_EMAIL_VERIFIED", label: "Set: email verified", kind: "bool" },
  { v: "WALLET_ADJUST", label: "Adjust every wallet (± USD)", kind: "amount" },
  { v: "SEND_NOTIFICATION", label: "Send notification", kind: "notify" },
  { v: "MASS_BAN", label: "Ban all", kind: "ban" },
  { v: "MASS_UNBAN", label: "Unban all", kind: "none" },
];

function BulkActions() {
  const [target, setTarget] = useState("SELLERS");
  const stats = useAdminQuery<{ stats: BulkStats }>(`/api/admin/sellers/bulk-action?target=${target}`);
  const [action, setAction] = useState("GRANT_ALL_CAPS");
  const [bool, setBool] = useState("true");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [banReason, setBanReason] = useState("");
  const [nTitle, setNTitle] = useState("");
  const [nMsg, setNMsg] = useState("");
  const [nUrl, setNUrl] = useState("");
  const [confirm, setConfirm] = useState(false);
  const def = ACTIONS.find((a) => a.v === action)!;
  const s = stats.data?.stats;

  const payload = {
    target,
    action,
    ...(def.kind === "bool" ? { booleanValue: bool === "true" } : {}),
    ...(def.kind === "amount" ? { amountUsd: Number(amount), note: note.trim() || undefined } : {}),
    ...(def.kind === "ban" ? { banReason: banReason.trim() || undefined } : {}),
    ...(def.kind === "notify" ? { notificationTitle: nTitle.trim(), notificationMessage: nMsg.trim(), notificationActionUrl: nUrl.trim() || undefined } : {}),
  };
  const valid = def.kind === "amount" ? Number(amount) !== 0 && !Number.isNaN(Number(amount)) : def.kind === "notify" ? !!nTitle.trim() && !!nMsg.trim() : true;

  return (
    <div className="space-y-4">
      <Field label="Audience">
        <Select value={target} onValueChange={setTarget}>
          <SelectTrigger className="w-full sm:w-72">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="SELLERS">Sellers</SelectItem>
            <SelectItem value="RESELLERS">Resellers</SelectItem>
            <SelectItem value="ALL_SELLERS_AND_RESELLERS">Sellers and resellers</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      {s ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Accounts" value={s.totalMatching} hint={`${s.activeCount} active · ${s.bannedCount} banned`} />
          <StatCard label="Wallet total" value={formatMoney(s.totalWalletBalance)} />
          <StatCard label="Can create / manage / fund" value={`${s.canCreateCount} / ${s.canManageCount} / ${s.canFundCount}`} />
          <StatCard label="Deposits / API on" value={`${s.depositsEnabledCount} / ${s.apiEnabledCount}`} hint={`${s.verifiedCount} verified`} />
        </div>
      ) : (
        <TableSkeleton rows={2} />
      )}

      <div className="grid gap-4 rounded-xl border bg-card p-4">
        <Field label="Action">
          <Select value={action} onValueChange={setAction}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ACTIONS.map((a) => (
                <SelectItem key={a.v} value={a.v}>
                  {a.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        {def.kind === "bool" ? (
          <Field label="Value">
            <Select value={bool} onValueChange={setBool}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">On</SelectItem>
                <SelectItem value="false">Off</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        ) : null}
        {def.kind === "amount" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Amount (USD, negative to deduct)">
              <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </Field>
            <Field label="Note">
              <Input value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />
            </Field>
          </div>
        ) : null}
        {def.kind === "ban" ? (
          <Field label="Ban reason">
            <Input value={banReason} onChange={(e) => setBanReason(e.target.value)} maxLength={500} />
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
        <div>
          <Button variant={def.kind === "ban" ? "destructive" : "default"} disabled={!valid || !s?.totalMatching} onClick={() => setConfirm(true)}>
            Run on {s?.totalMatching ?? 0} account{s?.totalMatching === 1 ? "" : "s"}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Run bulk action?"
        description={`"${def.label}" will apply to ${s?.totalMatching ?? 0} accounts. This is logged and cannot be undone automatically.`}
        confirmLabel="Run action"
        destructive={def.kind === "ban" || def.kind === "amount"}
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
