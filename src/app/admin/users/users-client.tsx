"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Ban, LogIn, Minus, Plus, ShieldCheck, Trash2, Users, Wallet } from "lucide-react";
import { EmptyState, StatusBadge, formatDate } from "@/components/app-ui";
import { Chips, ConfirmDialog, Field, Pager, SearchBox, SubmitButton, TableSkeleton, ToggleRow, adminFetch, errMsg, useAdminQuery } from "@/components/admin/kit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserAvatar } from "@/components/user-avatar";
import { formatMoney } from "@/lib/currencies";

type Role = "USER" | "SELLER" | "RESELLER" | "ADMIN";
type UserRow = {
  id: string;
  name: string;
  username: string;
  email: string;
  role: Role;
  walletBalance: number;
  banned: boolean;
  banReason: string | null;
  resellerDiscount: number;
  canCreateResellers: boolean;
  canManageResellers: boolean;
  canFundResellers: boolean;
  apiEnabled: boolean;
  depositsEnabled: boolean;
  emailVerified: boolean;
  referralCode: string | null;
  createdAt: string;
  referredBy: { username: string } | null;
};
type Activity = { id: string; kind: string; label: string; amount: number; meta: string; createdAt: string };

const ROLES: { v: "ALL" | Role; label: string }[] = [
  { v: "ALL", label: "All" },
  { v: "USER", label: "Users" },
  { v: "SELLER", label: "Sellers" },
  { v: "RESELLER", label: "Resellers" },
  { v: "ADMIN", label: "Admins" },
];
const LIMIT = 20;

