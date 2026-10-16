"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Boxes, ChevronDown, ChevronRight, FolderTree, MoreHorizontal, Pencil, Pin, Plus, Sparkles, Star, Trash2, Wrench } from "lucide-react";
import { EmptyState } from "@/components/app-ui";
import {
  ConfirmDialog,
  Field,
  ImageUpload,
  SearchBox,
  SubmitButton,
  TableSkeleton,
  ToggleRow,
  adminFetch,
  errMsg,
  useAdminQuery,
  useDebounced,
} from "@/components/admin/kit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { formatMoney, microcentsToUsd } from "@/lib/currencies";

type Price = { id: string; price: number; resellerPrice: number; buyPrice: number };
type DurationRow = {
  id: string;
  label: string;
  version: string;
  days: number | null;
  apiCode: string | null;
  supplierProductId: number | null;
  requiresAndroidId: boolean;
  deviceIdName: string;
  prices: Price[];
  available: number;
  sold: number;
};
type CategoryRow = { id: string; name: string; slug: string; icon: string | null; sortOrder: number; _count: { products: number } };
type ProductRow = {
  id: string;
  title: string;
  description: string;
  apiCode: string | null;
  imageUrl: string | null;
  demoUrl: string | null;
  features: string[];
  isBestSeller: boolean;
  isNew: boolean;
  isPinned: boolean;
  isMaintenance: boolean;
  isActive: boolean;
  categoryId: string | null;
  category: CategoryRow | null;
  durations: DurationRow[];
  keyAvailable: number;
  keySold: number;
};

export function AdminProductsClient() {
  return (
    <Tabs defaultValue="products" className="space-y-4">
      <TabsList>
        <TabsTrigger value="products">
          <Boxes className="size-4" /> Products
        </TabsTrigger>
        <TabsTrigger value="categories">
          <FolderTree className="size-4" /> Categories
        </TabsTrigger>
      </TabsList>
      <TabsContent value="products">
        <ProductsTab />
      </TabsContent>
      <TabsContent value="categories">
        <CategoriesTab />
      </TabsContent>
    </Tabs>
  );
}

/* ───────────────────────────── Products ───────────────────────────── */

function ProductsTab() {
  const [q, setQ] = useState("");
  const [active, setActive] = useState("all");
  const [categoryId, setCategoryId] = useState("all");
  const dq = useDebounced(q);
  return <ProductsTable q={dq} rawQ={q} setQ={setQ} active={active} setActive={setActive} categoryId={categoryId} setCategoryId={setCategoryId} />;
}

function useProducts(q: string, active: string, categoryId: string) {
  const qs = new URLSearchParams();
  if (q) qs.set("q", q);
  if (active !== "all") qs.set("active", active);
  if (categoryId !== "all") qs.set("categoryId", categoryId);
  const { data, reload, error } = useAdminQuery<ProductRow[]>(`/api/admin/products?${qs}`);
  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);
  return { rows: data, reload };
}

