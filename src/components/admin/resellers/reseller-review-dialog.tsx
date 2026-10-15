"use client";

import type {
  ResellerRequestRow,
  ResellerRequestStatus,
} from "@/components/admin/resellers/reseller-types";
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
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { formatMoney } from "@/lib/currencies";
import { isUserRole, roleBadge } from "@/lib/roles";
import { cn } from "@/lib/utils";
import {
  BadgeCheck,
  CalendarDays,
  ExternalLink,
  Globe,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Store,
  UserRound,
  Users,
  Wallet,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";

function statusBadgeClass(status: ResellerRequestStatus) {
  switch (status) {
    case "PENDING":
      return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400";
    case "APPROVED":
      return "border-success/30 bg-success/10 text-success";
    case "REJECTED":
      return "border-destructive/30 bg-destructive/10 text-destructive";
  }
}

function statusLabel(status: ResellerRequestStatus) {
  switch (status) {
    case "PENDING":
      return "Pending review";
    case "APPROVED":
      return "Approved";
    case "REJECTED":
      return "Rejected";
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function LinkRow({
  label,
  value,
  href,
  icon: Icon,
}: {
  label: string;
  value: string | null | undefined;
  href?: string | null;
  icon: typeof Globe;
}) {
  const display = value?.trim() || "—";
  const link = href?.trim();
  return (
    <div className="flex gap-2.5">
      <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="size-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          {label}
        </p>
        {link && display !== "—" ? (
          <a
            href={link.startsWith("http") ? link : `https://${link}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex max-w-full items-center gap-1 truncate text-sm font-medium text-primary hover:underline"
          >
            <span className="truncate">{display}</span>
            <ExternalLink className="size-3 shrink-0 opacity-70" />
          </a>
        ) : (
          <p className="truncate text-sm text-foreground">{display}</p>
        )}
      </div>
    </div>
  );
}

function Fact({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Globe;
}) {
  return (
    <div className="flex gap-2.5">
      <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="size-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          {label}
        </p>
        <p className="break-words text-sm text-foreground">{value}</p>
      </div>
    </div>
  );
}

export function ResellerReviewDialog({
  request,
  pending,
  onOpenChange,
  onApprove,
  onReject,
}: {
  request: ResellerRequestRow | null;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onApprove: (adminNote?: string) => Promise<boolean>;
  onReject: (adminNote?: string) => Promise<boolean>;
}) {
  const [note, setNote] = useState("");

  useEffect(() => {
    if (request) setNote(request.adminNote ?? "");
  }, [request]);

  return (
    <Dialog open={Boolean(request)} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="flex max-h-[min(92dvh,760px)] w-full max-w-[calc(100%-1.25rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg"
      >
        {request ? (
          <>
            <div className="shrink-0 border-b border-border/40 bg-muted/40 px-4 pt-4 pb-3.5 sm:px-5">
              <DialogHeader className="gap-2 pr-8 text-left">
                <div className="mb-0.5 flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <Store className="size-5" />
                </div>
                <DialogTitle className="text-lg leading-tight">
                  {request.fullName}
                </DialogTitle>
                <DialogDescription className="flex flex-wrap items-center gap-1.5">
                  <span className="font-medium text-foreground">
                    @{request.user.username}
                  </span>
                  <Badge
                    variant="outline"
                    className={cn(statusBadgeClass(request.status))}
                  >
                    {statusLabel(request.status)}
                  </Badge>
                  <Badge variant="secondary">
                    {isUserRole(request.user.role)
                      ? roleBadge(request.user.role)
                      : request.user.role}
                  </Badge>
                  {request.user.banned ? (
                    <Badge variant="destructive">Banned</Badge>
                  ) : null}
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-card ring-1 ring-foreground/10 px-3 py-2.5">
                  <p className="flex items-center gap-1 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                    <Wallet className="size-3" />
                    Wallet
                  </p>
                  <p className="mt-1 text-lg font-semibold tabular-nums text-success">
                    {formatMoney(request.user.walletBalance)}
                  </p>
                </div>
                <div className="rounded-xl bg-card ring-1 ring-foreground/10 px-3 py-2.5">
                  <p className="flex items-center gap-1 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                    <Users className="size-3" />
                    Reach
                  </p>
                  <p className="mt-1 truncate text-lg font-semibold tabular-nums">
                    {request.followerCount || "—"}
                  </p>
                </div>
              </div>

              <section className="space-y-3 rounded-xl border border-border px-3.5 py-3">
                <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                  Account
                </p>
                <Fact
                  label="Email"
                  value={request.user.email}
                  icon={Mail}
                />
                <Fact
                  label="Display name"
                  value={request.user.name || "—"}
                  icon={UserRound}
                />
                <Fact
                  label="Applied"
                  value={formatDate(request.createdAt)}
                  icon={CalendarDays}
                />
                {request.reviewedAt ? (
                  <Fact
                    label="Reviewed"
                    value={formatDate(request.reviewedAt)}
                    icon={BadgeCheck}
                  />
                ) : null}
              </section>

              <section className="space-y-3 rounded-xl border border-border px-3.5 py-3">
                <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                  Contact & location
                </p>
                <Fact label="Phone" value={request.phone || "—"} icon={Phone} />
                <Fact
                  label="Country"
                  value={request.country || "—"}
                  icon={MapPin}
                />
                <Fact
                  label="Telegram"
                  value={request.telegram || "—"}
                  icon={MessageCircle}
                />
              </section>

              <section className="space-y-3 rounded-xl border border-border px-3.5 py-3">
                <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                  Presence
                </p>
                <LinkRow
                  label="Facebook"
                  value={request.facebookUrl}
                  href={request.facebookUrl}
                  icon={Globe}
                />
                <LinkRow
                  label="YouTube"
                  value={request.youtubeUrl}
                  href={request.youtubeUrl}
                  icon={Globe}
                />
                <LinkRow
                  label="TG channel"
                  value={request.telegramChannelUrl}
                  href={request.telegramChannelUrl}
                  icon={MessageCircle}
                />
                <LinkRow
                  label="Website"
                  value={request.websiteUrl}
                  href={request.websiteUrl}
                  icon={Globe}
                />
              </section>

              <section className="space-y-3 rounded-xl border border-border px-3.5 py-3">
                <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                  Application
                </p>
                <Fact
                  label="Selling platform"
                  value={request.sellingPlatform || "—"}
                  icon={Store}
                />
                <Fact
                  label="Experience"
                  value={request.experience?.trim() || "—"}
                  icon={BadgeCheck}
                />
                <div>
                  <p className="mb-1.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                    Why they want to join
                  </p>
                  <p className="rounded-lg bg-muted/50 px-3 py-2.5 text-sm leading-relaxed whitespace-pre-wrap">
                    {request.reason?.trim() || "—"}
                  </p>
                </div>
              </section>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="reseller-admin-note">Admin note</Label>
                <Textarea
                  id="reseller-admin-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Optional note for approve / reject…"
                  rows={3}
                  className="resize-none"
                  maxLength={500}
                />
                <p className="text-[11px] text-muted-foreground">
                  Saved with the review action · {note.length}/500
                </p>
              </div>
            </div>

            <DialogFooter className="mx-0 mb-0 shrink-0 gap-2 sm:justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={pending}
              >
                Close
              </Button>
              <div className="flex flex-wrap justify-end gap-2">
                {request.status !== "REJECTED" ? (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={pending}
                    className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() =>
                      void onReject(note.trim() || undefined).then((ok) => {
                        if (ok) onOpenChange(false);
                      })
                    }
                  >
                    <XCircle className="size-3.5" />
                    {request.status === "APPROVED" ? "Disapprove" : "Reject"}
                  </Button>
                ) : null}
                {request.status !== "APPROVED" ? (
                  <Button
                    type="button"
                    disabled={pending}
                    className="gap-1.5"
                    onClick={() =>
                      void onApprove(note.trim() || undefined).then((ok) => {
                        if (ok) onOpenChange(false);
                      })
                    }
                  >
                    <BadgeCheck className="size-3.5" />
                    {pending ? "Saving…" : "Approve"}
                  </Button>
                ) : null}
              </div>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

export { statusBadgeClass, statusLabel };
