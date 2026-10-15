"use client";

import {
  AdminEmptyState,
  AdminListSkeleton,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ChevronRight, ImagePlus, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

type Banner = {
  id: string;
  title: string;
  imageUrl: string | null;
  active: boolean;
  priority: number;
};

type FormState = {
  title: string;
  imageUrl: string;
  active: boolean;
  priority: string;
};

const emptyForm: FormState = {
  title: "",
  imageUrl: "",
  active: true,
  priority: "100",
};

function bannerToForm(banner: Banner): FormState {
  return {
    title: banner.title,
    imageUrl: banner.imageUrl ?? "",
    active: banner.active,
    priority: String(banner.priority),
  };
}

function formPayload(form: FormState) {
  const priority = Number.parseInt(form.priority, 10);
  return {
    title: form.title.trim() || undefined,
    imageUrl: form.imageUrl.trim(),
    active: form.active,
    priority: Number.isFinite(priority) ? priority : 100,
  };
}

export function BannersWorkspace() {
  const { data, loading, reload } = useAdminFetch<{ banners: Banner[] }>(
    "/api/admin/banners",
  );
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Banner | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [pending, setPending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(banner: Banner) {
    setEditing(banner);
    setForm(bannerToForm(banner));
    setOpen(true);
  }

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function uploadImage(file: File) {
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/admin/banners/upload", {
        method: "POST",
        credentials: "include",
        body,
      });
      const json = (await res.json()) as {
        data?: { upload?: { url?: string } };
        error?: { message?: string };
      };
      if (!res.ok || !json.data?.upload?.url) {
        toast.error(json.error?.message ?? "Upload failed");
        return;
      }
      updateField("imageUrl", json.data.upload.url);
      if (!form.title.trim()) {
        updateField("title", file.name.replace(/\.[^.]+$/, "").slice(0, 120));
      }
      toast.success("Image uploaded");
    } catch {
      toast.error("Network error");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function save() {
    if (!form.imageUrl.trim()) {
      toast.error("Upload an image first");
      return;
    }
    setPending(true);
    const payload = formPayload(form);
    const result = editing
      ? await adminMutate(`/api/admin/banners/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        })
      : await adminMutate("/api/admin/banners", {
          method: "POST",
          body: JSON.stringify(payload),
        });
    setPending(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success(editing ? "Banner updated" : "Banner created");
    setOpen(false);
    setEditing(null);
    setForm(emptyForm);
    void reload();
  }

  async function remove() {
    if (!editing) return;
    if (!window.confirm(`Delete “${editing.title}”?`)) return;
    setPending(true);
    const result = await adminMutate(`/api/admin/banners/${editing.id}`, {
      method: "DELETE",
    });
    setPending(false);
    if (!result.ok) toast.error(result.message);
    else {
      toast.success("Deleted");
      setOpen(false);
      setEditing(null);
      setForm(emptyForm);
      void reload();
    }
  }

  const banners = data?.banners ?? [];

  return (
    <main className="space-y-6">
      <AdminPageHeader
        title="Banners"
        description="Image carousel on the customer app home only"
        actions={
          <Button size="sm" onClick={openCreate}>
            New banner
          </Button>
        }
      />

      {loading ? (
        <AdminListSkeleton />
      ) : !banners.length ? (
        <AdminEmptyState message="No banners yet. Upload images for the /app home carousel." />
      ) : (
        <ul className="divide-y divide-border/40 overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
          {banners.map((banner) => (
            <li key={banner.id}>
              <button
                type="button"
                onClick={() => openEdit(banner)}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/50 active:bg-muted/70 sm:px-4"
              >
                <div className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-muted ring-1 ring-foreground/10 sm:h-12 sm:w-20">
                  {banner.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={banner.imageUrl}
                      alt=""
                      className="size-full object-cover"
                    />
                  ) : (
                    <span className="flex size-full items-center justify-center text-muted-foreground">
                      <ImagePlus className="size-4" />
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold">
                      {banner.title}
                    </p>
                    <Badge variant={banner.active ? "secondary" : "outline"}>
                      {banner.active ? "Active" : "Off"}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      P{banner.priority}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Image only · app home carousel
                  </p>
                </div>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (pending) return;
          setOpen(next);
          if (!next) {
            setEditing(null);
            setForm(emptyForm);
          }
        }}
      >
        <DialogContent className="flex max-h-[min(92dvh,720px)] w-full max-w-[calc(100%-1.25rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
          <div className="shrink-0 border-b border-border/40 bg-muted/40 px-4 pt-4 pb-3.5 sm:px-5">
            <DialogHeader className="gap-1 pr-8 text-left">
              <DialogTitle>
                {editing ? "Edit banner" : "New banner"}
              </DialogTitle>
              <DialogDescription>
                Upload an image for the app home carousel.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4 sm:px-5">
            <div className="space-y-1.5">
              <Label>Banner image</Label>
              <div className="overflow-hidden rounded-lg bg-muted ring-1 ring-foreground/10">
                {form.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={form.imageUrl}
                    alt=""
                    className="aspect-[21/9] w-full object-cover"
                  />
                ) : (
                  <div className="flex aspect-[21/9] w-full flex-col items-center justify-center gap-1 text-muted-foreground">
                    <ImagePlus className="size-6" />
                    <span className="text-xs">Upload required</span>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void uploadImage(file);
                  }}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={uploading || pending}
                  onClick={() => fileRef.current?.click()}
                >
                  <Upload data-icon="inline-start" />
                  {uploading ? "Uploading…" : "Upload image"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                JPG, PNG, or WebP · max 4 MB · image only, no links
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="b-title">Label (admin only)</Label>
              <Input
                id="b-title"
                value={form.title}
                onChange={(e) => updateField("title", e.target.value)}
                placeholder="Optional name for this slide"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="b-priority">Priority</Label>
              <Input
                id="b-priority"
                type="number"
                min={0}
                max={10000}
                value={form.priority}
                onChange={(e) => updateField("priority", e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Lower shows first</p>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-xl px-3.5 py-3 ring-1 ring-foreground/10">
              <div>
                <p className="text-sm font-medium">Active on app home</p>
                <p className="text-xs text-muted-foreground">
                  Show this slide in the carousel
                </p>
              </div>
              <Switch
                checked={form.active}
                onCheckedChange={(checked) => updateField("active", checked)}
              />
            </div>
          </div>

          <DialogFooter className="mx-0 mb-0 shrink-0 gap-2 border-t border-border/40 bg-muted/20 px-4 py-3.5 sm:justify-between sm:px-5">
            <div className="flex w-full flex-wrap gap-2 sm:w-auto">
              {editing ? (
                <Button
                  type="button"
                  variant="outline"
                  className="text-destructive"
                  disabled={pending || uploading}
                  onClick={() => void remove()}
                >
                  <Trash2 data-icon="inline-start" />
                  Delete
                </Button>
              ) : null}
            </div>
            <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button
                disabled={pending || uploading || !form.imageUrl.trim()}
                onClick={() => void save()}
              >
                {pending ? "Saving…" : editing ? "Save changes" : "Create"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
