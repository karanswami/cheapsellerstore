"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Clock, Smartphone, TrendingUp } from "lucide-react";
import { Field, SubmitButton, ToggleRow, errMsg } from "@/components/admin/kit";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { usd, type DurationDraft } from "./types";

const PRESETS: { label: string; days: number | null; hours?: number }[] = [
  { label: "1 Hour", days: null, hours: 1 },
  { label: "6 Hours", days: null, hours: 6 },
  { label: "12 Hours", days: null, hours: 12 },
  { label: "1 Day", days: 1 },
  { label: "3 Days", days: 3 },
  { label: "7 Days", days: 7 },
  { label: "15 Days", days: 15 },
  { label: "30 Days", days: 30 },
  { label: "90 Days", days: 90 },
  { label: "Lifetime", days: null },
];

const num = (v: string) => (v.trim() === "" ? 0 : Number(v));

/**
 * Add / edit one duration. The parent decides what "save" means
 * (API call on the edit page, local list on the new-product page).
 */
export function DurationDialog({
  open,
  onOpenChange,
  initial,
  productTitle,
  existingLabels,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial: DurationDraft | null;
  productTitle: string;
  /** Lower-cased labels already on the product (excluding the one being edited). */
  existingLabels: string[];
  onSubmit: (draft: DurationDraft) => Promise<void>;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        {open ? (
          <DurationForm
            key={initial?.id ?? initial?.label ?? "new"}
            initial={initial}
            productTitle={productTitle}
            existingLabels={existingLabels}
            onSubmit={onSubmit}
            onDone={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function DurationForm({
  initial,
  productTitle,
  existingLabels,
  onSubmit,
  onDone,
}: {
  initial: DurationDraft | null;
  productTitle: string;
  existingLabels: string[];
  onSubmit: (draft: DurationDraft) => Promise<void>;
  onDone: () => void;
}) {
  const [label, setLabel] = useState(initial?.label ?? "");
  const [unit, setUnit] = useState<"days" | "hours">(initial?.hours ? "hours" : "days");
  const [days, setDays] = useState(initial?.hours ? String(initial.hours) : initial?.days ? String(initial.days) : "");
  const [price, setPrice] = useState(initial ? String(initial.price) : "");
  const [seller, setSeller] = useState(initial ? String(initial.resellerPrice) : "");
  const [cost, setCost] = useState(initial ? String(initial.buyPrice) : "");
  const [needsDevice, setNeedsDevice] = useState(initial?.requiresAndroidId ?? false);
  const [deviceName, setDeviceName] = useState(initial?.deviceIdName ?? "");
  const [busy, setBusy] = useState(false);

  const userP = num(price);
  const sellerP = num(seller);
  const costP = num(cost);
  const clash = existingLabels.includes(label.trim().toLowerCase());

  async function save() {
    if (!label.trim()) return toast.error("Enter a label, e.g. 1 Day.");
    if (clash) return toast.error("This product already has a duration with that label.");
    if (!(userP > 0)) return toast.error("User price must be greater than 0.");
    const len = days.trim() ? Math.trunc(Number(days)) || null : null;
    setBusy(true);
    try {
      await onSubmit({
        id: initial?.id,
        number: initial?.number,
        label: label.trim(),
        days: unit === "days" ? len : null,
        hours: unit === "hours" ? len : null,
        price: userP,
        resellerPrice: sellerP,
        buyPrice: costP,
        requiresAndroidId: needsDevice,
        deviceIdName: needsDevice ? deviceName.trim() : "",
        available: initial?.available,
        sold: initial?.sold,
      });
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
        <DialogTitle>{initial ? "Edit duration" : "Add duration"}</DialogTitle>
        <DialogDescription>
          {productTitle || "New product"}
          {initial?.number ? ` · SKU #${initial.number}` : ""}
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-5">
        <div className="grid gap-2">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            <Clock className="size-3.5" /> Quick pick
          </p>
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((p) => {
              const on = label.trim().toLowerCase() === p.label.toLowerCase();
              return (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => {
                    setLabel(p.label);
                    setUnit(p.hours ? "hours" : "days");
                    setDays(String(p.hours ?? p.days ?? ""));
                  }}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    on ? "border-primary bg-primary/15 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
          <Field label="Label" hint={clash ? undefined : "Shown to buyers."}>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="1 Day" maxLength={80} aria-invalid={clash} />
            {clash ? <p className="text-xs text-destructive">Label already used on this product.</p> : null}
          </Field>
          <Field label="Length" hint="Empty = lifetime.">
            <div className="flex gap-1.5">
              <Input type="number" min="1" value={days} onChange={(e) => setDays(e.target.value)} className="min-w-0" />
              <button
                type="button"
                onClick={() => setUnit((u) => (u === "days" ? "hours" : "days"))}
                className="shrink-0 rounded-md border px-2.5 text-xs font-medium text-primary hover:bg-primary/10"
                title="Switch unit"
              >
                {unit === "days" ? "Days" : "Hours"}
              </button>
            </div>
          </Field>
        </div>

        <div className="rounded-xl border bg-muted/30 p-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="User price">
              <Input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" />
            </Field>
            <Field label="Seller price">
              <Input type="number" min="0" step="0.01" value={seller} onChange={(e) => setSeller(e.target.value)} placeholder="0.00" />
            </Field>
            <Field label="Cost">
              <Input type="number" min="0" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="0.00" />
            </Field>
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <TrendingUp className="size-3.5" />
            {userP > 0 && costP > 0 ? (
              <>
                Margin per sale <span className="font-semibold text-foreground">{usd(userP - costP)}</span> ({Math.round(((userP - costP) / userP) * 100)}%)
                {sellerP > 0 ? (
                  <>
                    {" "}· seller <span className="font-semibold text-foreground">{usd(sellerP - costP)}</span>
                  </>
                ) : null}
              </>
            ) : (
              "Cost is for admin stats only — buyers never see it."
            )}
          </p>
        </div>

        <div className="grid gap-3">
          <ToggleRow label="Needs device ID" hint="Buyer must enter an Android / device ID at checkout." checked={needsDevice} onChange={setNeedsDevice} />
          {needsDevice ? (
            <Field label="Device ID field name" hint="Label of the input shown to buyers.">
              <div className="relative">
                <Smartphone className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-9" value={deviceName} onChange={(e) => setDeviceName(e.target.value)} placeholder="Android ID" maxLength={80} />
              </div>
            </Field>
          ) : null}
        </div>
      </div>

      <DialogFooter>
        <SubmitButton busy={busy} onClick={save}>
          {initial ? "Save duration" : "Add duration"}
        </SubmitButton>
      </DialogFooter>
    </>
  );
}
