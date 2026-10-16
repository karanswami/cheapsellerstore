"use client";

import { useState } from "react";
import { toast } from "sonner";
import { RefreshCw, Wallet } from "lucide-react";
import { Field, StatCard, SubmitButton, TableSkeleton, ToggleRow, adminFetch, errMsg, useAdminQuery } from "@/components/admin/kit";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { SupplierBalanceDto, SupplierCatalogDto, SupplierSettingsDto } from "@/types/admin-supplier";
import { SettingsCard } from "./settings-kit";

export function SupplierSection() {
  const settings = useAdminQuery<SupplierSettingsDto>("/api/admin/supplier/settings");
  if (!settings.data) return <TableSkeleton rows={3} />;
  return <SupplierForm d={settings.data} reload={settings.reload} />;
}

function SupplierForm({ d, reload }: { d: SupplierSettingsDto; reload: () => void }) {
  const catalog = useAdminQuery<SupplierCatalogDto>("/api/admin/supplier/catalog");
  const [enabled, setEnabled] = useState(d.enabled);
  const [baseUrl, setBaseUrl] = useState(d.baseUrl);
  const [apiKey, setApiKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [balance, setBalance] = useState<SupplierBalanceDto | null>(null);
  const [checking, setChecking] = useState(false);

  async function save(clearApiKey = false) {
    setBusy(true);
    try {
      await adminFetch("/api/admin/supplier/settings", { method: "PATCH", json: { enabled, baseUrl: baseUrl.trim(), ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}), ...(clearApiKey ? { clearApiKey: true } : {}) } });
      toast.success("Supplier settings saved.");
      setApiKey("");
      reload();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  async function checkBalance() {
    setChecking(true);
    try {
      setBalance(await adminFetch<SupplierBalanceDto>("/api/admin/supplier/balance"));
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setChecking(false);
    }
  }

  async function sync() {
    setSyncing(true);
    try {
      catalog.setData(await adminFetch<SupplierCatalogDto>("/api/admin/supplier/catalog", { method: "POST" }));
      toast.success("Catalog refreshed.");
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setSyncing(false);
    }
  }

  const c = catalog.data;

  return (
    <>
      <SettingsCard title="Supplier API" description="Upstream key supplier. Durations mapped to a supplier product are fulfilled from it when local stock runs out.">
        <ToggleRow label="Supplier enabled" checked={enabled} onChange={setEnabled} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Base URL">
            <Input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://…" />
          </Field>
          <Field label="API key" hint={d.hasApiKey ? `Current: ${d.apiKeyMasked}. Leave empty to keep.` : "Not set."}>
            <Input type="password" autoComplete="off" value={apiKey} onChange={(e) => setApiKey(e.target.value)} className="font-mono text-xs" />
          </Field>
        </div>
        <div className="flex flex-wrap gap-2">
          <SubmitButton busy={busy} onClick={() => save()}>
            Save
          </SubmitButton>
          {d.hasApiKey ? (
            <SubmitButton variant="destructive" busy={busy} onClick={() => save(true)}>
              Remove key
            </SubmitButton>
          ) : null}
          <SubmitButton variant="secondary" busy={checking} disabled={!d.configured} onClick={checkBalance}>
            <Wallet /> Check balance
          </SubmitButton>
        </div>
        {balance ? (
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Balance" value={`${balance.balance} ${balance.currency}`} tone="success" />
            <StatCard label="Lifetime keys" value={balance.lifetime_keys} />
          </div>
        ) : null}
      </SettingsCard>

      <SettingsCard title="Supplier catalog" description={c?.fetchedAt ? `Last synced ${new Date(c.fetchedAt).toLocaleString()}` : "Not synced yet."}>
        <div>
          <SubmitButton variant="secondary" busy={syncing} disabled={!d.configured} onClick={sync}>
            <RefreshCw /> Sync catalog
          </SubmitButton>
        </div>
        {c ? (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard label="Products" value={c.summary.totalProducts} />
              <StatCard label="Groups" value={c.summary.totalGroups} />
              <StatCard label="In stock" value={c.summary.inStock} tone="success" />
              <StatCard label="Out of stock" value={c.summary.outOfStock} tone={c.summary.outOfStock ? "warning" : "default"} />
            </div>
            {c.items.length ? (
              <ScrollArea className="h-80 rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Mapped to</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {c.items.map((it) => {
                      const m = c.mappings.filter((x) => x.supplierProductId === it.id);
                      return (
                        <TableRow key={it.id}>
                          <TableCell className="font-mono text-xs">#{it.id}</TableCell>
                          <TableCell className="text-sm">
                            {it.name} {it.group_name ? <span className="text-muted-foreground">· {it.group_name}</span> : null}
                          </TableCell>
                          <TableCell className="text-right">{it.price}</TableCell>
                          <TableCell>
                            <Badge variant={it.in_stock ? "success" : "destructive"}>{it.stock_count ?? (it.in_stock ? "In" : "Out")}</Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{m.map((x) => `${x.productTitle} · ${x.durationLabel}`).join(", ") || "—"}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            ) : null}
          </>
        ) : null}
      </SettingsCard>
    </>
  );
}
