"use client";

import { HubHeaderBar } from "@/components/app/hub/hub-header-bar";
import {
  HubEmptyPanel,
  HubListRow,
  HubListStack,
  hubListRowStyles,
} from "@/components/app/hub/hub-list-row";
import { HubPageShell } from "@/components/app/hub/hub-page-shell";
import {
  CreateSubSellerDialog,
  type CreateSubSellerForm,
} from "@/components/app/seller/create-sub-seller-dialog";
import {
  SubSellerDetailDialog,
  type SubSellerRow,
} from "@/components/app/seller/sub-seller-detail-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMoney } from "@/lib/currencies";
import { cn } from "@/lib/utils";
import { ChevronRight, Store, UserPlus, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

const emptyForm = (minFundingUsd = 5): CreateSubSellerForm => ({
  username: "",
  email: "",
  password: "",
  name: "",
  initialUsd: String(minFundingUsd),
});

function initials(name: string, username: string) {
  const source = name.trim() || username.trim();
  return (source[0] ?? "?").toUpperCase();
}

export function SellerPanelView() {
  const router = useRouter();
  const [subs, setSubs] = useState<SubSellerRow[]>([]);
  const [count, setCount] = useState(0);
  const [createMinFundingUsd, setCreateMinFundingUsd] = useState(5);
  const [caps, setCaps] = useState({
    canCreate: false,
    canManage: false,
    canFund: false,
  });
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<CreateSubSellerForm>(() => emptyForm());
  const [detail, setDetail] = useState<SubSellerRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/seller/resellers", {
        credentials: "include",
      });
      const json = (await res.json()) as {
        data?: {
          resellers: SubSellerRow[];
          count: number;
          createMinFundingUsd?: number;
          capabilities: {
            canCreate: boolean;
            canManage: boolean;
            canFund: boolean;
          };
        };
        error?: { message: string };
      };
      if (!res.ok) {
        toast.error(json.error?.message ?? "Failed to load");
        return;
      }
      const minUsd =
        typeof json.data?.createMinFundingUsd === "number"
          ? json.data.createMinFundingUsd
          : 5;
      setCreateMinFundingUsd(minUsd);
      setSubs(json.data?.resellers ?? []);
      setCount(json.data?.count ?? 0);
      setCaps(
        json.data?.capabilities ?? {
          canCreate: false,
          canManage: false,
          canFund: false,
        },
      );
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createSub() {
    const initialUsd = Number(form.initialUsd);
    if (!Number.isFinite(initialUsd) || initialUsd < createMinFundingUsd) {
      toast.error(`Minimum funding is $${createMinFundingUsd}`);
      return;
    }
    setPending(true);
    try {
      const res = await fetch("/api/seller/resellers", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: form.username,
          email: form.email,
          password: form.password,
          name: form.name || undefined,
          initialUsd,
        }),
      });
      const json = (await res.json()) as { error?: { message: string } };
      if (!res.ok) {
        toast.error(json.error?.message ?? "Create failed");
        return;
      }
      toast.success("Reseller created");
      setForm(emptyForm(createMinFundingUsd));
      setCreateOpen(false);
      await load();
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function toggleStatus(banned: boolean) {
    if (!detail) return false;
    setPending(true);
    try {
      const res = await fetch(`/api/seller/resellers/${detail.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ banned }),
      });
      const json = (await res.json()) as {
        data?: { user: SubSellerRow };
        error?: { message: string };
      };
      if (!res.ok) {
        toast.error(json.error?.message ?? "Status update failed");
        return false;
      }
      const updated = json.data?.user;
      if (updated) {
        setDetail(updated);
        setSubs((prev) =>
          prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s)),
        );
      }
      toast.success(banned ? "Reseller turned off" : "Reseller turned on");
      router.refresh();
      return true;
    } finally {
      setPending(false);
    }
  }

  async function adjustBalance(amountUsd: number) {
    if (!detail) return false;
    setPending(true);
    try {
      const res = await fetch(`/api/seller/resellers/${detail.id}/credit`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountUsd }),
      });
      const json = (await res.json()) as { error?: { message: string } };
      if (!res.ok) {
        toast.error(json.error?.message ?? "Balance adjust failed");
        return false;
      }
      toast.success(amountUsd > 0 ? "Balance added" : "Balance removed");
      await load();
      router.refresh();
      return true;
    } finally {
      setPending(false);
    }
  }

  async function deleteSub() {
    if (!detail) return false;
    setPending(true);
    try {
      const res = await fetch(`/api/seller/resellers/${detail.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = (await res.json()) as { error?: { message: string } };
      if (!res.ok) {
        toast.error(json.error?.message ?? "Delete failed");
        return false;
      }
      toast.success("Reseller deleted");
      setDetail(null);
      await load();
      router.refresh();
      return true;
    } finally {
      setPending(false);
    }
  }

  const canOpenDetail = caps.canManage || caps.canFund;

  return (
    <HubPageShell maxWidth="lg">
      <HubHeaderBar
        icon={<Store />}
        title="Seller panel"
        description="Manage your reseller network"
        stats={[
          {
            label: "Resellers",
            value: loading ? "…" : String(count),
            tone: "accent",
          },
        ]}
        statsLabel="Network summary"
        actions={
          caps.canCreate ? (
            <Button
              type="button"
              size="sm"
              className="shrink-0"
              onClick={() => {
                setForm(emptyForm(createMinFundingUsd));
                setCreateOpen(true);
              }}
            >
              <UserPlus className="size-3.5" />
              Add reseller
            </Button>
          ) : null
        }
      />

      {loading ? (
        <div className="space-y-2" aria-busy="true">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[4.5rem] w-full rounded-xl" />
          ))}
        </div>
      ) : subs.length === 0 ? (
        <HubEmptyPanel>
          <EmptyState
            className="border-0 bg-transparent ring-0"
            icon={<Users className="size-6" />}
            title="No resellers yet"
            description={
              caps.canCreate
                ? "Add your first reseller to get started."
                : "Ask an admin to grant create permission."
            }
            action={
              caps.canCreate ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    setForm(emptyForm(createMinFundingUsd));
                    setCreateOpen(true);
                  }}
                >
                  <UserPlus className="size-3.5" />
                  Add reseller
                </Button>
              ) : null
            }
          />
        </HubEmptyPanel>
      ) : (
        <HubListStack>
          {subs.map((s) => (
            <HubListRow
              key={s.id}
              interactive={canOpenDetail}
              stripe={false}
              role={canOpenDetail ? "button" : undefined}
              tabIndex={canOpenDetail ? 0 : undefined}
              onClick={() => {
                if (canOpenDetail) setDetail(s);
              }}
              onKeyDown={(e) => {
                if (!canOpenDetail) return;
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setDetail(s);
                }
              }}
            >
              <div className={hubListRowStyles.innerRow}>
                <Avatar size="lg" className="bg-primary/15">
                  <AvatarFallback className="bg-primary/20 text-sm font-semibold text-primary">
                    {initials(s.name, s.username)}
                  </AvatarFallback>
                </Avatar>
                <div className={hubListRowStyles.body}>
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <p className={hubListRowStyles.title}>
                      {s.name || `@${s.username}`}
                    </p>
                    <Badge
                      variant={s.banned ? "destructive" : "outline"}
                      className={cn(
                        "shrink-0 text-[10px]",
                        !s.banned &&
                          "border-success/30 bg-success/10 text-success",
                      )}
                    >
                      {s.banned ? "Off" : "On"}
                    </Badge>
                  </div>
                  <p className={hubListRowStyles.meta}>
                    @{s.username} · {s.email}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className={hubListRowStyles.value}>
                    {formatMoney(s.walletBalance)}
                  </span>
                  {canOpenDetail ? (
                    <ChevronRight className="size-4 text-muted-foreground" />
                  ) : null}
                </div>
              </div>
            </HubListRow>
          ))}
        </HubListStack>
      )}

      <CreateSubSellerDialog
        open={createOpen}
        onOpenChange={(open) => {
          if (open) setForm(emptyForm(createMinFundingUsd));
          setCreateOpen(open);
        }}
        form={form}
        onFormChange={setForm}
        pending={pending}
        onSubmit={() => void createSub()}
        minFundingUsd={createMinFundingUsd}
      />

      <SubSellerDetailDialog
        sub={detail}
        open={Boolean(detail)}
        onOpenChange={(open) => {
          if (!open) setDetail(null);
        }}
        canManage={caps.canManage}
        canFund={caps.canFund}
        pending={pending}
        onToggleStatus={toggleStatus}
        onAdjustBalance={adjustBalance}
        onDelete={deleteSub}
      />
    </HubPageShell>
  );
}
