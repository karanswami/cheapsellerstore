"use client";

import {
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
import { cn } from "@/lib/utils";
import type { AdminSiteIconRow } from "@/types/site-icons";
import {
  ChevronRight,
  ImageIcon,
  Loader2,
  RotateCcw,
  Upload,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type IconsPayload = { icons: AdminSiteIconRow[] };

const GROUP_LABEL: Record<AdminSiteIconRow["group"], string> = {
  admin: "Admin nav",
  customer: "Customer nav",
  deposit: "Deposit methods",
  general: "General",
};

const GROUP_ORDER: AdminSiteIconRow["group"][] = [
  "admin",
  "customer",
  "deposit",
  "general",
];

export function IconsWorkspace() {
  const router = useRouter();
  const { data, loading, reload } = useAdminFetch<IconsPayload>(
    "/api/admin/icons",
  );
  const [icons, setIcons] = useState<AdminSiteIconRow[]>([]);
  const [edit, setEdit] = useState<AdminSiteIconRow | null>(null);
  const [draftUrl, setDraftUrl] = useState("");
  const [pending, setPending] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (data?.icons) setIcons(data.icons);
  }, [data]);

  const grouped = useMemo(() => {
    const map = new Map<AdminSiteIconRow["group"], AdminSiteIconRow[]>();
    for (const g of GROUP_ORDER) map.set(g, []);
    for (const row of icons) {
      map.get(row.group)?.push(row);
    }
    return GROUP_ORDER.map((g) => ({
      group: g,
      label: GROUP_LABEL[g],
      items: map.get(g) ?? [],
    })).filter((g) => g.items.length > 0);
  }, [icons]);

  function openEdit(row: AdminSiteIconRow) {
    setEdit(row);
    setDraftUrl(row.customUrl || row.url);
  }

  async function uploadFile(file: File) {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/admin/icons/upload", {
        method: "POST",
        body: form,
        credentials: "include",
      });
      const json = (await res.json()) as {
        data?: { upload: { url: string } };
        error?: { message: string };
      };
      if (!res.ok) {
        toast.error(json.error?.message ?? "Upload failed");
        return;
      }
      const url = json.data?.upload.url;
      if (!url) {
        toast.error("Upload failed");
        return;
      }
      setDraftUrl(url);
      toast.success("Image uploaded — save to apply");
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    if (!edit) return;
    const trimmed = draftUrl.trim();
    // Saving the built-in path clears the override.
    const url = trimmed === edit.defaultUrl ? "" : trimmed;
    setPending(true);
    const result = await adminMutate("/api/admin/icons", {
      method: "PATCH",
      body: JSON.stringify({ key: edit.key, url }),
    });
    setPending(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    const payload = result.data as IconsPayload | undefined;
    if (payload?.icons) setIcons(payload.icons);
    toast.success(`${edit.label} icon updated`);
    setEdit(null);
    router.refresh();
    void reload();
  }

  async function resetToDefault() {
    if (!edit) return;
    setPending(true);
    const result = await adminMutate("/api/admin/icons", {
      method: "PATCH",
      body: JSON.stringify({ key: edit.key, url: "" }),
    });
    setPending(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    const payload = result.data as IconsPayload | undefined;
    if (payload?.icons) setIcons(payload.icons);
    toast.success(`${edit.label} reset to default`);
    setEdit(null);
    router.refresh();
    void reload();
  }

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Icons"
        description="Replace admin, customer, and deposit icons. Defaults ship with the site; upload a PNG to override any slot."
      />

      {loading && !icons.length ? (
        <AdminListSkeleton rows={8} />
      ) : (
        <div className="space-y-6">
          {grouped.map((section) => (
            <section key={section.group} className="space-y-2">
              <h2 className="px-0.5 text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                {section.label}
              </h2>
              <ul className="divide-y divide-border/40 overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
                {section.items.map((row) => (
                  <li key={row.key}>
                    <button
                      type="button"
                      onClick={() => openEdit(row)}
                      className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/50"
                    >
                      <span className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted/40 ring-1 ring-foreground/10">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={row.url}
                          alt=""
                          className="size-8 object-contain"
                        />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold leading-tight">
                            {row.label}
                          </span>
                          {row.isCustom ? (
                            <Badge variant="secondary" className="text-[10px]">
                              Custom
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px]">
                              Default
                            </Badge>
                          )}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                          {row.description}
                        </span>
                      </span>
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <Dialog
        open={Boolean(edit)}
        onOpenChange={(open) => {
          if (!open && !pending && !uploading) setEdit(null);
        }}
      >
        <DialogContent className="flex max-h-[min(92dvh,640px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
          <DialogHeader className="shrink-0 border-b border-border/40 bg-muted/40 px-4 py-4 text-left">
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-background">
                <ImageIcon className="size-4 text-primary" />
              </span>
              <div className="min-w-0 space-y-1">
                <DialogTitle>{edit?.label ?? "Icon"}</DialogTitle>
                <DialogDescription>
                  Upload a PNG to replace this icon site-wide. Clear to restore
                  the built-in default.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
            <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-muted/30 p-4">
              <div className="flex size-20 items-center justify-center overflow-hidden rounded-2xl border border-border bg-background">
                {draftUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={draftUrl}
                    alt=""
                    className="size-16 object-contain"
                  />
                ) : (
                  <ImageIcon className="size-8 text-muted-foreground" />
                )}
              </div>
              <p className="max-w-full truncate text-center text-xs text-muted-foreground">
                {draftUrl || "No image"}
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <label
                  className={cn(
                    "inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-md border border-border bg-background px-3 text-xs font-medium shadow-xs transition-colors hover:bg-muted",
                    (uploading || pending) && "pointer-events-none opacity-50",
                  )}
                >
                  {uploading ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Upload className="size-3.5" />
                  )}
                  {uploading ? "Uploading…" : "Upload PNG"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    disabled={uploading || pending}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (file) void uploadFile(file);
                    }}
                  />
                </label>
                {edit?.isCustom || draftUrl !== edit?.defaultUrl ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={pending || uploading}
                    onClick={() => setDraftUrl(edit?.defaultUrl ?? "")}
                  >
                    <RotateCcw className="size-3.5" />
                    Preview default
                  </Button>
                ) : null}
              </div>
              <p className="text-center text-[11px] text-muted-foreground">
                JPG, PNG, or WebP · max 4 MB
              </p>
            </div>
          </div>

          <DialogFooter className="mx-0 mb-0 shrink-0 gap-2 border-t border-border bg-background px-4 py-3 sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              disabled={pending || uploading || !edit?.isCustom}
              onClick={() => void resetToDefault()}
            >
              Reset default
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={pending || uploading}
                onClick={() => setEdit(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={
                  pending ||
                  uploading ||
                  !draftUrl.trim() ||
                  draftUrl.trim() === edit?.url
                }
                onClick={() => void save()}
              >
                {pending ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    Saving…
                  </>
                ) : (
                  "Save"
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
