"use client";

import { useState } from "react";
import { toast } from "sonner";
import { BadgePercent, History, Plus, Trash2 } from "lucide-react";
import { EmptyState, formatDate } from "@/components/app-ui";
import { Chips, ConfirmDialog, Field, Pager, SearchBox, SubmitButton, TableSkeleton, adminFetch, errMsg, useAdminList, useAdminQuery, useDebounced } from "@/components/admin/kit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatMoney } from "@/lib/currencies";
import type { SpecialPriceHistoryRow } from "@/types/special-price-history";

type Special = {
  id: string;
  userId: string;
  durationId: string;
  price: number;
  updatedAt: string;
  user: { username: string; email: string; role: string };
  productTitle: string;
  durationLabel: string;
  retailPrice: number | null;
  resellerPrice: number | null;
};
type FoundUser = { id: string; username: string; email: string; role: string };
type CatalogProduct = { id: string; title: string; durations: { id: string; label: string; retailPrice: number | null; specialPrice: number | null }[] };

const LIMIT = 20;

export function SpecialPricesTab() {
  const [view, setView] = useState<"active" | "history">("active");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const dq = useDebounced(q);
  const list = useAdminList<Special>("/api/admin/special-prices", "items", { active: 1, page, limit: LIMIT, q: dq });
  const hist = useAdminList<SpecialPriceHistoryRow>("/api/admin/special-prices/history", "items", { page, limit: LIMIT, q: dq });
  const [adding, setAdding] = useState(false);
  const [del, setDel] = useState<Special | null>(null);
  const cur = view === "active" ? list : hist;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Chips
          value={view}
          onChange={(v) => {
            setView(v);
            setPage(1);
          }}
          options={[
            { v: "active", label: "Active prices" },
            { v: "history", label: "History" },
          ]}
        />
        <div className="flex flex-col gap-2 sm:flex-row">
          <SearchBox
            value={q}
            onChange={(v) => {
              setQ(v);
              setPage(1);
            }}
            placeholder="User or product…"
          />
          <Button onClick={() => setAdding(true)}>
            <Plus /> Set price
          </Button>
        </div>
      </div>

      <div className="rounded-xl border bg-card">
        {cur.loading && cur.items.length === 0 ? (
          <TableSkeleton />
        ) : cur.items.length === 0 ? (
          <div className="p-6">
            <EmptyState icon={view === "active" ? BadgePercent : History} title={view === "active" ? "No special prices" : "No history"} hint="Override the price a single user pays for a duration." />
          </div>
        ) : view === "active" ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Retail</TableHead>
                <TableHead className="text-right">Special</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.items.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <p className="text-sm font-medium">@{s.user.username}</p>
                    <p className="text-xs text-muted-foreground">{s.user.email}</p>
                  </TableCell>
                  <TableCell className="text-sm">
                    {s.productTitle} <span className="text-muted-foreground">· {s.durationLabel}</span>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">{s.retailPrice != null ? formatMoney(s.retailPrice) : "—"}</TableCell>
                  <TableCell className="text-right font-semibold text-success">{formatMoney(s.price)}</TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{formatDate(s.updatedAt, true)}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon-sm" onClick={() => setDel(s)} aria-label="Clear">
                      <Trash2 />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Action</TableHead>
                <TableHead className="text-right">Change</TableHead>
                <TableHead>By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {hist.items.map((h) => (
                <TableRow key={h.id}>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{formatDate(h.createdAt, true)}</TableCell>
                  <TableCell className="text-sm">@{h.username ?? "?"}</TableCell>
                  <TableCell className="text-sm">
                    {h.productTitle ?? "—"} <span className="text-muted-foreground">· {h.durationLabel ?? "—"}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={h.action === "CLEAR" ? "destructive" : h.action === "SET" ? "success" : "default"}>{h.action}</Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right text-sm">
                    {h.previousPrice != null ? formatMoney(h.previousPrice) : "—"} → {h.newPrice != null ? formatMoney(h.newPrice) : "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{h.adminUsername ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
      <Pager page={page} pageSize={LIMIT} total={cur.total} onPage={setPage} loading={cur.loading} />

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent className="max-w-lg">
          {adding ? (
            <SetPriceForm
              onSaved={() => {
                setAdding(false);
                list.reload();
                hist.reload();
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={!!del}
        onOpenChange={(o) => !o && setDel(null)}
        title="Clear special price?"
        description={del ? `@${del.user.username} goes back to the normal price for ${del.productTitle} · ${del.durationLabel}.` : undefined}
        confirmLabel="Clear"
        destructive
        onConfirm={async () => {
          try {
            await adminFetch("/api/admin/special-prices", { method: "DELETE", json: { userId: del!.userId, durationId: del!.durationId } });
            toast.success("Special price cleared.");
            list.reload();
            hist.reload();
          } catch (e) {
            toast.error(errMsg(e));
          }
        }}
      />
    </div>
  );
}

function SetPriceForm({ onSaved }: { onSaved: () => void }) {
  const [uq, setUq] = useState("");
  const duq = useDebounced(uq);
  const users = useAdminQuery<{ users: FoundUser[] }>(duq.trim().length >= 2 ? `/api/admin/special-prices?q=${encodeURIComponent(duq.trim())}` : null);
  const [user, setUser] = useState<FoundUser | null>(null);
  const catalog = useAdminQuery<{ products: CatalogProduct[] }>(user ? `/api/admin/special-prices/catalog?userId=${user.id}&limit=48` : null);
  const [productId, setProductId] = useState("");
  const [durationId, setDurationId] = useState("");
  const [price, setPrice] = useState("");
  const [busy, setBusy] = useState(false);
  const product = catalog.data?.products.find((p) => p.id === productId);
  const duration = product?.durations.find((d) => d.id === durationId);

  async function save() {
    if (!user || !durationId || !(Number(price) >= 0) || price === "") return toast.error("Pick a user, duration and price.");
    setBusy(true);
    try {
      await adminFetch("/api/admin/special-prices", { method: "PUT", json: { userId: user.id, durationId, priceUsd: Number(price) } });
      toast.success("Special price saved.");
      onSaved();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Set special price</DialogTitle>
        <DialogDescription>The exact price one user pays for a duration. Skips flash sales and promos.</DialogDescription>
      </DialogHeader>
      {user ? (
        <div className="flex items-center justify-between rounded-lg border p-3 text-sm">
          <span>
            <span className="font-medium">@{user.username}</span> <span className="text-muted-foreground">{user.email}</span>
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setUser(null);
              setProductId("");
              setDurationId("");
            }}
          >
            Change
          </Button>
        </div>
      ) : (
        <Field label="Find user">
          <Input value={uq} onChange={(e) => setUq(e.target.value)} placeholder="Username or email (2+ chars)" />
          {users.data?.users.length ? (
            <ul className="mt-1 max-h-44 divide-y overflow-y-auto rounded-lg border">
              {users.data.users.map((u) => (
                <li key={u.id}>
                  <button type="button" onClick={() => setUser(u)} className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-accent">
                    <span>
                      @{u.username} <span className="text-muted-foreground">{u.email}</span>
                    </span>
                    <Badge variant="muted">{u.role}</Badge>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </Field>
      )}
      {user ? (
        <>
          <Field label="Product">
            <Select
              value={productId}
              onValueChange={(v) => {
                setProductId(v);
                setDurationId("");
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={catalog.loading ? "Loading…" : "Choose a product"} />
              </SelectTrigger>
              <SelectContent>
                {(catalog.data?.products ?? []).map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Duration" hint={duration ? `Retail ${duration.retailPrice != null ? formatMoney(duration.retailPrice) : "—"}${duration.specialPrice != null ? ` · current special ${formatMoney(duration.specialPrice)}` : ""}` : undefined}>
            <Select value={durationId} onValueChange={setDurationId} disabled={!product}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a duration" />
              </SelectTrigger>
              <SelectContent>
                {(product?.durations ?? []).map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Price (USD)">
            <Input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
          </Field>
        </>
      ) : null}
      <DialogFooter>
        <SubmitButton busy={busy} disabled={!user || !durationId || price === ""} onClick={save}>
          Save price
        </SubmitButton>
      </DialogFooter>
    </>
  );
}
