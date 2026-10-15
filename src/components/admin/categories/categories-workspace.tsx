"use client";

import {
  AdminEmptyState,
  AdminListSkeleton,
  AdminPageHeader,
} from "@/components/admin/admin-page-header";
import {
  AdminAssignProductsDialog,
  type AssignableProduct,
} from "@/components/admin/categories/admin-assign-products-dialog";
import {
  AdminCategoryDialog,
  emptyCategoryForm,
  type CategoryFormState,
} from "@/components/admin/categories/admin-category-dialog";
import { adminMutate, useAdminFetch } from "@/components/admin/use-admin-fetch";
import { getCategoryLucideIcon } from "@/lib/category-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronRight, PackagePlus, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  icon?: string | null;
  sortOrder: number;
  _count: { products: number };
};

type ProductRow = {
  id: string;
  title: string;
  isActive: boolean;
  categoryId: string | null;
};

export function CategoriesWorkspace() {
  const { data, loading, reload } = useAdminFetch<CategoryRow[]>(
    "/api/admin/categories",
  );
  const { data: productsData, reload: reloadProducts } = useAdminFetch<ProductRow[]>(
    "/api/admin/products",
  );

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryRow | null>(null);
  const [form, setForm] = useState<CategoryFormState>(emptyCategoryForm);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pending, setPending] = useState(false);

  const categories = data ?? [];
  const products = productsData ?? [];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return categories.filter(
      (c) =>
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q) ||
        (c.icon && c.icon.toLowerCase().includes(q)),
    );
  }, [categories, query]);

  const assignable: AssignableProduct[] = useMemo(
    () =>
      products.map((p) => ({
        id: p.id,
        title: p.title,
        isActive: p.isActive,
        categoryId: p.categoryId,
      })),
    [products],
  );

  function openCreate() {
    setEditing(null);
    setForm(emptyCategoryForm);
    setOpen(true);
  }

  function openEdit(cat: CategoryRow) {
    setEditing(cat);
    setForm({
      name: cat.name,
      slug: cat.slug,
      icon: cat.icon ?? "",
      sortOrder: String(cat.sortOrder),
    });
    setOpen(true);
  }

  function openAssign(cat: CategoryRow) {
    setEditing(cat);
    setSelectedIds(
      products.filter((p) => p.categoryId === cat.id).map((p) => p.id),
    );
    setAssignOpen(true);
  }

  async function saveCategory() {
    if (!form.name.trim()) {
      toast.error("Name is required.");
      return;
    }
    setPending(true);
    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim() || undefined,
      icon: form.icon.trim() || null,
      sortOrder: Number.parseInt(form.sortOrder, 10) || 0,
    };
    const result = editing
      ? await adminMutate(`/api/admin/categories/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        })
      : await adminMutate("/api/admin/categories", {
          method: "POST",
          body: JSON.stringify(payload),
        });
    setPending(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success(editing ? "Category updated" : "Category created");
    setOpen(false);
    setEditing(null);
    setForm(emptyCategoryForm);
    void reload();
  }

  async function deleteCategory() {
    if (!editing) return;
    if (
      !window.confirm(
        `Delete “${editing.name}”? Products will become Uncategorized.`,
      )
    ) {
      return;
    }
    setPending(true);
    const result = await adminMutate(`/api/admin/categories/${editing.id}`, {
      method: "DELETE",
    });
    setPending(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success("Category deleted");
    setOpen(false);
    setEditing(null);
    void reload();
    void reloadProducts();
  }

  async function saveAssign() {
    if (!editing) return;
    setPending(true);
    const result = await adminMutate(`/api/admin/categories/${editing.id}`, {
      method: "PATCH",
      body: JSON.stringify({ productIds: selectedIds }),
    });
    setPending(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success("Products updated");
    setAssignOpen(false);
    void reload();
    void reloadProducts();
  }

  return (
    <main className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <AdminPageHeader
          title="Categories"
          description="Catalog folders — assign or orphan products"
        />
        <Button size="sm" onClick={openCreate}>
          <Plus data-icon="inline-start" />
          Add category
        </Button>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search folders…"
          className="h-10 pl-9"
        />
      </div>

      {loading ? (
        <AdminListSkeleton />
      ) : filtered.length === 0 ? (
        <AdminEmptyState message="No categories yet. Add a folder to organize products." />
      ) : (
        <ul className="divide-y divide-border/40 overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
          {filtered.map((cat) => {
            const CatIcon = getCategoryLucideIcon(cat.icon, cat.slug);
            return (
              <li key={cat.id}>
                <div className="flex items-stretch gap-1 transition-colors hover:bg-muted/40">
                  <button
                    type="button"
                    onClick={() => openEdit(cat)}
                    className="flex min-w-0 flex-1 items-center gap-3.5 px-3.5 py-3.5 text-left"
                  >
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <CatIcon className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="truncate text-sm font-semibold">{cat.name}</p>
                        <Badge variant="secondary" className="font-normal">
                          {cat._count.products} product
                          {cat._count.products === 1 ? "" : "s"}
                        </Badge>
                        {cat.icon ? (
                          <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground">
                            {cat.icon}
                          </Badge>
                        ) : null}
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        /{cat.slug} · sort {cat.sortOrder}
                      </p>
                    </div>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                  </button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="my-auto mr-2 shrink-0"
                    title="Assign products"
                    onClick={() => openAssign(cat)}
                  >
                    <PackagePlus className="size-4" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <AdminCategoryDialog
        open={open}
        onOpenChange={setOpen}
        mode={editing ? "edit" : "create"}
        form={form}
        onFormChange={setForm}
        pending={pending}
        onSubmit={() => void saveCategory()}
        onDelete={editing ? () => void deleteCategory() : undefined}
        productCount={editing?._count.products}
      />

      <AdminAssignProductsDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        categoryName={editing?.name ?? ""}
        products={assignable}
        selectedIds={selectedIds}
        onSelectedIdsChange={setSelectedIds}
        pending={pending}
        onSave={() => void saveAssign()}
      />
    </main>
  );
}
