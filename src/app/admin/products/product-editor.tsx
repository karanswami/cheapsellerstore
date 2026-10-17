"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Boxes,
  Clock,
  Eye,
  Pencil,
  Pin,
  Plus,
  Smartphone,
  Sparkles,
  Star,
  Trash2,
  Wrench,
  X,
} from "lucide-react";
import { EmptyState, Panel } from "@/components/app-ui";
import { ConfirmDialog, Field, ImageUpload, SubmitButton, TableSkeleton, adminFetch, errMsg, useAdminQuery } from "@/components/admin/kit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { CategoryIcon, CategorySelect } from "./category-picker";
import { DurationDialog } from "./duration-dialog";
import { formatLength, rowToDraft, usd, type CategoryRow, type DurationDraft, type ProductRow } from "./types";

type Flags = { isActive: boolean; isPinned: boolean; isBestSeller: boolean; isNew: boolean; isMaintenance: boolean };

const FLAG_CHIPS: { key: keyof Flags; label: string; hint: string; icon: typeof Eye }[] = [
  { key: "isActive", label: "Active", hint: "Visible in the store", icon: Eye },
  { key: "isPinned", label: "Pinned", hint: "Sorted above everything", icon: Pin },
  { key: "isBestSeller", label: "Best seller", hint: "Gets the badge", icon: Star },
  { key: "isNew", label: "New", hint: "Gets the badge", icon: Sparkles },
  { key: "isMaintenance", label: "Maintenance", hint: "Buying disabled", icon: Wrench },
];

export function ProductEditor({ productId }: { productId?: string }) {
  const product = useAdminQuery<ProductRow>(productId ? `/api/admin/products/${productId}` : null);
  const categories = useAdminQuery<CategoryRow[]>("/api/admin/categories");

  if (productId && !product.data) {
    return product.error ? <p className="text-sm text-destructive">{product.error}</p> : <TableSkeleton rows={6} />;
  }
  return (
    <EditorBody
      key={productId ?? "new"}
      product={product.data}
      categories={categories.data ?? []}
      reload={product.reload}
    />
  );
}

