"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Ban, Check, Loader2, Minus, Plus, Trash2, UserPlus, UsersRound } from "lucide-react";
import { EmptyState, Panel, formatDate } from "@/components/app-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatMoney } from "@/lib/currencies";

type Reseller = { id: string; name: string; username: string; email: string; walletBalance: number; banned: boolean; createdAt: string };

async function api(url: string, method: string, body?: object) {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error?.message ?? "Request failed.");
  return json.data;
}

export function SellerClient({ resellers, minUsd, can }: { resellers: Reseller[]; minUsd: number; can: { create: boolean; manage: boolean; fund: boolean } }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [form, setForm] = useState({ username: "", email: "", password: "", name: "", initialUsd: String(minUsd) });
  const [amounts, setAmounts] = useState<Record<string, string>>({});

  async function run(key: string, fn: () => Promise<void>, ok?: string) {
    setBusy(key);
    try {
      await fn();
      if (ok) toast.success(ok);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Request failed.");
    } finally {
      setBusy(null);
    }
  }

  const total = resellers.reduce((s, r) => s + r.walletBalance, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <div className="rounded-xl border bg-card p-4">
          <p className="font-display text-2xl font-bold">{resellers.length}</p>
          <p className="mt-1 text-xs text-muted-foreground">Resellers</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="font-display text-2xl font-bold">{formatMoney(total)}</p>
          <p className="mt-1 text-xs text-muted-foreground">Combined wallets</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="font-display text-2xl font-bold">{resellers.filter((r) => r.banned).length}</p>
          <p className="mt-1 text-xs text-muted-foreground">Suspended</p>
        </div>
      </div>

      {can.create ? (
        <Panel title="Create reseller" icon={UserPlus}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(["username", "email", "password", "name"] as const).map((k) => (
              <Input
                key={k}
                type={k === "password" ? "password" : "text"}
                placeholder={k === "name" ? "Display name (optional)" : k[0].toUpperCase() + k.slice(1)}
                value={form[k]}
                onChange={(e) => setForm((p) => ({ ...p, [k]: e.target.value }))}
                autoComplete="off"
              />
            ))}
            <Input inputMode="decimal" placeholder={`Initial funding USD (min ${minUsd})`} value={form.initialUsd} onChange={(e) => setForm((p) => ({ ...p, initialUsd: e.target.value.replace(/[^0-9.]/g, "") }))} />
            <Button
              disabled={busy === "create" || !form.username || !form.email || !form.password}
              onClick={() =>
                run(
                  "create",
                  async () => {
                    await api("/api/seller/sub-sellers", "POST", { ...form, name: form.name || undefined, initialUsd: Number(form.initialUsd) });
                    setForm({ username: "", email: "", password: "", name: "", initialUsd: String(minUsd) });
                  },
                  "Reseller created.",
                )
              }
            >
              {busy === "create" ? <Loader2 className="animate-spin" /> : <Plus />} Create
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Initial funding is moved from your wallet to the new reseller.</p>
        </Panel>
      ) : null}

      {resellers.length === 0 ? (
        <EmptyState icon={UsersRound} title="No resellers yet" hint={can.create ? "Create your first reseller above." : "Resellers you manage will appear here."} />
      ) : (
        <ul className="space-y-3">
          {resellers.map((r) => (
            <li key={r.id} className="rounded-xl border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-medium">
                    {r.name} <span className="text-muted-foreground">@{r.username}</span>
                    {r.banned ? <Badge variant="destructive">Suspended</Badge> : null}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {r.email} · joined {formatDate(r.createdAt)}
                  </p>
                </div>
                <p className="font-display text-xl font-bold">{formatMoney(r.walletBalance)}</p>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {can.fund ? (
                  <>
                    <Input className="h-9 w-28" inputMode="decimal" placeholder="USD" value={amounts[r.id] ?? ""} onChange={(e) => setAmounts((p) => ({ ...p, [r.id]: e.target.value.replace(/[^0-9.]/g, "") }))} />
                    {([1, -1] as const).map((sign) => (
                      <Button
                        key={sign}
                        size="sm"
                        variant="secondary"
                        disabled={!Number(amounts[r.id]) || busy === `${sign}${r.id}`}
                        onClick={() =>
                          run(
                            `${sign}${r.id}`,
                            async () => {
                              await api(`/api/seller/sub-sellers/${r.id}/credit`, "POST", { amountUsd: sign * Number(amounts[r.id]) });
                              setAmounts((p) => ({ ...p, [r.id]: "" }));
                            },
                            sign > 0 ? "Funds sent." : "Funds reclaimed.",
                          )
                        }
                      >
                        {sign > 0 ? <Plus /> : <Minus />} {sign > 0 ? "Fund" : "Reclaim"}
                      </Button>
                    ))}
                  </>
                ) : null}
                {can.manage ? (
                  <>
                    <Button size="sm" variant="secondary" disabled={busy === `ban${r.id}`} onClick={() => run(`ban${r.id}`, () => api(`/api/seller/sub-sellers/${r.id}`, "PATCH", { banned: !r.banned }), r.banned ? "Reseller restored." : "Reseller suspended.")}>
                      {r.banned ? <Check /> : <Ban />} {r.banned ? "Restore" : "Suspend"}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={busy === `del${r.id}`}
                      onClick={() => confirm(`Delete @${r.username}? Their wallet balance is reclaimed to you.`) && run(`del${r.id}`, () => api(`/api/seller/sub-sellers/${r.id}`, "DELETE"), "Reseller deleted.")}
                    >
                      <Trash2 /> Delete
                    </Button>
                  </>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
