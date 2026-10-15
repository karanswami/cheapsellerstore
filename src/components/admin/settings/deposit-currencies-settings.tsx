"use client";

import { adminMutate } from "@/components/admin/use-admin-fetch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  DEFAULT_DEPOSIT_CURRENCIES,
  LOCKED_DEPOSIT_CURRENCY_CODES,
  defaultCurrencyMeta,
  normalizeDepositCurrencyCode,
  type DepositCurrencyDef,
} from "@/types/deposit-currency";
import { Coins, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type QuickAmounts = Record<string, number[]>;

type DepositCurrenciesSettingsProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currencies: DepositCurrencyDef[];
  quickAmounts: QuickAmounts;
  /** Currency codes used by manual deposit methods (blocks delete). */
  usedByManualMethods: string[];
  onSaved: () => void;
};

function defaultQuick(code: string, rate: number): number[] {
  if (code === "USD") return [1, 5, 10, 25];
  if (code === "INR") return [100, 250, 500, 1000];
  if (code === "IDR") return [17000, 50000, 100000, 250000];
  if (code === "NPR") return [140, 500, 1000, 2000];
  const r = rate > 0 ? rate : 1;
  return [1, 2.5, 5, 10].map((m) => {
    const raw = r * m;
    if (r >= 1000) return Math.max(1000, Math.round(raw / 1000) * 1000);
    return Math.max(1, Math.round(raw));
  });
}

function emptyCurrencyDraft(): DepositCurrencyDef {
  return {
    code: "",
    name: "",
    symbol: "",
    rate: 1,
    sortOrder: 0,
  };
}

function isLocked(code: string) {
  return (LOCKED_DEPOSIT_CURRENCY_CODES as readonly string[]).includes(code);
}

function stepFor(code: string) {
  if (code === "USD") return "0.01";
  if (code === "IDR") return "1000";
  return "1";
}

