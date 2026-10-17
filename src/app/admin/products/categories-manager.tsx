"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Boxes, FolderTree, Package, Pencil, Plus, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/app-ui";
import { ConfirmDialog, Field, SearchBox, SubmitButton, TableSkeleton, adminFetch, errMsg, useAdminQuery } from "@/components/admin/kit";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CategoryIcon, IconSelect } from "./category-picker";
import type { CategoryRow, ProductRow } from "./types";

export function CategoriesManager() {
  const { data: rows, reload } = useAdminQuery<CategoryRow[]>("/api/admin/categories");
  const products = useAdminQuery<ProductRow[]>("/api/admin/products");
  const [editing, setEditing] = useState<CategoryRow | "new" | null>(null);
  const [assigning, setAssigning] = useState<CategoryRow | null>(null);
  const [del, setDel] = useState<CategoryRow | null>(null);
  const [moving, setMoving] = useState(false);

  const sorted = useMemo(() => [...(rows ?? [])].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)), [rows]);
  const uncategorized = (products.data ?? []).filter((p) => !p.categoryId).length;

  async function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= sorted.length) return;
    const next = [...sorted];
    [next[index], next[target]] = [next[target]!, next[index]!];
    setMoving(true);
    try {
      // Re-number every row so equal/zero sort orders can't tie.
      await Promise.all(
        next.map((c, i) => (c.sortOrder === i ? null : adminFetch(`/api/admin/categories/${c.id}`, { method: "PATCH", json: { sortOrder: i } }))),
      );
      reload();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setMoving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Categories appear as filter chips in the store, in this order. {uncategorized > 0 ? `${uncategorized} product${uncategorized === 1 ? " is" : "s are"} uncategorized.` : ""}
        </p>
        <Button onClick={() => setEditing("new")}>
          <Plus /> New category
        </Button>
      </div>

      {!rows ? (
        <TableSkeleton rows={4} />
      ) : sorted.length === 0 ? (
        <EmptyState icon={FolderTree} title="No categories yet" hint="Create one and pick an icon — it shows next to the name in the store.">
          <Button size="sm" className="mt-3" onClick={() => setEditing("new")}>
            <Plus /> New category
          </Button>
        </EmptyState>
      ) : (
        <ul className="grid gap-2">
          {sorted.map((c, i) => (
            <li key={c.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border bg-card p-3">
              <div className="flex flex-col">
                <Button variant="ghost" size="icon-sm" className="h-5" disabled={moving || i === 0} onClick={() => move(i, -1)} aria-label="Move up">
                  <ArrowUp />
                </Button>
                <Button variant="ghost" size="icon-sm" className="h-5" disabled={moving || i === sorted.length - 1} onClick={() => move(i, 1)} aria-label="Move down">
                  <ArrowDown />
                </Button>
              </div>
              <CategoryIcon icon={c.icon} slug={c.slug} tile />
              <div className="min-w-0 flex-1 basis-40">
                <p className="truncate text-sm font-semibold">{c.name}</p>
                <p className="font-mono text-xs text-muted-foreground">{c.slug}</p>
              </div>
              <Button variant="secondary" size="sm" onClick={() => setAssigning(c)}>
                <Package /> {c._count.products} product{c._count.products === 1 ? "" : "s"}
              </Button>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon-sm" onClick={() => setEditing(c)} aria-label="Edit category">
                  <Pencil />
                </Button>
                <Button variant="ghost" size="icon-sm" className="text-destructive hover:text-destructive" onClick={() => setDel(c)} aria-label="Delete category">
                  <Trash2 />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          {editing !== null ? (
            <CategoryForm
              key={editing === "new" ? "new" : editing.id}
              cat={editing === "new" ? null : editing}
              nextOrder={sorted.length}
              onSaved={() => {
                setEditing(null);
                reload();
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={assigning !== null} onOpenChange={(o) => !o && setAssigning(null)}>
        <DialogContent className="max-w-lg">
          {assigning ? (
            <AssignProducts
              key={assigning.id}
              cat={assigning}
              products={products.data}
              categories={rows ?? []}
              onSaved={() => {
                setAssigning(null);
                reload();
                products.reload();
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!del}
        onOpenChange={(o) => !o && setDel(null)}
        title={`Delete "${del?.name}"?`}
        description="Its products stay in the store as uncategorized."
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          try {
            await adminFetch(`/api/admin/categories/${del!.id}`, { method: "DELETE" });
            toast.success("Category deleted.");
            reload();
            products.reload();
          } catch (e) {
            toast.error(errMsg(e));
          }
        }}
      />
    </div>
  );
}

function CategoryForm({ cat, nextOrder, onSaved }: { cat: CategoryRow | null; nextOrder: number; onSaved: () => void }) {
  const [name, setName] = useState(cat?.name ?? "");
  const [slug, setSlug] = useState(cat?.slug ?? "");
  const [icon, setIcon] = useState(cat?.icon ?? "");
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!name.trim()) return toast.error("Name is required.");
    setBusy(true);
    try {
      const body = { name: name.trim(), slug: slug.trim() || undefined, icon: icon || null, ...(cat ? {} : { sortOrder: nextOrder }) };
      await adminFetch(cat ? `/api/admin/categories/${cat.id}` : "/api/admin/categories", { method: cat ? "PATCH" : "POST", json: body });
      toast.success(cat ? "Category saved." : "Category created.");
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
        <DialogTitle>{cat ? "Edit category" : "New category"}</DialogTitle>
        <DialogDescription>The icon shows beside the name on the store filter chips.</DialogDescription>
      </DialogHeader>
      <div className="flex items-center gap-3 rounded-xl border bg-muted/30 p-3">
        <CategoryIcon icon={icon} slug={slug || name} tile />
        <p className="truncate text-sm font-semibold">{name.trim() || "Category name"}</p>
      </div>
      <Field label="Name">
        <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="Android Mods" autoFocus />
      </Field>
      <Field label="Icon">
        <IconSelect value={icon} onChange={setIcon} />
      </Field>
      <Field label="Slug" hint="Lowercase letters, numbers and dashes. Leave empty to build it from the name.">
        <Input value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase())} placeholder="auto" />
      </Field>
      <DialogFooter>
        <SubmitButton busy={busy} onClick={save}>
          {cat ? "Save" : "Create"}
        </SubmitButton>
      </DialogFooter>
    </>
  );
}

function AssignProducts({
  cat,
  products,
  categories,
  onSaved,
}: {
  cat: CategoryRow;
  products: ProductRow[] | null;
  categories: CategoryRow[];
  onSaved: () => void;
}) {
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<Set<string> | null>(null);
  const [busy, setBusy] = useState(false);

  const selected = picked ?? new Set((products ?? []).filter((p) => p.categoryId === cat.id).map((p) => p.id));
  const nameOf = (id: string | null) => categories.find((c) => c.id === id)?.name;
  const list = (products ?? []).filter((p) => !q.trim() || p.title.toLowerCase().includes(q.trim().toLowerCase()));

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setPicked(next);
  }

  async function save() {
    setBusy(true);
    try {
      await adminFetch(`/api/admin/categories/${cat.id}`, { method: "PATCH", json: { productIds: [...selected] } });
      toast.success("Products updated.");
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
        <DialogTitle>Products in “{cat.name}”</DialogTitle>
        <DialogDescription>Tick to add, untick to remove. A product lives in one category — ticking moves it here.</DialogDescription>
      </DialogHeader>
      <SearchBox value={q} onChange={setQ} placeholder="Search products…" className="sm:w-full" />
      {!products ? (
        <TableSkeleton rows={4} />
      ) : (
        <ScrollArea className="h-72 rounded-lg border">
          <ul className="divide-y">
            {list.length === 0 ? <li className="p-4 text-center text-sm text-muted-foreground">No products.</li> : null}
            {list.map((p) => {
              const other = p.categoryId && p.categoryId !== cat.id ? nameOf(p.categoryId) : null;
              return (
                <li key={p.id}>
                  <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-accent/50">
                    <Checkbox checked={selected.has(p.id)} onCheckedChange={() => toggle(p.id)} />
                    <span className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-md border bg-muted">
                      {p.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.imageUrl} alt="" className="size-full object-cover" />
                      ) : (
                        <Boxes className="size-3.5 text-muted-foreground" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{p.title}</span>
                    {other ? <span className="shrink-0 text-xs text-muted-foreground">in {other}</span> : null}
                  </label>
                </li>
              );
            })}
          </ul>
        </ScrollArea>
      )}
      <DialogFooter>
        <span className="mr-auto self-center text-xs text-muted-foreground">{selected.size} selected</span>
        <SubmitButton busy={busy} onClick={save} disabled={!products}>
          Save
        </SubmitButton>
      </DialogFooter>
    </>
  );
}
