"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, ImageIcon, Pencil, Plus, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/app-ui";
import { Chips, ConfirmDialog, Field, ImageUpload, SubmitButton, TableSkeleton, ToggleRow, adminFetch, errMsg, useAdminQuery } from "@/components/admin/kit";
import { MiniStats, MoveButtons, StatusDot, nextOrder, useReorder } from "@/components/admin/content-kit";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Banner = { id: string; title: string; imageUrl: string | null; active: boolean; priority: number };
type Filter = "all" | "live" | "hidden";

export function Banners() {
  const { data, loading, reload } = useAdminQuery<{ banners: Banner[] }>("/api/admin/banners");
  const [editing, setEditing] = useState<Banner | "new" | null>(null);
  const [del, setDel] = useState<Banner | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const { move, busy } = useReorder<Banner>({ endpoint: "/api/admin/banners", field: "priority", get: (b) => b.priority, reload });

  // The API returns banners in display order; keep that order and filter on top of it.
  const all = [...(data?.banners ?? [])].sort((a, b) => a.priority - b.priority);
  const live = all.filter((b) => b.active).length;
  const shown = all.filter((b) => (filter === "live" ? b.active : filter === "hidden" ? !b.active : true));

  async function toggle(b: Banner, active: boolean) {
    try {
      await adminFetch(`/api/admin/banners/${b.id}`, { method: "PATCH", json: { active } });
      toast.success(active ? "Banner is live." : "Banner hidden.");
      reload();
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  return (
    <div className="space-y-5">
      <MiniStats
        items={[
          { label: "Total", value: all.length },
          { label: "Live on home", value: live, tone: "success" },
          { label: "Hidden", value: all.length - live, tone: "muted" },
        ]}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Chips<Filter>
          value={filter}
          onChange={setFilter}
          options={[
            { v: "all", label: `All (${all.length})` },
            { v: "live", label: `Live (${live})` },
            { v: "hidden", label: `Hidden (${all.length - live})` },
          ]}
        />
        <Button onClick={() => setEditing("new")}>
          <Plus /> New banner
        </Button>
      </div>

      {loading && !data ? (
        <TableSkeleton rows={3} />
      ) : all.length === 0 ? (
        <EmptyState icon={ImageIcon} title="No banners yet" hint="Banners rotate at the top of the store home page. Recommended 1600×600." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((b) => {
            const index = all.findIndex((x) => x.id === b.id);
            return (
              <div key={b.id} className={cn("group overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-md", !b.active && "opacity-70")}>
                <div className="relative aspect-[16/6] bg-muted">
                  {b.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={b.imageUrl} alt={b.title} className={cn("size-full object-cover", !b.active && "grayscale")} />
                  ) : (
                    <div className="grid size-full place-items-center text-muted-foreground">
                      <ImageIcon className="size-6" />
                    </div>
                  )}
                  <span className="absolute left-2 top-2 grid size-6 place-items-center rounded-full bg-background/90 text-xs font-semibold shadow-sm">{index + 1}</span>
                  <div className="absolute right-2 top-2 bg-background/90 rounded-full">
                    <StatusDot on={b.active} />
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{b.title || "Untitled banner"}</p>
                    <p className="text-xs text-muted-foreground">Position {index + 1} of {all.length}</p>
                  </div>
                  <MoveButtons vertical={false} onUp={() => move(all, index, -1)} onDown={() => move(all, index, 1)} disableUp={busy || index === 0 || filter !== "all"} disableDown={busy || index === all.length - 1 || filter !== "all"} />
                  <Button variant="ghost" size="icon-sm" onClick={() => toggle(b, !b.active)} aria-label={b.active ? "Hide" : "Show"} title={b.active ? "Hide" : "Make live"}>
                    {b.active ? <Eye /> : <EyeOff />}
                  </Button>
                  <Button variant="ghost" size="icon-sm" onClick={() => setEditing(b)} aria-label="Edit">
                    <Pencil />
                  </Button>
                  <Button variant="ghost" size="icon-sm" onClick={() => setDel(b)} aria-label="Delete">
                    <Trash2 />
                  </Button>
                </div>
              </div>
            );
          })}
          {filter === "all" ? (
            <button
              type="button"
              onClick={() => setEditing("new")}
              className="grid min-h-40 place-items-center rounded-xl border-2 border-dashed text-sm text-muted-foreground transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary"
            >
              <span className="flex flex-col items-center gap-1.5">
                <Plus className="size-5" /> Add banner
              </span>
            </button>
          ) : shown.length === 0 ? (
            <p className="col-span-full py-10 text-center text-sm text-muted-foreground">Nothing in this view.</p>
          ) : null}
        </div>
      )}
      {filter !== "all" && all.length > 1 ? <p className="text-xs text-muted-foreground">Switch to “All” to change the order.</p> : null}

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-xl">
          {editing !== null ? (
            <BannerForm
              key={editing === "new" ? "new" : editing.id}
              banner={editing === "new" ? null : editing}
              nextPriority={nextOrder(all.map((b) => b.priority))}
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
        title={`Delete "${del?.title || "this banner"}"?`}
        description="It will disappear from the home page immediately. This can't be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          try {
            await adminFetch(`/api/admin/banners/${del!.id}`, { method: "DELETE" });
            toast.success("Banner deleted.");
            reload();
          } catch (e) {
            toast.error(errMsg(e));
          }
        }}
      />
    </div>
  );
}

function BannerForm({ banner, nextPriority, onSaved }: { banner: Banner | null; nextPriority: number; onSaved: () => void }) {
  const [title, setTitle] = useState(banner?.title ?? "");
  const [imageUrl, setImageUrl] = useState<string | null>(banner?.imageUrl ?? null);
  const [active, setActive] = useState(banner?.active ?? true);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!imageUrl) return toast.error("Upload an image first.");
    setBusy(true);
    try {
      // Order is managed with the arrows on the list; new banners are appended at the end.
      const body = { title: title.trim() || undefined, imageUrl, active, ...(banner ? {} : { priority: nextPriority }) };
      await adminFetch(banner ? `/api/admin/banners/${banner.id}` : "/api/admin/banners", { method: banner ? "PATCH" : "POST", json: body });
      toast.success(banner ? "Banner updated." : "Banner added.");
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
        <DialogTitle>{banner ? "Edit banner" : "New banner"}</DialogTitle>
        <DialogDescription>Image-only banner on the store home page. Use wide images (about 1600×600) for the sharpest result.</DialogDescription>
      </DialogHeader>
      <ImageUpload value={imageUrl} onChange={setImageUrl} endpoint="/api/admin/banners/upload" label="Banner image" />
      <Field label="Name" hint="Only for your reference — customers don't see it.">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="e.g. Diwali sale" />
      </Field>
      <ToggleRow label="Show on home page" hint={active ? "Customers can see this banner." : "Saved as a draft, hidden from customers."} checked={active} onChange={setActive} />
      <DialogFooter>
        <SubmitButton busy={busy} disabled={!imageUrl} onClick={save}>
          {banner ? "Save changes" : "Add banner"}
        </SubmitButton>
      </DialogFooter>
    </>
  );
}