export function DepositCurrenciesSettings({
  open,
  onOpenChange,
  currencies,
  quickAmounts,
  usedByManualMethods,
  onSaved,
}: DepositCurrenciesSettingsProps) {
  const [draft, setDraft] = useState<DepositCurrencyDef[]>(currencies);
  const [quickDraft, setQuickDraft] = useState<QuickAmounts>(quickAmounts);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorIndex, setEditorIndex] = useState<number | null>(null);
  const [editorDraft, setEditorDraft] = useState<DepositCurrencyDef>(
    emptyCurrencyDraft(),
  );
  const [pending, setPending] = useState(false);

  function syncFromProps() {
    setDraft(currencies);
    setQuickDraft(quickAmounts);
  }

  function openEditor(index: number | null) {
    if (index === null) {
      setEditorDraft({
        ...emptyCurrencyDraft(),
        sortOrder: draft.length,
      });
    } else {
      setEditorDraft({ ...draft[index]! });
    }
    setEditorIndex(index);
    setEditorOpen(true);
  }

  function saveEditor() {
    const code = normalizeDepositCurrencyCode(editorDraft.code);
    if (!code) {
      toast.error("Currency code must be 2–8 letters (e.g. PKR).");
      return;
    }
    if (editorIndex === null && draft.some((c) => c.code === code)) {
      toast.error(`${code} is already registered.`);
      return;
    }
    if (editorIndex !== null) {
      const existing = draft[editorIndex]!;
      if (existing.code !== code && isLocked(existing.code)) {
        toast.error(`Cannot change code for locked ${existing.code}.`);
        return;
      }
      if (
        existing.code !== code &&
        draft.some((c, i) => i !== editorIndex && c.code === code)
      ) {
        toast.error(`${code} is already registered.`);
        return;
      }
    }
    const name = editorDraft.name.trim() || defaultCurrencyMeta(code).name;
    const symbol =
      editorDraft.symbol.trim() || defaultCurrencyMeta(code).symbol;
    const rate =
      code === "USD"
        ? 1
        : Number.isFinite(editorDraft.rate) && editorDraft.rate > 0
          ? editorDraft.rate
          : 1;

    const next: DepositCurrencyDef = {
      code,
      name,
      symbol,
      rate,
      sortOrder: editorDraft.sortOrder,
    };

    setDraft((prev) => {
      if (editorIndex === null) return [...prev, next];
      return prev.map((c, i) => (i === editorIndex ? next : c));
    });
    setQuickDraft((prev) => {
      const out = { ...prev };
      if (editorIndex !== null) {
        const oldCode = draft[editorIndex]!.code;
        if (oldCode !== code && out[oldCode]) {
          out[code] = out[oldCode]!;
          delete out[oldCode];
        }
      }
      if (!out[code]?.length) {
        out[code] = defaultQuick(code, rate);
      }
      return out;
    });
    setEditorOpen(false);
  }

  function removeAt(index: number) {
    const target = draft[index];
    if (!target) return;
    if (isLocked(target.code)) {
      toast.error(`${target.code} is required for auto deposit rails.`);
      return;
    }
    if (usedByManualMethods.includes(target.code)) {
      toast.error(
        `Remove or reassign manual methods using ${target.code} first.`,
      );
      return;
    }
    setDraft((prev) => prev.filter((_, i) => i !== index));
    setQuickDraft((prev) => {
      const next = { ...prev };
      delete next[target.code];
      return next;
    });
  }

  function updateQuick(code: string, index: number, value: number) {
    setQuickDraft((prev) => {
      const list = [...(prev[code] ?? defaultQuick(code, 1))];
      while (list.length < 4) list.push(list[list.length - 1] ?? 1);
      list[index] = value;
      return { ...prev, [code]: list.slice(0, 4) };
    });
  }

  async function saveAll() {
    if (draft.length === 0) {
      toast.error("Add at least one currency.");
      return;
    }
    setPending(true);
    try {
      const currenciesPayload = draft.map((c, i) => ({
        ...c,
        sortOrder: i,
        rate: c.code === "USD" ? 1 : c.rate,
      }));
      const quickPayload: QuickAmounts = {};
      for (const c of currenciesPayload) {
        quickPayload[c.code] =
          quickDraft[c.code]?.length
            ? quickDraft[c.code]!
            : defaultQuick(c.code, c.rate);
      }
      const result = await adminMutate("/api/admin/settings", {
        method: "PATCH",
        body: JSON.stringify({
          depositCurrencies: currenciesPayload,
          depositQuickAmounts: quickPayload,
        }),
      });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("Currencies & rates saved");
      onOpenChange(false);
      onSaved();
    } finally {
      setPending(false);
    }
  }

  const editingLocked =
    editorIndex !== null && isLocked(draft[editorIndex]?.code ?? "");

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (next) syncFromProps();
          onOpenChange(next);
        }}
      >
        <DialogContent className="flex max-h-[min(92dvh,820px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
          <div className="shrink-0 border-b border-border/40 bg-muted/40 px-5 py-4">
            <DialogHeader className="gap-1.5 pr-8 text-left">
              <div className="mb-1 flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Coins className="size-5" />
              </div>
              <DialogTitle className="text-lg">
                Currencies & rates
              </DialogTitle>
              <DialogDescription>
                Register a pay currency (code, name, symbol, 1 USD = rate)
                before attaching a manual deposit method to it. USD / INR / IDR
                stay locked for auto rails.
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
            {draft.map((c, index) => {
              const quick = quickDraft[c.code] ?? defaultQuick(c.code, c.rate);
              const locked = isLocked(c.code);
              const inUse = usedByManualMethods.includes(c.code);
              return (
                <div
                  key={`${c.code}-${index}`}
                  className="space-y-3 rounded-xl border border-border px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium">
                          {c.symbol} {c.code}
                        </p>
                        <Badge variant="outline" className="text-[10px]">
                          {c.name}
                        </Badge>
                        {locked ? (
                          <Badge variant="secondary" className="text-[10px]">
                            Locked
                          </Badge>
                        ) : null}
                        {inUse ? (
                          <Badge variant="secondary" className="text-[10px]">
                            In use
                          </Badge>
                        ) : null}
                      </div>
                      <p className="text-xs text-muted-foreground tabular-nums">
                        {c.code === "USD"
                          ? "Base currency · rate fixed at 1"
                          : `1 USD = ${c.rate.toLocaleString()} ${c.code}`}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="size-8"
                        onClick={() => openEditor(index)}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="size-8 text-destructive"
                        disabled={locked || inUse}
                        onClick={() => removeAt(index)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Quick amount chips (up to 4)</Label>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {quick.map((amount, qIndex) => (
                        <Input
                          key={`${c.code}-q-${qIndex}`}
                          type="number"
                          min={c.code === "USD" ? 0.01 : 1}
                          step={stepFor(c.code)}
                          value={amount}
                          onChange={(e) =>
                            updateQuick(
                              c.code,
                              qIndex,
                              Number(e.target.value) || 0,
                            )
                          }
                          className="h-10 tabular-nums"
                        />
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => openEditor(null)}
            >
              <Plus className="size-4" />
              Add currency
            </Button>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="button" disabled={pending} onClick={() => void saveAll()}>
              {pending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="flex max-h-[min(92dvh,640px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
          <div className="shrink-0 border-b border-border/40 bg-muted/40 px-5 py-4">
            <DialogHeader className="gap-1.5 pr-8 text-left">
              <DialogTitle className="text-lg">
                {editorIndex === null ? "Add currency" : "Edit currency"}
              </DialogTitle>
              <DialogDescription>
                Code is used for rates, mins, and manual deposit methods. Add
                the currency here before creating a deposit method for it.
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
            <div className="space-y-2">
              <Label htmlFor="currency-code">Code</Label>
              <Input
                id="currency-code"
                value={editorDraft.code}
                disabled={editingLocked}
                onChange={(e) =>
                  setEditorDraft({
                    ...editorDraft,
                    code: e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 8),
                  })
                }
                placeholder="PKR"
                className={cn("h-11 font-mono uppercase", editingLocked && "opacity-70")}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="currency-name">Name</Label>
                <Input
                  id="currency-name"
                  value={editorDraft.name}
                  onChange={(e) =>
                    setEditorDraft({ ...editorDraft, name: e.target.value })
                  }
                  placeholder="Pakistani Rupee"
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency-symbol">Symbol</Label>
                <Input
                  id="currency-symbol"
                  value={editorDraft.symbol}
                  onChange={(e) =>
                    setEditorDraft({ ...editorDraft, symbol: e.target.value })
                  }
                  placeholder="Rs"
                  className="h-11"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency-rate">
                1 USD = {editorDraft.code || "…"}
              </Label>
              <Input
                id="currency-rate"
                type="number"
                min={0.000001}
                step={stepFor(editorDraft.code || "USD")}
                disabled={
                  normalizeDepositCurrencyCode(editorDraft.code) === "USD"
                }
                value={
                  normalizeDepositCurrencyCode(editorDraft.code) === "USD"
                    ? 1
                    : editorDraft.rate
                }
                onChange={(e) =>
                  setEditorDraft({
                    ...editorDraft,
                    rate: Number(e.target.value) || 0,
                  })
                }
                className="h-11 tabular-nums"
              />
              <p className="text-[11px] text-muted-foreground">
                Wallet credit = local amount ÷ this rate (USD microcents).
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditorOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" onClick={saveEditor}>
              {editorIndex === null ? "Add" : "Apply"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function formatCurrenciesSummary(
  currencies: DepositCurrencyDef[] | undefined,
): string {
  const list =
    currencies && currencies.length > 0
      ? currencies
      : DEFAULT_DEPOSIT_CURRENCIES;
  const extras = list.filter((c) => c.code !== "USD");
  if (extras.length === 0) return "USD only";
  return extras
    .slice(0, 4)
    .map((c) => `1 USD = ${c.symbol}${c.rate.toLocaleString()} ${c.code}`)
    .join(" · ");
}

export function formatQuickAmountsSummary(
  currencies: DepositCurrencyDef[] | undefined,
  amounts: QuickAmounts | undefined,
): string {
  const list =
    currencies && currencies.length > 0
      ? currencies
      : DEFAULT_DEPOSIT_CURRENCIES;
  return list
    .slice(0, 4)
    .map((c) => {
      const chips = amounts?.[c.code]?.slice(0, 3) ?? [];
      return `${c.code}: ${chips.join("/") || "—"}`;
    })
    .join(" · ");
}
