"use client";

import { useState } from "react";
import { toast } from "sonner";
import { BadgePercent, History, Pencil, Trash2 } from "lucide-react";
import { EmptyState, formatDate } from "@/components/app-ui";
import { ConfirmDialog, Pager, SearchBox, TableSkeleton, adminFetch, errMsg, useAdminList, useDebounced } from "@/components/admin/kit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatMoney } from "@/lib/currencies";
import type { SpecialPriceHistoryRow } from "@/types/special-price-history";
import type { PickedUser } from "./price-desk";

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
};

const LIMIT = 20;

export function SpecialLists({ view, onEditUser, onChanged }: { view: "active" | "history"; onEditUser: (u: PickedUser) => void; onChanged: () => void }) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const dq = useDebounced(q);
  const list = useAdminList<Special>("/api/admin/special-prices", "items", { active: view === "active" ? 1 : undefined, page, limit: LIMIT, q: dq });
  const hist = useAdminList<SpecialPriceHistoryRow>("/api/admin/special-prices/history", "items", { page, limit: LIMIT, q: dq });
  const [del, setDel] = useState<Special | null>(null);
  const cur = view === "active" ? list : hist;

  return (
    <div className="space-y-4">
      <SearchBox
        value={q}
        onChange={(v) => {
          setQ(v);
          setPage(1);
        }}
        placeholder="User, product or duration…"
      />
      <div className="rounded-xl border bg-card">
        {cur.loading && cur.items.length === 0 ? (
          <TableSkeleton />
        ) : cur.items.length === 0 ? (
          <div className="p-6">
            <EmptyState icon={view === "active" ? BadgePercent : History} title={view === "active" ? "No special prices" : "No history"} hint="Use the Price desk to set prices for a user." />
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
                <TableHead className="w-20" />
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
                      <div className="flex justify-end">
                        <Button variant="ghost" size="icon-sm" onClick={() => onEditUser({ id: s.userId, username: s.user.username, email: s.user.email, role: s.user.role })} aria-label="Edit in price desk">
                          <Pencil />
                        </Button>
                        <Button variant="ghost" size="icon-sm" onClick={() => setDel(s)} aria-label="Clear">
                          <Trash2 />
                        </Button>
                      </div>
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
            onChanged();
          } catch (e) {
            toast.error(errMsg(e));
          }
        }}
      />
    </div>
  );
}
