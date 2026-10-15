"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMoney, type Currency } from "@/lib/currencies";
import { roleLabel, type UserRole } from "@/lib/roles";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export type AdminUserRow = {
  id: string;
  name: string;
  username: string;
  email: string;
  currency: Currency;
  role: UserRole;
  walletBalance: number;
  banned: boolean;
  resellerDiscount: number;
  createdAt: string;
};

const ROLES: UserRole[] = ["USER", "SELLER", "RESELLER", "ADMIN"];

export function AdminUsersTable({ users }: { users: AdminUserRow[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [walletUser, setWalletUser] = useState<AdminUserRow | null>(null);
  const [amount, setAmount] = useState("10");
  const [note, setNote] = useState("");

  async function patch(id: string, body: Record<string, unknown>) {
    setPendingId(id);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as { error?: { message: string } };
      if (!res.ok) {
        toast.error(json.error?.message ?? "Failed to update.");
        return;
      }
      toast.success("User updated");
      router.refresh();
    } catch {
      toast.error("Network error. Try again.");
    } finally {
      setPendingId(null);
    }
  }

  async function saveWallet() {
    if (!walletUser) return;
    const n = Number(amount);
    if (!Number.isFinite(n) || n === 0) {
      toast.error("Enter a non-zero amount");
      return;
    }
    await patch(walletUser.id, {
      walletAdjust: { amount: n, note: note || undefined },
    });
    setWalletUser(null);
    setNote("");
  }

  if (users.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No registered users yet.</p>
    );
  }

  return (
    <>
      <ul className="space-y-2">
        {users.map((user) => (
          <li
            key={user.id}
            className="flex flex-col gap-3 rounded-xl bg-card ring-1 ring-foreground/10 px-3 py-3"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-sm font-semibold">{user.name}</p>
                <Badge variant="secondary">{user.role}</Badge>
                <Badge variant="outline">{user.currency}</Badge>
                {user.banned ? <Badge variant="destructive">Banned</Badge> : null}
              </div>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                @{user.username} · {user.email} · wallet{" "}
                {formatMoney(user.walletBalance, user.currency)}
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {ROLES.map((role) => (
                <Button
                  key={role}
                  type="button"
                  size="sm"
                  variant={user.role === role ? "default" : "outline"}
                  disabled={pendingId === user.id || user.role === role}
                  onClick={() => void patch(user.id, { role })}
                >
                  {roleLabel(role)}
                </Button>
              ))}
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={pendingId === user.id}
                onClick={() => void patch(user.id, { banned: !user.banned })}
              >
                {user.banned ? "Unban" : "Ban"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setWalletUser(user);
                  setAmount("10");
                }}
              >
                Adjust wallet
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <Dialog open={!!walletUser} onOpenChange={(o) => !o && setWalletUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust wallet</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {walletUser?.name} — use negative amounts to debit.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="adj-amount">Amount</Label>
              <Input
                id="adj-amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="adj-note">Note</Label>
              <Input
                id="adj-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWalletUser(null)}>
              Cancel
            </Button>
            <Button onClick={() => void saveWallet()}>Apply</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
