"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Field, SubmitButton, adminFetch, errMsg, useAdminQuery } from "@/components/admin/kit";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatMoney } from "@/lib/currencies";
import type { PickedUser } from "./price-desk";
import { SearchPicker, UserSearchPicker } from "./picker";

type Dur = { id: string; label: string; retailPrice: number | null; specialPrice: number | null };
type Prod = { id: string; title: string; durations: Dur[] };

export function AddPriceDialog({ open, onOpenChange, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; onSaved: (u: PickedUser) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">{open ? <Form onSaved={onSaved} /> : null}</DialogContent>
    </Dialog>
  );
}

function Form({ onSaved }: { onSaved: (u: PickedUser) => void }) {
  const [user, setUser] = useState<PickedUser | null>(null);
  const catalog = useAdminQuery<{ products: Prod[] }>(user ? `/api/admin/special-prices/catalog?userId=${user.id}&limit=200` : null);
  const [productId, setProductId] = useState("");
  const [durationId, setDurationId] = useState("");
  const [price, setPrice] = useState("");
  const [busy, setBusy] = useState(false);
  const product = catalog.data?.products.find((p) => p.id === productId);
  const duration = product?.durations.find((d) => d.id === durationId);
  const mc = (v: number) => String(Math.round((v / 1_000_000) * 100) / 100);

  async function save() {
    if (!user || !durationId || price === "" || !(Number(price) >= 0)) return toast.error("Pick a user, product, duration and price.");
    setBusy(true);
    try {
      await adminFetch("/api/admin/special-prices", { method: "PUT", json: { userId: user.id, durationId, priceUsd: Number(price) } });
      toast.success(`Special price saved for @${user.username}.`);
      onSaved(user);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Add special price</DialogTitle>
        <DialogDescription>Select user, then product, then duration. Type the new price.</DialogDescription>
      </DialogHeader>

      <Field label="1. User">
        <UserSearchPicker
          value={user}
          onPick={(u) => {
            setUser(u);
            setProductId("");
            setDurationId("");
            setPrice("");
          }}
        />
      </Field>

      <Field label="2. Product">
        <SearchPicker
          disabled={!user}
          loading={catalog.loading}
          items={(catalog.data?.products ?? []).map((p) => ({
            id: p.id,
            title: p.title,
            badge: p.durations.some((d) => d.specialPrice != null) ? `${p.durations.filter((d) => d.specialPrice != null).length} special` : `${p.durations.length} durations`,
            tone: p.durations.some((d) => d.specialPrice != null) ? "success" : "muted",
          }))}
          value={productId}
          onSelect={(v) => {
            setProductId(v);
            setDurationId("");
            setPrice("");
          }}
          placeholder={user ? (catalog.loading ? "Loading products…" : "Select product") : "Select a user first"}
          emptyText="No products found"
        />
      </Field>

      <Field label="3. Duration">
        <SearchPicker
          disabled={!product}
          searchable={false}
          items={(product?.durations ?? []).map((d) => ({
            id: d.id,
            title: d.label,
            sub: d.specialPrice != null ? `Special ${formatMoney(d.specialPrice)}` : undefined,
            badge: d.retailPrice != null ? formatMoney(d.retailPrice) : undefined,
          }))}
          value={durationId}
          onSelect={(v) => {
            setDurationId(v);
            const d = product?.durations.find((x) => x.id === v);
            setPrice(d ? (d.specialPrice != null ? mc(d.specialPrice) : d.retailPrice != null ? mc(d.retailPrice) : "") : "");
          }}
          placeholder={product ? "Select duration" : "Select a product first"}
        />
      </Field>

      {duration ? (
        <div className="grid grid-cols-2 gap-2 rounded-lg border bg-muted/40 p-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Current price</p>
            <p className="font-semibold">{duration.retailPrice != null ? formatMoney(duration.retailPrice) : "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Existing special</p>
            <p className="font-semibold text-success">{duration.specialPrice != null ? formatMoney(duration.specialPrice) : "None"}</p>
          </div>
        </div>
      ) : null}

      <Field label="4. Special price (USD)">
        <Input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" disabled={!durationId} />
      </Field>

      <DialogFooter>
        <SubmitButton busy={busy} disabled={!user || !durationId || price === ""} onClick={save}>
          Save price
        </SubmitButton>
      </DialogFooter>
    </>
  );
}