function ProductsTable({
  q,
  rawQ,
  setQ,
  active,
  setActive,
  categoryId,
  setCategoryId,
}: {
  q: string;
  rawQ: string;
  setQ: (v: string) => void;
  active: string;
  setActive: (v: string) => void;
  categoryId: string;
  setCategoryId: (v: string) => void;
}) {
  const { rows, reload } = useProducts(q, active, categoryId);
  const categories = useAdminQuery<CategoryRow[]>("/api/admin/categories").data ?? [];

  const [open, setOpen] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<ProductRow | "new" | null>(null);
  const [durationFor, setDurationFor] = useState<{ product: ProductRow; duration: DurationRow | null } | null>(null);
  const [toDelete, setToDelete] = useState<ProductRow | null>(null);
  const [delDuration, setDelDuration] = useState<DurationRow | null>(null);

  function toggle(id: string) {
    setOpen((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  async function quick(p: ProductRow, patch: Partial<ProductRow>) {
    try {
      await adminFetch(`/api/admin/products/${p.id}`, { method: "PATCH", json: patch });
      reload();
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row">
          <SearchBox value={rawQ} onChange={setQ} placeholder="Search products…" />
          <Select value={active} onValueChange={setActive}>
            <SelectTrigger className="w-full sm:w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="true">Active</SelectItem>
              <SelectItem value="false">Archived</SelectItem>
            </SelectContent>
          </Select>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              <SelectItem value="none">Uncategorized</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setEditing("new")}>
          <Plus /> New product
        </Button>
      </div>

      <div className="rounded-xl border bg-card">
        {!rows ? (
          <TableSkeleton />
        ) : rows.length === 0 ? (
          <div className="p-6">
            <EmptyState icon={Boxes} title="No products" hint="Create your first product to start selling." />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>Product</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead>Flags</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((p) => {
                const isOpen = open.has(p.id);
                return (
                  <ProductRows
                    key={p.id}
                    p={p}
                    isOpen={isOpen}
                    onToggle={() => toggle(p.id)}
                    onEdit={() => setEditing(p)}
                    onAddDuration={() => setDurationFor({ product: p, duration: null })}
                    onEditDuration={(d) => setDurationFor({ product: p, duration: d })}
                    onDeleteDuration={setDelDuration}
                    onDelete={() => setToDelete(p)}
                    onActive={(v) => quick(p, { isActive: v })}
                    onPin={() => quick(p, { isPinned: !p.isPinned })}
                  />
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <ProductSheet
        target={editing}
        categories={categories}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          reload();
        }}
      />
      <DurationDialog
        target={durationFor}
        onClose={() => setDurationFor(null)}
        onSaved={() => {
          setDurationFor(null);
          reload();
        }}
      />
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={`Delete "${toDelete?.title}"?`}
        description="Unsold keys are removed. If the product has purchase history it is archived instead of deleted."
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          try {
            const r = await adminFetch<{ mode: string }>(`/api/admin/products/${toDelete!.id}`, { method: "DELETE" });
            toast.success(r.mode === "archived" ? "Product archived (has sales history)." : "Product deleted.");
            reload();
          } catch (e) {
            toast.error(errMsg(e));
          }
        }}
      />
      <ConfirmDialog
        open={!!delDuration}
        onOpenChange={(o) => !o && setDelDuration(null)}
        title={`Delete duration "${delDuration?.label}"?`}
        description="Only possible when the duration has no keys."
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          try {
            await adminFetch(`/api/admin/durations/${delDuration!.id}`, { method: "DELETE" });
            toast.success("Duration deleted.");
            reload();
          } catch (e) {
            toast.error(errMsg(e));
          }
        }}
      />
    </div>
  );
}

function ProductRows({
  p,
  isOpen,
  onToggle,
  onEdit,
  onAddDuration,
  onEditDuration,
  onDeleteDuration,
  onDelete,
  onActive,
  onPin,
}: {
  p: ProductRow;
  isOpen: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onAddDuration: () => void;
  onEditDuration: (d: DurationRow) => void;
  onDeleteDuration: (d: DurationRow) => void;
  onDelete: () => void;
  onActive: (v: boolean) => void;
  onPin: () => void;
}) {
  return (
    <>
      <TableRow>
        <TableCell>
          <Button variant="ghost" size="icon-sm" onClick={onToggle} aria-label="Toggle durations">
            {isOpen ? <ChevronDown /> : <ChevronRight />}
          </Button>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-3">
            <div className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg border bg-muted">
              {p.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.imageUrl} alt="" className="size-full object-cover" />
              ) : (
                <Boxes className="size-4 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{p.title}</p>
              <p className="text-xs text-muted-foreground">
                {p.durations.length} duration{p.durations.length === 1 ? "" : "s"}
                {p.apiCode ? ` · ${p.apiCode}` : ""}
              </p>
            </div>
          </div>
        </TableCell>
        <TableCell className="text-sm">{p.category?.name ?? <span className="text-muted-foreground">—</span>}</TableCell>
        <TableCell className="text-right text-sm">
          <span className="font-semibold">{p.keyAvailable}</span> <span className="text-muted-foreground">/ {p.keySold} sold</span>
        </TableCell>
        <TableCell>
          <div className="flex flex-wrap gap-1">
            {p.isPinned ? <Badge variant="default"><Pin /> Pinned</Badge> : null}
            {p.isBestSeller ? <Badge variant="highlight"><Star /> Best</Badge> : null}
            {p.isNew ? <Badge variant="success"><Sparkles /> New</Badge> : null}
            {p.isMaintenance ? <Badge variant="warning"><Wrench /> Maint.</Badge> : null}
          </div>
        </TableCell>
        <TableCell>
          <Switch checked={p.isActive} onCheckedChange={onActive} aria-label="Active" />
        </TableCell>
        <TableCell>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Actions">
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Pencil /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onAddDuration}>
                <Plus /> Add duration
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onPin}>
                <Pin /> {p.isPinned ? "Unpin" : "Pin to top"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={onDelete}>
                <Trash2 /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>
      {isOpen ? (
        <TableRow className="bg-muted/30 hover:bg-muted/30">
          <TableCell />
          <TableCell colSpan={6}>
            <div className="space-y-2 py-1">
              {p.durations.length === 0 ? <p className="text-sm text-muted-foreground">No durations yet.</p> : null}
              {p.durations.map((d) => {
                const price = d.prices[0];
                return (
                  <div key={d.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border bg-card px-3 py-2 text-sm">
                    <span className="min-w-32 font-medium">
                      {d.version ? <Badge variant="outline" className="mr-1.5">{d.version}</Badge> : null}
                      {d.label}
                    </span>
                    <span className="text-muted-foreground">User {price ? formatMoney(price.price) : "—"}</span>
                    <span className="text-muted-foreground">Seller {price ? formatMoney(price.resellerPrice) : "—"}</span>
                    <span className="text-muted-foreground">Cost {price ? formatMoney(price.buyPrice) : "—"}</span>
                    <span className="text-muted-foreground">
                      {d.available} in stock · {d.sold} sold
                    </span>
                    {d.supplierProductId ? <Badge variant="muted">Supplier #{d.supplierProductId}</Badge> : null}
                    <span className="ml-auto flex gap-1">
                      <Button variant="ghost" size="icon-sm" onClick={() => onEditDuration(d)} aria-label="Edit duration">
                        <Pencil />
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => onDeleteDuration(d)} aria-label="Delete duration">
                        <Trash2 />
                      </Button>
                    </span>
                  </div>
                );
              })}
              <Button variant="secondary" size="sm" onClick={onAddDuration}>
                <Plus /> Add duration
              </Button>
            </div>
          </TableCell>
        </TableRow>
      ) : null}
    </>
  );
}

function ProductSheet({
  target,
  categories,
  onClose,
  onSaved,
}: {
  target: ProductRow | "new" | null;
  categories: CategoryRow[];
  onClose: () => void;
  onSaved: () => void;
}) {
  return (
    <Sheet open={target !== null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        {target !== null ? <ProductForm key={target === "new" ? "new" : target.id} target={target} categories={categories} onSaved={onSaved} /> : null}
      </SheetContent>
    </Sheet>
  );
}

function ProductForm({ target, categories, onSaved }: { target: ProductRow | "new"; categories: CategoryRow[]; onSaved: () => void }) {
  const p = target === "new" ? null : target;
  const [title, setTitle] = useState(p?.title ?? "");
  const [description, setDescription] = useState(p?.description ?? "");
  const [apiCode, setApiCode] = useState(p?.apiCode ?? "");
  const [categoryId, setCategoryId] = useState(p?.categoryId ?? "none");
  const [features, setFeatures] = useState((p?.features ?? []).join("\n"));
  const [imageUrl, setImageUrl] = useState<string | null>(p?.imageUrl ?? null);
  const [demoUrl, setDemoUrl] = useState(p?.demoUrl ?? "");
  const [flags, setFlags] = useState({
    isActive: p?.isActive ?? true,
    isPinned: p?.isPinned ?? false,
    isBestSeller: p?.isBestSeller ?? false,
    isNew: p?.isNew ?? false,
    isMaintenance: p?.isMaintenance ?? false,
  });
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!title.trim() || !description.trim()) return toast.error("Title and description are required.");
    setBusy(true);
    try {
      const body = {
        title: title.trim(),
        description: description.trim(),
        apiCode: apiCode.trim() || null,
        categoryId: categoryId === "none" ? null : categoryId,
        features: features.split("\n").map((f) => f.trim()).filter(Boolean),
        imageUrl,
        demoUrl: demoUrl.trim() || null,
        ...flags,
      };
      await adminFetch(p ? `/api/admin/products/${p.id}` : "/api/admin/products", { method: p ? "PATCH" : "POST", json: body });
      toast.success(p ? "Product saved." : "Product created.");
      onSaved();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <SheetHeader>
        <SheetTitle>{p ? "Edit product" : "New product"}</SheetTitle>
        <SheetDescription>{p ? p.title : "Add durations after saving."}</SheetDescription>
      </SheetHeader>
      <div className="grid gap-4 px-4">
        <ImageUpload value={imageUrl} onChange={setImageUrl} endpoint="/api/admin/products/upload" label="Cover image" />
        <Field label="Title">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
        </Field>
        <Field label="Description">
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} maxLength={2000} />
        </Field>
        <Field label="Category">
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Uncategorized</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Features" hint="One per line.">
          <Textarea value={features} onChange={(e) => setFeatures(e.target.value)} rows={4} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="API code" hint="Platform API SKU. Leave empty to auto-generate.">
            <Input value={apiCode} onChange={(e) => setApiCode(e.target.value)} maxLength={64} />
          </Field>
          <Field label="Demo URL">
            <Input value={demoUrl} onChange={(e) => setDemoUrl(e.target.value)} placeholder="https://" />
          </Field>
        </div>
        <div className="grid gap-2">
          <ToggleRow label="Active" hint="Visible in the store." checked={flags.isActive} onChange={(v) => setFlags({ ...flags, isActive: v })} />
          <ToggleRow label="Pinned" hint="Sorted above everything else." checked={flags.isPinned} onChange={(v) => setFlags({ ...flags, isPinned: v })} />
          <ToggleRow label="Best seller" checked={flags.isBestSeller} onChange={(v) => setFlags({ ...flags, isBestSeller: v })} />
          <ToggleRow label="New" checked={flags.isNew} onChange={(v) => setFlags({ ...flags, isNew: v })} />
          <ToggleRow label="Maintenance" hint="Disables buying and shows an overlay." checked={flags.isMaintenance} onChange={(v) => setFlags({ ...flags, isMaintenance: v })} />
        </div>
      </div>
      <SheetFooter>
        <SubmitButton busy={busy} onClick={save}>
          {p ? "Save changes" : "Create product"}
        </SubmitButton>
      </SheetFooter>
    </>
  );
}

function DurationDialog({
  target,
  onClose,
  onSaved,
}: {
  target: { product: ProductRow; duration: DurationRow | null } | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">{target ? <DurationForm key={target.duration?.id ?? "new"} target={target} onSaved={onSaved} /> : null}</DialogContent>
    </Dialog>
  );
}

const usd = (mc: number | undefined) => (mc === undefined ? "" : String(microcentsToUsd(mc)));

function DurationForm({ target, onSaved }: { target: { product: ProductRow; duration: DurationRow | null }; onSaved: () => void }) {
  const d = target.duration;
  const price = d?.prices[0];
  const [label, setLabel] = useState(d?.label ?? "");
  const [version, setVersion] = useState(d?.version ?? "");
  const [days, setDays] = useState(d?.days ? String(d.days) : "");
  const [userPrice, setUserPrice] = useState(usd(price?.price));
  const [sellerPrice, setSellerPrice] = useState(usd(price?.resellerPrice));
  const [cost, setCost] = useState(usd(price?.buyPrice));
  const [apiCode, setApiCode] = useState(d?.apiCode ?? "");
  const [supplierId, setSupplierId] = useState(d?.supplierProductId ? String(d.supplierProductId) : "");
  const [needsAndroid, setNeedsAndroid] = useState(d?.requiresAndroidId ?? false);
  const [deviceIdName, setDeviceIdName] = useState(d?.deviceIdName ?? "");
  const [busy, setBusy] = useState(false);

  async function save() {
    const p = Number(userPrice);
    if (!label.trim() || !(p > 0)) return toast.error("Label and a user price are required.");
    setBusy(true);
    try {
      const body = {
        label: label.trim(),
        version: version.trim(),
        days: days ? Number(days) : null,
        apiCode: apiCode.trim() || null,
        supplierProductId: supplierId ? Number(supplierId) : null,
        requiresAndroidId: needsAndroid,
        deviceIdName: deviceIdName.trim(),
        prices: [{ currency: "USD", price: p, resellerPrice: Number(sellerPrice) || 0, buyPrice: Number(cost) || 0 }],
      };
      await adminFetch(d ? `/api/admin/durations/${d.id}` : "/api/admin/durations", {
        method: d ? "PATCH" : "POST",
        json: d ? body : { ...body, productId: target.product.id },
      });
      toast.success(d ? "Duration saved." : "Duration added.");
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
        <DialogTitle>{d ? "Edit duration" : "Add duration"}</DialogTitle>
        <DialogDescription>{target.product.title}</DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Label">
          <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="1 Day" />
        </Field>
        <Field label="Version" hint="Optional group, e.g. Lite.">
          <Input value={version} onChange={(e) => setVersion(e.target.value)} />
        </Field>
        <Field label="User price (USD)">
          <Input type="number" min="0" step="0.01" value={userPrice} onChange={(e) => setUserPrice(e.target.value)} />
        </Field>
        <Field label="Seller price (USD)">
          <Input type="number" min="0" step="0.01" value={sellerPrice} onChange={(e) => setSellerPrice(e.target.value)} />
        </Field>
        <Field label="Cost (USD)" hint="Admin stats only.">
          <Input type="number" min="0" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} />
        </Field>
        <Field label="Days">
          <Input type="number" min="1" value={days} onChange={(e) => setDays(e.target.value)} />
        </Field>
        <Field label="API code">
          <Input value={apiCode} onChange={(e) => setApiCode(e.target.value)} />
        </Field>
        <Field label="Supplier product ID" hint="Empty = local stock only.">
          <Input type="number" min="1" value={supplierId} onChange={(e) => setSupplierId(e.target.value)} />
        </Field>
      </div>
      <ToggleRow label="Requires Android ID" hint="Buyer must enter a device ID." checked={needsAndroid} onChange={setNeedsAndroid} />
      {needsAndroid ? (
        <Field label="Device ID field name">
          <Input value={deviceIdName} onChange={(e) => setDeviceIdName(e.target.value)} placeholder="Android ID" />
        </Field>
      ) : null}
      <DialogFooter>
        <SubmitButton busy={busy} onClick={save}>
          {d ? "Save changes" : "Add duration"}
        </SubmitButton>
      </DialogFooter>
    </>
  );
}

/* ──────────────────────────── Categories ──────────────────────────── */

function CategoriesTab() {
  const { data: rows, reload } = useAdminQuery<CategoryRow[]>("/api/admin/categories");
  const [editing, setEditing] = useState<CategoryRow | "new" | null>(null);
  const [del, setDel] = useState<CategoryRow | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setEditing("new")}>
          <Plus /> New category
        </Button>
      </div>
      <div className="rounded-xl border bg-card">
        {!rows ? (
          <TableSkeleton rows={4} />
        ) : rows.length === 0 ? (
          <div className="p-6">
            <EmptyState icon={FolderTree} title="No categories" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Icon</TableHead>
                <TableHead className="text-right">Order</TableHead>
                <TableHead className="text-right">Products</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{c.slug}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{c.icon ?? "—"}</TableCell>
                  <TableCell className="text-right">{c.sortOrder}</TableCell>
                  <TableCell className="text-right">{c._count.products}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon-sm" onClick={() => setEditing(c)} aria-label="Edit">
                        <Pencil />
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => setDel(c)} aria-label="Delete">
                        <Trash2 />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          {editing !== null ? (
            <CategoryForm
              key={editing === "new" ? "new" : editing.id}
              cat={editing === "new" ? null : editing}
              onSaved={() => {
                setEditing(null);
                reload();
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
          } catch (e) {
            toast.error(errMsg(e));
          }
        }}
      />
    </div>
  );
}

function CategoryForm({ cat, onSaved }: { cat: CategoryRow | null; onSaved: () => void }) {
  const [name, setName] = useState(cat?.name ?? "");
  const [slug, setSlug] = useState(cat?.slug ?? "");
  const [icon, setIcon] = useState(cat?.icon ?? "");
  const [sortOrder, setSortOrder] = useState(String(cat?.sortOrder ?? 0));
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!name.trim()) return toast.error("Name is required.");
    setBusy(true);
    try {
      const body = { name: name.trim(), slug: slug.trim() || undefined, icon: icon.trim() || null, sortOrder: Math.trunc(Number(sortOrder)) || 0 };
      await adminFetch(cat ? `/api/admin/categories/${cat.id}` : "/api/admin/categories", { method: cat ? "PATCH" : "POST", json: body });
      toast.success("Category saved.");
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
        <DialogDescription>Categories group products in the store sidebar.</DialogDescription>
      </DialogHeader>
      <Field label="Name">
        <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Slug" hint="Lowercase letters, numbers and dashes.">
          <Input value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase())} placeholder="auto" />
        </Field>
        <Field label="Lucide icon name" hint="e.g. Flame">
          <Input value={icon} onChange={(e) => setIcon(e.target.value)} maxLength={50} />
        </Field>
      </div>
      <Field label="Sort order">
        <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
      </Field>
      <DialogFooter>
        <SubmitButton busy={busy} onClick={save}>
          Save
        </SubmitButton>
      </DialogFooter>
    </>
  );
}
