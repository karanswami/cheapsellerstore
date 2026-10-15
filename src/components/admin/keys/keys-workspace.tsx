"use client";

import {
  AdminEmptyState,
  AdminPageHeader,
} from "@/components/admin/admin-page-header";
import { adminMutate, useAdminFetch } from "@/components/admin/use-admin-fetch";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Boxes, Upload, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type StockRow = {
  id: string;
  label: string;
  productId: string;
  productTitle: string;
  available: number;
  sold: number;
  disabled: number;
  total: number;
};

type ProductApi = {
  id: string;
  title: string;
  durations: { id: string; label: string }[];
};

export function KeysWorkspace() {
  const searchParams = useSearchParams();
  const initialDurationId = searchParams.get("durationId") ?? "";

  const { data: stockData, reload } = useAdminFetch<{ rows: StockRow[] }>(
    "/api/admin/keys",
  );
  const { data: productsData, loading: productsLoading } = useAdminFetch<
    ProductApi[]
  >("/api/admin/products");

  const [productId, setProductId] = useState("");
  const [durationId, setDurationId] = useState("");
  const [paste, setPaste] = useState("");
  const [codes, setCodes] = useState<string[]>([]);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const products = productsData ?? [];
  const rows = stockData?.rows ?? [];

  const durations = useMemo(
    () => products.find((p) => p.id === productId)?.durations ?? [],
    [products, productId],
  );

  const selectedStock = useMemo(
    () => rows.find((r) => r.id === durationId) ?? null,
    [rows, durationId],
  );

  useEffect(() => {
    if (hydrated || products.length === 0) return;

    let nextProduct = products[0]?.id ?? "";
    let nextDuration = "";

    if (initialDurationId) {
      for (const p of products) {
        if (p.durations.some((d) => d.id === initialDurationId)) {
          nextProduct = p.id;
          nextDuration = initialDurationId;
          break;
        }
      }
    } else if (products[0]?.durations[0]) {
      nextDuration = products[0].durations[0].id;
    }

    setProductId(nextProduct);
    setDurationId(nextDuration);
    setHydrated(true);
  }, [products, initialDurationId, hydrated]);

  function parsePaste(raw: string) {
    const lines = raw
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const seen = new Set<string>();
    const unique: string[] = [];
    for (const code of lines) {
      if (seen.has(code)) continue;
      seen.add(code);
      unique.push(code);
    }
    return unique;
  }

  function openReview() {
    if (!durationId) {
      toast.error("Select a product and duration.");
      return;
    }
    const unique = parsePaste(paste);
    if (unique.length === 0) {
      toast.error("Paste at least one key (one per line).");
      return;
    }
    setCodes(unique);
    setReviewOpen(true);
  }

  async function confirmUpload() {
    if (!durationId || codes.length === 0) return;
    setPending(true);
    const result = await adminMutate("/api/admin/keys/import", {
      method: "POST",
      body: JSON.stringify({ durationId, codes }),
    });
    setPending(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    const payload = result.data as {
      imported?: number;
      rejected?: { code: string; reason: string }[];
    };
    const imported = payload.imported ?? 0;
    const rejected = payload.rejected ?? [];
    if (rejected.length > 0) {
      toast.warning(
        `Imported ${imported}. Skipped ${rejected.length} duplicate(s).`,
      );
    } else {
      toast.success(`Imported ${imported} key${imported === 1 ? "" : "s"}`);
    }
    setPaste("");
    setCodes([]);
    setReviewOpen(false);
    void reload();
  }

  return (
    <main className="space-y-5">
      <AdminPageHeader
        title="Keys"
        description="Select product & duration, then paste keys to import"
      />

      {productsLoading ? (
        <div className="h-64 animate-pulse rounded-xl border border-border bg-muted/40" />
      ) : products.length === 0 ? (
        <AdminEmptyState message="No products yet. Add a product with durations first." />
      ) : (
        <div className="space-y-4 rounded-xl bg-card ring-1 ring-foreground/10 p-4 sm:p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-[11px] tracking-wide text-muted-foreground uppercase">
                Product
              </Label>
              <Select
                value={productId || undefined}
                onValueChange={(v) => {
                  setProductId(v);
                  const first =
                    products.find((p) => p.id === v)?.durations[0]?.id ?? "";
                  setDurationId(first);
                }}
              >
                <SelectTrigger className="h-10 w-full">
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] tracking-wide text-muted-foreground uppercase">
                Duration
              </Label>
              <Select
                value={durationId || undefined}
                onValueChange={setDurationId}
                disabled={!productId || durations.length === 0}
              >
                <SelectTrigger className="h-10 w-full">
                  <SelectValue
                    placeholder={
                      durations.length === 0
                        ? "No durations"
                        : "Select duration"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {durations.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedStock ? (
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="secondary">{selectedStock.available} avail</Badge>
              <Badge variant="outline">{selectedStock.sold} sold</Badge>
              {selectedStock.disabled > 0 ? (
                <Badge variant="destructive">
                  {selectedStock.disabled} off
                </Badge>
              ) : null}
              <Badge variant="outline" className="font-normal">
                {selectedStock.total} total
              </Badge>
            </div>
          ) : durationId ? (
            <p className="text-xs text-muted-foreground">No stock yet for this duration.</p>
          ) : null}

          <div className="space-y-1.5">
            <Label className="text-[11px] tracking-wide text-muted-foreground uppercase">
              Keys (one per line)
            </Label>
            <Textarea
              value={paste}
              onChange={(e) => setPaste(e.target.value)}
              placeholder={"KEY-001\nKEY-002\nKEY-003"}
              className="min-h-44 font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Duplicates in the paste are dropped before upload.
            </p>
          </div>

          <div className="flex justify-end">
            <Button
              type="button"
              disabled={
                pending ||
                !durationId ||
                !paste.trim() ||
                durations.length === 0
              }
              onClick={openReview}
            >
              <Upload data-icon="inline-start" />
              Review & import
            </Button>
          </div>
        </div>
      )}

      <Dialog
        open={reviewOpen}
        onOpenChange={(v) => {
          if (!v) setCodes([]);
          setReviewOpen(v);
        }}
      >
        <DialogContent className="flex max-h-[min(92dvh,720px)] w-full max-w-[calc(100%-1.25rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
          <div className="shrink-0 border-b border-border/40 bg-muted/40 px-4 pt-4 pb-3.5 sm:px-5">
            <DialogHeader className="gap-1.5 pr-8 text-left">
              <div className="mb-1 flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Boxes className="size-5" />
              </div>
              <DialogTitle className="text-lg">Review before upload</DialogTitle>
              <DialogDescription>
                Remove any keys you do not want. Duplicates in the paste were
                already dropped.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4 sm:px-5">
            <p className="text-xs text-muted-foreground">
              {codes.length} key{codes.length === 1 ? "" : "s"} ready
              {selectedStock
                ? ` · ${selectedStock.productTitle} · ${selectedStock.label}`
                : ""}
            </p>
            {codes.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
                Nothing left to upload
              </p>
            ) : (
              <ul className="max-h-72 space-y-1.5 overflow-y-auto">
                {codes.map((code) => (
                  <li
                    key={code}
                    className="flex items-center gap-2 rounded-xl border border-border px-3 py-2.5"
                  >
                    <span className="min-w-0 flex-1 truncate font-mono text-xs">
                      {code}
                    </span>
                    <button
                      type="button"
                      aria-label={`Remove ${code}`}
                      className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                      onClick={() =>
                        setCodes((prev) => prev.filter((c) => c !== code))
                      }
                    >
                      <X className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <DialogFooter className="mx-0 mb-0 shrink-0 gap-2 border-t border-border/40 bg-muted/20 px-4 py-4 sm:px-5">
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => setReviewOpen(false)}
            >
              Back
            </Button>
            <Button
              type="button"
              disabled={pending || codes.length === 0 || !durationId}
              onClick={() => void confirmUpload()}
            >
              {pending ? "Uploading…" : `Upload ${codes.length}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
