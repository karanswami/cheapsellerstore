"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Package, Search } from "lucide-react";
import { useMemo, useState } from "react";

export type AssignableProduct = {
  id: string;
  title: string;
  isActive: boolean;
  categoryId: string | null;
};

export function AdminAssignProductsDialog({
  open,
  onOpenChange,
  categoryName,
  products,
  selectedIds,
  onSelectedIdsChange,
  pending,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryName: string;
  products: AssignableProduct[];
  selectedIds: string[];
  onSelectedIdsChange: (ids: string[]) => void;
  pending: boolean;
  onSave: () => void;
}) {
  const [query, setQuery] = useState("");
  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => !q || p.title.toLowerCase().includes(q));
  }, [products, query]);

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectedIdsChange([...next]);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) setQuery("");
        onOpenChange(v);
      }}
    >
      <DialogContent className="flex max-h-[min(92dvh,720px)] w-full max-w-[calc(100%-1.25rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
        <div className="shrink-0 border-b border-border/40 bg-muted/40 px-4 pt-4 pb-3.5 sm:px-5">
          <DialogHeader className="gap-1.5 pr-8 text-left">
            <div className="mb-1 flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Package className="size-5" />
            </div>
            <DialogTitle className="text-lg">Assign products</DialogTitle>
            <DialogDescription>
              Choose which products belong in “{categoryName}”. Unchecked items
              leave this folder.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="shrink-0 border-b border-border px-4 py-3 sm:px-5">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products…"
              className="h-10 pl-9"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2 sm:px-3">
          {filtered.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              No products match.
            </p>
          ) : (
            <ul className="space-y-1">
              {filtered.map((p) => {
                const checked = selected.has(p.id);
                return (
                  <li key={p.id}>
                    <label
                      className={cn(
                        "flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors",
                        checked ? "bg-primary/10" : "hover:bg-muted/60",
                      )}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggle(p.id)}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{p.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {p.isActive ? "Active" : "Off"}
                          {p.categoryId && !checked ? " · other folder" : ""}
                        </p>
                      </div>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <DialogFooter className="mx-0 mb-0 shrink-0 gap-2 border-t border-border/40 bg-muted/20 px-4 py-4 sm:px-5">
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="button" disabled={pending} onClick={onSave}>
            {pending ? "Saving…" : `Save (${selectedIds.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