function EditorBody({ product, categories, reload }: { product: ProductRow | null; categories: CategoryRow[]; reload: () => void }) {
  const router = useRouter();
  const isNew = !product;

  const [title, setTitle] = useState(product?.title ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [features, setFeatures] = useState<string[]>(product?.features ?? []);
  const [featureDraft, setFeatureDraft] = useState("");
  const [demoUrl, setDemoUrl] = useState(product?.demoUrl ?? "");
  const [imageUrl, setImageUrl] = useState<string | null>(product?.imageUrl ?? null);
  const [categoryId, setCategoryId] = useState<string | null>(product?.categoryId ?? null);
  const [flags, setFlags] = useState<Flags>({
    isActive: product?.isActive ?? true,
    isPinned: product?.isPinned ?? false,
    isBestSeller: product?.isBestSeller ?? false,
    isNew: product?.isNew ?? false,
    isMaintenance: product?.isMaintenance ?? false,
  });
  // New product: durations live locally until the product is created. Existing: straight from the server.
  const [localDurations, setLocalDurations] = useState<DurationDraft[]>([]);
  const durations: DurationDraft[] = isNew ? localDurations : product.durations.map(rowToDraft);

  const [snapshot, setSnapshot] = useState(() => JSON.stringify([title, description, features, demoUrl, imageUrl, categoryId, flags]));
  const dirty = !isNew && JSON.stringify([title, description, features, demoUrl, imageUrl, categoryId, flags]) !== snapshot;

  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState<{ draft: DurationDraft | null; index: number } | null>(null);
  const [delDuration, setDelDuration] = useState<{ draft: DurationDraft; index: number } | null>(null);
  const [delProduct, setDelProduct] = useState(false);

  function addFeature() {
    const parts = featureDraft.split(",").map((f) => f.trim()).filter(Boolean);
    if (parts.length === 0) return;
    setFeatures((cur) => [...cur, ...parts.filter((p) => !cur.includes(p))]);
    setFeatureDraft("");
  }

  async function save() {
    if (!title.trim()) return toast.error("Title is required.");
    if (!description.trim()) return toast.error("Description is required.");
    setBusy(true);
    try {
      const body = {
        title: title.trim(),
        description: description.trim(),
        categoryId,
        features,
        imageUrl,
        demoUrl: demoUrl.trim() || null,
        ...flags,
      };
      if (isNew) {
        await adminFetch("/api/admin/products", {
          method: "POST",
          json: {
            ...body,
            durations: localDurations.map((d) => ({
              label: d.label,
              days: d.days,
              hours: d.hours,
              price: d.price,
              resellerPrice: d.resellerPrice,
              buyPrice: d.buyPrice,
              requiresAndroidId: d.requiresAndroidId,
              deviceIdName: d.deviceIdName,
            })),
          },
        });
        toast.success("Product created.");
        router.push("/admin/products");
        router.refresh();
      } else {
        await adminFetch(`/api/admin/products/${product.id}`, { method: "PATCH", json: body });
        toast.success("Product saved.");
        setSnapshot(JSON.stringify([title, description, features, demoUrl, imageUrl, categoryId, flags]));
        reload();
      }
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  async function submitDuration(draft: DurationDraft) {
    if (isNew) {
      setLocalDurations((cur) => {
        const next = [...cur];
        if (dialog && dialog.index >= 0) next[dialog.index] = draft;
        else next.push(draft);
        return next;
      });
      return;
    }
    const body = {
      label: draft.label,
      days: draft.days,
      hours: draft.hours,
      requiresAndroidId: draft.requiresAndroidId,
      deviceIdName: draft.deviceIdName,
      prices: [{ currency: "USD", price: draft.price, resellerPrice: draft.resellerPrice, buyPrice: draft.buyPrice }],
    };
    if (draft.id) {
      await adminFetch(`/api/admin/durations/${draft.id}`, { method: "PATCH", json: body });
      toast.success("Duration saved.");
    } else {
      await adminFetch("/api/admin/durations", { method: "POST", json: { ...body, productId: product.id } });
      toast.success("Duration added.");
    }
    reload();
  }

  async function removeDuration() {
    if (!delDuration) return;
    if (isNew) {
      setLocalDurations((cur) => cur.filter((_, i) => i !== delDuration.index));
      return;
    }
    try {
      await adminFetch(`/api/admin/durations/${delDuration.draft.id}`, { method: "DELETE" });
      toast.success("Duration deleted.");
      reload();
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  const prices = durations.map((d) => d.price).filter((p) => p > 0);
  const fromPrice = prices.length ? Math.min(...prices) : null;
  const category = categories.find((c) => c.id === categoryId) ?? null;

  return (
    <div className="space-y-5 pb-24">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <Link href="/admin/products" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> Products
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">{isNew ? "New product" : product.title}</h1>
            {!isNew ? <Badge variant="muted">#{product.number}</Badge> : null}
            {!isNew && !flags.isActive ? <Badge variant="warning">Archived</Badge> : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {isNew ? "Fill in the basics, add durations, then create." : "Edit details, pricing and durations."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {dirty ? <span className="text-xs font-medium text-warning">Unsaved changes</span> : null}
          <SubmitButton busy={busy} onClick={save} disabled={!isNew && !dirty}>
            {isNew ? "Create product" : "Save changes"}
          </SubmitButton>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-5">
          <Panel title="Basics" icon={Boxes}>
            <div className="grid gap-4">
              <Field label="Title">
                <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="Product name" />
              </Field>
              <Field label="Description">
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} maxLength={2000} placeholder="What does the buyer get?" />
              </Field>
              <Field label="Features" hint="Type a feature and press Enter (or paste comma-separated).">
                <div className="flex flex-wrap gap-1.5 rounded-lg border bg-background p-2 focus-within:ring-2 focus-within:ring-ring/40">
                  {features.map((f) => (
                    <span key={f} className="inline-flex items-center gap-1 rounded-full bg-primary/10 py-1 pl-3 pr-1.5 text-xs font-medium text-primary">
                      {f}
                      <button type="button" onClick={() => setFeatures((cur) => cur.filter((x) => x !== f))} className="grid size-4 place-items-center rounded-full hover:bg-primary/20" aria-label={`Remove ${f}`}>
                        <X className="size-3" />
                      </button>
                    </span>
                  ))}
                  <input
                    value={featureDraft}
                    onChange={(e) => setFeatureDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addFeature();
                      } else if (e.key === "Backspace" && !featureDraft && features.length) {
                        setFeatures((cur) => cur.slice(0, -1));
                      }
                    }}
                    onBlur={addFeature}
                    placeholder={features.length ? "Add another…" : "e.g. Anti-ban"}
                    className="min-w-32 flex-1 bg-transparent px-1.5 py-1 text-sm outline-none placeholder:text-muted-foreground"
                  />
                </div>
              </Field>
              <Field label="Demo URL" hint="Optional. Empty uses the site default demo link.">
                <Input value={demoUrl} onChange={(e) => setDemoUrl(e.target.value)} placeholder="https://" />
              </Field>
            </div>
          </Panel>

          <Panel
            title="Durations & pricing"
            icon={Clock}
            action={
              <Button size="sm" onClick={() => setDialog({ draft: null, index: -1 })}>
                <Plus /> Add duration
              </Button>
            }
          >
            {durations.length === 0 ? (
              <EmptyState icon={Clock} title="No durations yet" hint="A product needs at least one duration to appear in the store.">
                <Button size="sm" className="mt-3" onClick={() => setDialog({ draft: null, index: -1 })}>
                  <Plus /> Add duration
                </Button>
              </EmptyState>
            ) : (
              <ul className="grid gap-2">
                {durations.map((d, i) => (
                  <li key={d.id ?? `${d.label}-${i}`} className="group flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border bg-background px-3 py-2.5">
                    <div className="min-w-32">
                      <p className="flex items-center gap-2 text-sm font-semibold">
                        {d.label}
                        {d.number ? <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground">SKU {d.number}</span> : null}
                      </p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                        <span>{formatLength(d)}</span>
                        {d.requiresAndroidId ? (
                          <span className="inline-flex items-center gap-0.5"><Smartphone className="size-3" /> {d.deviceIdName || "Device ID"}</span>
                        ) : null}
                      </p>
                    </div>
                    <div className="flex flex-1 flex-wrap items-center gap-1.5 text-xs">
                      <Badge variant="success">User {usd(d.price)}</Badge>
                      <Badge variant="default">Seller {usd(d.resellerPrice)}</Badge>
                      <Badge variant="muted">Cost {usd(d.buyPrice)}</Badge>
                      {!isNew ? (
                        <span className="text-muted-foreground">
                          <span className="font-semibold text-foreground">{d.available ?? 0}</span> in stock · {d.sold ?? 0} sold
                        </span>
                      ) : null}
                    </div>
                    <div className="ml-auto flex gap-1">
                      <Button variant="ghost" size="icon-sm" onClick={() => setDialog({ draft: d, index: i })} aria-label="Edit duration">
                        <Pencil />
                      </Button>
                      <Button variant="ghost" size="icon-sm" className="text-destructive hover:text-destructive" onClick={() => setDelDuration({ draft: d, index: i })} aria-label="Delete duration">
                        <Trash2 />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {!isNew ? <p className="mt-3 text-xs text-muted-foreground">Duration changes save instantly. Upload keys from the Keys page.</p> : null}
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel title="Cover image">
            <ImageUpload value={imageUrl} onChange={setImageUrl} endpoint="/api/admin/products/upload" label="Image" />
          </Panel>

          <Panel title="Category">
            <div className="grid gap-3">
              <CategorySelect value={categoryId} onChange={setCategoryId} categories={categories} />
              <Link href="/admin/products?tab=categories" className="text-xs text-primary hover:underline">
                Manage categories →
              </Link>
            </div>
          </Panel>

          <Panel title="Status & badges">
            <div className="flex flex-wrap gap-2">
              {FLAG_CHIPS.map((c) => {
                const on = flags[c.key];
                return (
                  <button
                    key={c.key}
                    type="button"
                    title={c.hint}
                    aria-pressed={on}
                    onClick={() => setFlags((f) => ({ ...f, [c.key]: !f[c.key] }))}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors [&_svg]:size-3.5",
                      on
                        ? c.key === "isMaintenance"
                          ? "border-warning bg-warning/15 text-warning"
                          : "border-primary bg-primary/15 text-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    )}
                  >
                    <c.icon /> {c.label}
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">Inactive products are hidden from the store but keep their order history.</p>
          </Panel>

          <Panel title="Store preview">
            <div className="overflow-hidden rounded-xl border bg-background">
              <div className="grid aspect-[16/9] place-items-center bg-muted">
                {imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imageUrl} alt="" className="size-full object-cover" />
                ) : (
                  <Boxes className="size-8 text-muted-foreground" />
                )}
              </div>
              <div className="space-y-1.5 p-3">
                {category ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                    <CategoryIcon icon={category.icon} slug={category.slug} className="size-3.5" /> {category.name}
                  </span>
                ) : null}
                <p className="truncate text-sm font-semibold">{title || "Product title"}</p>
                <p className="text-xs text-muted-foreground">{fromPrice != null ? `From ${usd(fromPrice)}` : "No price yet"}</p>
              </div>
            </div>
          </Panel>

          {!isNew ? (
            <Panel title="Danger zone">
              <p className="mb-3 text-xs text-muted-foreground">Unsold keys are removed. If the product has purchase history it is archived instead, so orders stay intact.</p>
              <Button variant="destructive" size="sm" onClick={() => setDelProduct(true)}>
                <Trash2 /> Delete product
              </Button>
            </Panel>
          ) : null}
        </div>
      </div>

      <DurationDialog
        open={dialog !== null}
        onOpenChange={(o) => !o && setDialog(null)}
        initial={dialog?.draft ?? null}
        productTitle={title}
        existingLabels={durations.filter((_, i) => i !== dialog?.index).map((d) => d.label.toLowerCase())}
        onSubmit={submitDuration}
      />
      <ConfirmDialog
        open={!!delDuration}
        onOpenChange={(o) => !o && setDelDuration(null)}
        title={`Delete "${delDuration?.draft.label}"?`}
        description={isNew ? "This duration has not been saved yet." : "Blocked when the duration has purchase history. Unsold keys on it are removed."}
        confirmLabel="Delete"
        destructive
        onConfirm={removeDuration}
      />
      <ConfirmDialog
        open={delProduct}
        onOpenChange={setDelProduct}
        title={`Delete "${product?.title}"?`}
        description="If the product has purchase history it is archived (hidden) instead of deleted."
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          try {
            const r = await adminFetch<{ mode: string }>(`/api/admin/products/${product!.id}`, { method: "DELETE" });
            toast.success(r.mode === "archived" ? "Product archived (has purchase history)." : "Product deleted.");
            router.push("/admin/products");
            router.refresh();
          } catch (e) {
            toast.error(errMsg(e));
          }
        }}
      />
    </div>
  );
}