export function AdminUsersClient() {
  const { data, loading, reload } = useAdminQuery<{ users: UserRow[] }>("/api/admin/users");
  const [q, setQ] = useState("");
  const [role, setRole] = useState<"ALL" | Role>("ALL");
  const [bannedOnly, setBannedOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (data?.users ?? []).filter(
      (u) => (role === "ALL" || u.role === role) && (!bannedOnly || u.banned) && (!s || `${u.name} ${u.username} ${u.email}`.toLowerCase().includes(s)),
    );
  }, [data, q, role, bannedOnly]);
  const pageRows = filtered.slice((page - 1) * LIMIT, page * LIMIT);
  const selected = data?.users.find((u) => u.id === selectedId) ?? null;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Chips
            value={role}
            onChange={(v) => {
              setRole(v);
              setPage(1);
            }}
            options={ROLES}
          />
          <Chips
            value={bannedOnly ? "b" : "a"}
            onChange={(v) => {
              setBannedOnly(v === "b");
              setPage(1);
            }}
            options={[
              { v: "a", label: "Any status" },
              { v: "b", label: "Banned" },
            ]}
          />
        </div>
        <SearchBox
          value={q}
          onChange={(v) => {
            setQ(v);
            setPage(1);
          }}
          placeholder="Name, username or email…"
        />
      </div>

      <div className="rounded-xl border bg-card">
        {loading && !data ? (
          <TableSkeleton />
        ) : pageRows.length === 0 ? (
          <div className="p-6">
            <EmptyState icon={Users} title="No users found" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Wallet</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((u) => (
                <TableRow key={u.id} className="cursor-pointer" onClick={() => setSelectedId(u.id)}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <UserAvatar seed={u.username} className="size-8 shrink-0" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{u.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          @{u.username} · {u.email}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.role === "ADMIN" ? "highlight" : u.role === "USER" ? "muted" : "default"}>{u.role}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold">{formatMoney(u.walletBalance)}</TableCell>
                  <TableCell>
                    {u.banned ? <Badge variant="destructive">Banned</Badge> : u.emailVerified ? <Badge variant="success">Verified</Badge> : <Badge variant="muted">Unverified</Badge>}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{formatDate(u.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
      <Pager page={page} pageSize={LIMIT} total={filtered.length} onPage={setPage} />

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelectedId(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
          {selected ? (
            <UserPanel
              key={selected.id}
              user={selected}
              onChanged={reload}
              onDeleted={() => {
                setSelectedId(null);
                reload();
              }}
            />
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function UserPanel({ user, onChanged, onDeleted }: { user: UserRow; onChanged: () => void; onDeleted: () => void }) {
  const detail = useAdminQuery<{ activity: Activity[] }>(`/api/admin/users/${user.id}`);
  const [role, setRole] = useState<Role>(user.role);
  const [discount, setDiscount] = useState(String(user.resellerDiscount));
  const [adjust, setAdjust] = useState("");
  const [adjustNote, setAdjustNote] = useState("");
  const [banOpen, setBanOpen] = useState(false);
  const [banReason, setBanReason] = useState("");
  const [delOpen, setDelOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  async function patch(label: string, body: Record<string, unknown>, okMsg = "Saved.") {
    setBusy(label);
    try {
      await adminFetch(`/api/admin/users/${user.id}`, { method: "PATCH", json: body });
      toast.success(okMsg);
      onChanged();
      detail.reload();
      return true;
    } catch (e) {
      toast.error(errMsg(e));
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function impersonate() {
    setBusy("imp");
    try {
      await adminFetch(`/api/admin/users/${user.id}/impersonate`, { method: "POST" });
      window.location.href = "/app";
    } catch (e) {
      toast.error(errMsg(e));
      setBusy(null);
    }
  }

  const wholesale = user.role === "SELLER" || user.role === "RESELLER";

  return (
    <>
      <SheetHeader>
        <div className="flex items-center gap-3 pr-8">
          <UserAvatar seed={user.username} className="size-11 shrink-0" />
          <div className="min-w-0">
            <SheetTitle className="truncate">{user.name}</SheetTitle>
            <SheetDescription className="truncate">
              @{user.username} · {user.email}
            </SheetDescription>
          </div>
        </div>
      </SheetHeader>

      <div className="grid gap-5 px-4 pb-6">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Wallet</p>
            <p className="font-display text-xl font-bold">{formatMoney(user.walletBalance)}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Joined</p>
            <p className="font-medium">{formatDate(user.createdAt)}</p>
            {user.referredBy ? <p className="text-xs text-muted-foreground">via @{user.referredBy.username}</p> : null}
          </div>
        </div>

        {user.banned ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm">
            <p className="font-medium text-destructive">Banned</p>
            {user.banReason ? <p className="text-muted-foreground">{user.banReason}</p> : null}
          </div>
        ) : null}

        <section className="grid gap-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Wallet className="size-4 text-primary" /> Adjust wallet
          </h3>
          <div className="grid gap-2 sm:grid-cols-[8rem_1fr_auto]">
            <Input type="number" step="0.01" placeholder="± USD" value={adjust} onChange={(e) => setAdjust(e.target.value)} />
            <Input placeholder="Note (optional)" value={adjustNote} onChange={(e) => setAdjustNote(e.target.value)} maxLength={200} />
            <SubmitButton
              busy={busy === "wallet"}
              disabled={!Number(adjust)}
              onClick={async () => {
                const ok = await patch("wallet", { walletAdjust: { amount: Number(adjust), note: adjustNote.trim() || undefined } }, "Wallet adjusted.");
                if (ok) {
                  setAdjust("");
                  setAdjustNote("");
                }
              }}
            >
              {Number(adjust) < 0 ? <Minus /> : <Plus />} Apply
            </SubmitButton>
          </div>
        </section>

        <Separator />

        <section className="grid gap-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <ShieldCheck className="size-4 text-primary" /> Role & access
          </h3>
          <div className="flex gap-2">
            <Select value={role} onValueChange={(v) => setRole(v as Role)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USER">User</SelectItem>
                <SelectItem value="SELLER">Seller</SelectItem>
                <SelectItem value="RESELLER">Reseller</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
              </SelectContent>
            </Select>
            <SubmitButton busy={busy === "role"} disabled={role === user.role} onClick={() => patch("role", { role }, "Role updated.")}>
              Save
            </SubmitButton>
          </div>
          {wholesale ? (
            <>
              <Field label="Wholesale discount (%)">
                <div className="flex gap-2">
                  <Input type="number" min="0" max="100" step="0.5" value={discount} onChange={(e) => setDiscount(e.target.value)} />
                  <SubmitButton busy={busy === "disc"} disabled={Number(discount) === user.resellerDiscount} onClick={() => patch("disc", { resellerDiscount: Number(discount) })}>
                    Save
                  </SubmitButton>
                </div>
              </Field>
              <ToggleRow label="Can create resellers" checked={user.canCreateResellers} onChange={(v) => patch("f", { canCreateResellers: v })} />
              <ToggleRow label="Can manage resellers" checked={user.canManageResellers} onChange={(v) => patch("f", { canManageResellers: v })} />
              <ToggleRow label="Can fund resellers" checked={user.canFundResellers} onChange={(v) => patch("f", { canFundResellers: v })} />
            </>
          ) : null}
          <ToggleRow label="Email verified" checked={user.emailVerified} onChange={(v) => patch("f", { emailVerified: v })} />
          <ToggleRow label="Platform API enabled" checked={user.apiEnabled} onChange={(v) => patch("f", { apiEnabled: v })} />
          <ToggleRow label="Deposits enabled" hint="Allow this user to self-deposit." checked={user.depositsEnabled} onChange={(v) => patch("f", { depositsEnabled: v })} />
        </section>

        <Separator />

        <div className="flex flex-wrap gap-2">
          {user.role !== "ADMIN" && !user.banned ? (
            <SubmitButton variant="secondary" busy={busy === "imp"} onClick={impersonate}>
              <LogIn /> Login as user
            </SubmitButton>
          ) : null}
          {user.banned ? (
            <SubmitButton variant="secondary" busy={busy === "ban"} onClick={() => patch("ban", { banned: false, banReason: null }, "User unbanned.")}>
              <Ban /> Unban
            </SubmitButton>
          ) : user.role !== "ADMIN" ? (
            <Button variant="destructive" onClick={() => setBanOpen(true)}>
              <Ban /> Ban
            </Button>
          ) : null}
          {user.role !== "ADMIN" ? (
            <Button variant="destructive" onClick={() => setDelOpen(true)}>
              <Trash2 /> Delete
            </Button>
          ) : null}
        </div>

        <Separator />

        <section>
          <h3 className="mb-2 text-sm font-semibold">Recent activity</h3>
          {detail.loading && !detail.data ? (
            <TableSkeleton rows={4} />
          ) : (detail.data?.activity.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">No activity yet.</p>
          ) : (
            <ScrollArea className="h-72 rounded-lg border">
              <ul className="divide-y">
                {detail.data!.activity.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{a.label}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(a.createdAt, true)}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="font-semibold">{formatMoney(a.amount)}</span>
                      {a.kind !== "transaction" ? <StatusBadge status={a.meta} /> : null}
                    </div>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          )}
        </section>
      </div>

      <Dialog open={banOpen} onOpenChange={setBanOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ban @{user.username}</DialogTitle>
            <DialogDescription>They will be signed out and blocked from the store.</DialogDescription>
          </DialogHeader>
          <Field label="Reason (shown to user)">
            <Input value={banReason} onChange={(e) => setBanReason(e.target.value)} maxLength={300} />
          </Field>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setBanOpen(false)}>
              Cancel
            </Button>
            <SubmitButton
              variant="destructive"
              busy={busy === "ban"}
              onClick={async () => {
                if (await patch("ban", { banned: true, banReason: banReason.trim() || null }, "User banned.")) setBanOpen(false);
              }}
            >
              Ban user
            </SubmitButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={delOpen}
        onOpenChange={setDelOpen}
        title={`Delete @${user.username}?`}
        description="The account is anonymised and can no longer sign in. Order history is kept."
        confirmLabel="Delete account"
        destructive
        onConfirm={async () => {
          try {
            await adminFetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
            toast.success("Account deleted.");
            onDeleted();
          } catch (e) {
            toast.error(errMsg(e));
          }
        }}
      />
    </>
  );
}
