"use client";

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
import { FolderTree } from "lucide-react";

import { CategoryIconPicker } from "@/components/admin/categories/category-icon-picker";
import { getCategoryLucideIcon } from "@/lib/category-icons";

export type CategoryFormState = {
  name: string;
  slug: string;
  icon: string;
  sortOrder: string;
};

export const emptyCategoryForm: CategoryFormState = {
  name: "",
  slug: "",
  icon: "",
  sortOrder: "0",
};

export function AdminCategoryDialog({
  open,
  onOpenChange,
  mode,
  form,
  onFormChange,
  pending,
  onSubmit,
  onDelete,
  productCount,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  form: CategoryFormState;
  onFormChange: (next: CategoryFormState) => void;
  pending: boolean;
  onSubmit: () => void;
  onDelete?: () => void;
  productCount?: number;
}) {
  function patch<K extends keyof CategoryFormState>(
    key: K,
    value: CategoryFormState[K],
  ) {
    onFormChange({ ...form, [key]: value });
  }

  const HeaderIcon = getCategoryLucideIcon(form.icon, form.slug);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(92dvh,640px)] w-full max-w-[calc(100%-1.25rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
        <div className="shrink-0 border-b border-border/40 bg-muted/40 px-4 pt-4 pb-3.5 sm:px-5">
          <DialogHeader className="gap-1.5 pr-8 text-left">
            <div className="mb-1 flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <HeaderIcon className="size-5" />
            </div>
            <DialogTitle className="text-lg">
              {mode === "create" ? "Add category" : "Edit category"}
            </DialogTitle>
            <DialogDescription>
              Folders for the catalog. Deleting orphans products to Uncategorized.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
          <div className="space-y-1.5">
            <Label
              htmlFor="cat-name"
              className="text-[11px] tracking-wide text-muted-foreground uppercase"
            >
              Name
            </Label>
            <Input
              id="cat-name"
              value={form.name}
              onChange={(e) => patch("name", e.target.value)}
              placeholder="Mods"
              className="h-10"
            />
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="cat-icon"
              className="text-[11px] tracking-wide text-muted-foreground uppercase"
            >
              Category Icon (Lucide React)
            </Label>
            <CategoryIconPicker
              value={form.icon}
              onChange={(val) => patch("icon", val)}
              disabled={pending}
            />
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="cat-slug"
              className="text-[11px] tracking-wide text-muted-foreground uppercase"
            >
              Slug
            </Label>
            <Input
              id="cat-slug"
              value={form.slug}
              onChange={(e) =>
                patch(
                  "slug",
                  e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
                )
              }
              placeholder="auto from name if blank"
              className="h-10 font-mono text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label
              htmlFor="cat-sort"
              className="text-[11px] tracking-wide text-muted-foreground uppercase"
            >
              Sort order
            </Label>
            <Input
              id="cat-sort"
              type="number"
              value={form.sortOrder}
              onChange={(e) => patch("sortOrder", e.target.value)}
              className="h-10"
            />
          </div>
          {mode === "edit" && productCount != null ? (
            <p className="rounded-xl bg-card ring-1 ring-foreground/10 px-3.5 py-3 text-xs text-muted-foreground">
              {productCount} product{productCount === 1 ? "" : "s"} in this
              folder.
            </p>
          ) : null}
        </div>

        <DialogFooter className="mx-0 mb-0 shrink-0 gap-2 border-t border-border/40 bg-muted/20 px-4 py-4 sm:justify-between sm:px-5">
          {mode === "edit" && onDelete ? (
            <Button
              type="button"
              variant="destructive"
              disabled={pending}
              onClick={onDelete}
            >
              Delete
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="button" disabled={pending} onClick={onSubmit}>
              {pending ? "Saving…" : "Save"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
