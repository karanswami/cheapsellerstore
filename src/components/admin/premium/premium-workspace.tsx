"use client";

import {
  AdminEmptyState,
  AdminListSkeleton,
  AdminPageHeader,
} from "@/components/admin/admin-page-header";
import { adminMutate } from "@/components/admin/use-admin-fetch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { formatMoney } from "@/lib/currencies";
import { isUserRole, roleBadge } from "@/lib/roles";
import { cn } from "@/lib/utils";
import type { AdminPremiumUserRow } from "@/types/admin-premium";
import { PremiumBadge } from "@/components/ui/premium-badge";
import {
  BadgeCheck,
  ChevronRight,
  Crown,
  LoaderCircle,
  Search,
  Sparkles,
} from "lucide-react";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useState,
} from "react";
import { toast } from "sonner";

type Filter = "premium" | "all" | "non_premium";

const PAGE_SIZE = 20;

const FILTERS: { id: Filter; label: string }[] = [
  { id: "premium", label: "Premium" },
  { id: "all", label: "All users" },
  { id: "non_premium", label: "Not Premium" },
];

function initials(name: string, username: string) {
  const source = name.trim() || username.trim();
  return (source[0] ?? "?").toUpperCase();
}

function purchasedLabel(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function PremiumWorkspace() {
  const [filter, setFilter] = useState<Filter>("premium");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim());

  const [users, setUsers] = useState<AdminPremiumUserRow[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [premiumCount, setPremiumCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [selected, setSelected] = useState<AdminPremiumUserRow | null>(null);
  const [draftPremium, setDraftPremium] = useState(false);
  const [draftVerified, setDraftVerified] = useState(false);
  const [pending, setPending] = useState(false);

  const loadPage = useCallback(
    async (nextPage: number, append: boolean) => {
      if (append) setLoadingMore(true);
      else setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(nextPage),
          limit: String(PAGE_SIZE),
          filter,
        });
        if (deferredQuery) params.set("q", deferredQuery);
        const res = await fetch(`/api/admin/premium?${params}`, {
          credentials: "include",
        });
        const json = (await res.json()) as {
          data?: {
            users: AdminPremiumUserRow[];
            total: number;
            hasMore: boolean;
            premiumCount: number;
          };
          error?: { message?: string };
        };
        if (!res.ok || !json.data) {
          toast.error(json.error?.message ?? "Could not load Premium users.");
          return;
        }
        setUsers((prev) =>
          append ? [...prev, ...json.data!.users] : json.data!.users,
        );
        setTotal(json.data.total);
        setHasMore(json.data.hasMore);
        setPremiumCount(json.data.premiumCount);
        setPage(nextPage);
      } catch {
        toast.error("Network error.");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [deferredQuery, filter],
  );

  useEffect(() => {
    void loadPage(1, false);
  }, [loadPage]);

  function openUser(user: AdminPremiumUserRow) {
    setSelected(user);
    setDraftPremium(user.isPremium);
    setDraftVerified(user.emailVerified);
  }

  async function saveSelected() {
    if (!selected) return;
    setPending(true);
    const result = await adminMutate(`/api/admin/premium/${selected.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        isPremium: draftPremium,
        emailVerified: draftVerified,
      }),
    });
    setPending(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    const updated = (result.data as { user?: AdminPremiumUserRow } | undefined)
      ?.user;
    toast.success(
      draftPremium
        ? "Premium granted · account verified"
        : "Premium settings saved",
    );
    setSelected(null);
    if (updated) {
      setUsers((prev) =>
        prev.map((u) => (u.id === updated.id ? updated : u)),
      );
    }
    void loadPage(1, false);
  }

  return (
    <main className="space-y-5">
      <AdminPageHeader
        title="Premium"
        description="Grant or revoke membership · purchase also verifies email"
        actions={
          <Badge variant="secondary" className="tabular-nums">
            {premiumCount} Premium
          </Badge>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, @username, email"
            className="h-10 pl-9"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                filter === f.id
                  ? "border-primary/40 bg-primary/15 text-foreground"
                  : "border-border bg-card text-muted-foreground hover:bg-muted/50",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <AdminListSkeleton rows={6} />
      ) : users.length === 0 ? (
        <AdminEmptyState
          message={
            deferredQuery
              ? "No users match your search."
              : filter === "premium"
                ? "No Premium members yet."
                : "No users found."
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
          {users.map((user, i) => (
            <button
              key={user.id}
              type="button"
              onClick={() => openUser(user)}
              className={cn(
                "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40 active:bg-muted/60 sm:px-5",
                i < users.length - 1 && "border-b border-border",
              )}
            >
              <Avatar className="size-10 shrink-0 bg-primary/15">
                <AvatarFallback className="bg-primary/20 text-sm font-semibold text-primary">
                  {initials(user.name, user.username)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="truncate text-sm font-semibold">
                    {user.name || `@${user.username}`}
                  </p>
                  {user.isPremium ? (
                    <PremiumBadge size="xs" animated={false} />
                  ) : null}
                  {user.emailVerified ? (
                    <Badge
                      variant="outline"
                      className="gap-0.5 border-success/30 bg-success/10 text-[10px] text-success"
                    >
                      <BadgeCheck className="size-3" />
                      Verified
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px]">
                      Unverified
                    </Badge>
                  )}
                  {user.banned ? (
                    <Badge variant="destructive" className="text-[10px]">
                      Banned
                    </Badge>
                  ) : null}
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  @{user.username} ·{" "}
                  {isUserRole(user.role) ? roleBadge(user.role) : user.role} ·{" "}
                  {formatMoney(user.walletBalance)}
                  {user.isPremium
                    ? ` · since ${purchasedLabel(user.premiumPurchasedAt)}`
                    : ""}
                </p>
              </div>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </button>
          ))}
        </div>
      )}

      {!loading && users.length > 0 ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground tabular-nums">
            Showing {users.length} of {total}
          </p>
          {hasMore ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loadingMore}
              onClick={() => void loadPage(page + 1, true)}
            >
              {loadingMore ? (
                <>
                  <LoaderCircle className="size-3.5 animate-spin" />
                  Loading…
                </>
              ) : (
                "Load more"
              )}
            </Button>
          ) : null}
        </div>
      ) : null}

      <Dialog
        open={Boolean(selected)}
        onOpenChange={(open) => !open && setSelected(null)}
      >
        <DialogContent className="flex max-h-[min(92dvh,640px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
          {selected ? (
            <>
              <div className="shrink-0 border-b border-border/40 bg-muted/40 px-5 py-4">
                <DialogHeader className="gap-1.5 pr-8 text-left">
                  <div className="mb-1 flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                    <Sparkles className="size-5" />
                  </div>
                  <DialogTitle className="text-lg">
                    {selected.name || `@${selected.username}`}
                  </DialogTitle>
                  <DialogDescription>
                    @{selected.username} · {selected.email}
                  </DialogDescription>
                </DialogHeader>
              </div>
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
                <div className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3">
                  <div className="min-w-0">
                    <Label htmlFor="prem-on" className="text-sm font-medium">
                      Premium membership
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Lifetime unlock. Granting also verifies the account.
                    </p>
                  </div>
                  <Switch
                    id="prem-on"
                    checked={draftPremium}
                    onCheckedChange={(checked) => {
                      setDraftPremium(checked);
                      if (checked) setDraftVerified(true);
                    }}
                  />
                </div>
                <div className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3">
                  <div className="min-w-0">
                    <Label htmlFor="prem-ver" className="text-sm font-medium">
                      Email / account verified
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Shows the verified badge on public profiles.
                    </p>
                  </div>
                  <Switch
                    id="prem-ver"
                    checked={draftVerified}
                    onCheckedChange={setDraftVerified}
                  />
                </div>
                <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
                  <p>
                    Wallet:{" "}
                    <span className="font-medium text-foreground tabular-nums">
                      {formatMoney(selected.walletBalance)}
                    </span>
                  </p>
                  <p className="mt-1">
                    Premium since:{" "}
                    <span className="font-medium text-foreground">
                      {purchasedLabel(selected.premiumPurchasedAt)}
                    </span>
                  </p>
                </div>
              </div>
              <DialogFooter className="mx-0 mb-0 shrink-0 gap-2 rounded-none border-t border-border/40 bg-muted/20 px-4 py-4 sm:justify-end sm:px-5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelected(null)}
                  disabled={pending}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={pending}
                  onClick={() => void saveSelected()}
                >
                  {pending ? "Saving…" : "Save"}
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </main>
  );
}
