"use client";

import { useState } from "react";
import { toast } from "sonner";
import { RotateCcw } from "lucide-react";
import { TableSkeleton, adminFetch, errMsg, useAdminQuery } from "@/components/admin/kit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SettingsCard } from "./settings-kit";
import type { AdminSiteIconRow } from "@/types/site-icons";

export function IconsSection() {
  const { data, setData } = useAdminQuery<{ icons: AdminSiteIconRow[] }>("/api/admin/icons");
  const [busy, setBusy] = useState<string | null>(null);
  if (!data) return <TableSkeleton rows={3} />;

  async function setIcon(key: string, file: File | null) {
    setBusy(key);
    try {
      let url = "";
      if (file) {
        const fd = new FormData();
        fd.set("file", file);
        url = (await adminFetch<{ upload: { url: string } }>("/api/admin/icons/upload", { method: "POST", body: fd })).upload.url;
      }
      setData(await adminFetch<{ icons: AdminSiteIconRow[] }>("/api/admin/icons", { method: "PATCH", json: { key, url } }));
      toast.success(file ? "Icon updated." : "Icon reset.");
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <SettingsCard title="Icons" description="Replace the built-in PNG icons used around the site.">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data.icons.map((i) => (
          <div key={i.key} className="flex items-center gap-3 rounded-lg border p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={i.url} alt="" className="size-10 shrink-0 rounded object-contain" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{i.label}</p>
              <p className="truncate text-xs text-muted-foreground">{i.description}</p>
              {i.isCustom ? <Badge variant="default">Custom</Badge> : null}
            </div>
            <Button asChild variant="secondary" size="sm" disabled={busy === i.key}>
              <label className="cursor-pointer">
                Change
                <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="sr-only" onChange={(e) => setIcon(i.key, e.target.files?.[0] ?? null)} />
              </label>
            </Button>
            {i.isCustom ? (
              <Button variant="ghost" size="icon-sm" disabled={busy === i.key} onClick={() => setIcon(i.key, null)} aria-label="Reset">
                <RotateCcw />
              </Button>
            ) : null}
          </div>
        ))}
      </div>
    </SettingsCard>
  );
}
