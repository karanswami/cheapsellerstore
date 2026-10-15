"use client";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  MAX_SUPPORT_BOT_BUTTONS,
  type SupportBotButton,
  type SupportBotButtonType,
} from "@/types/support";
import { Bot, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type StepRow = {
  id: string;
  slug: string;
  title: string;
  messageText: string;
  isEntry: boolean;
  isFallback: boolean;
  active: boolean;
  sortOrder: number;
  buttons: SupportBotButton[];
};

type BotSummary = {
  total: number;
  active: number;
  entryTitle: string;
};

type FormState = {
  slug: string;
  title: string;
  messageText: string;
  isEntry: boolean;
  isFallback: boolean;
  active: boolean;
  sortOrder: string;
  buttons: SupportBotButton[];
};

const BUTTON_TYPES: { value: SupportBotButtonType; label: string }[] = [
  { value: "step", label: "Go to step" },
  { value: "link", label: "Open link" },
  { value: "back", label: "Back" },
  { value: "input", label: "Let user type" },
];

const emptyForm: FormState = {
  slug: "",
  title: "",
  messageText: "",
  isEntry: false,
  isFallback: false,
  active: true,
  sortOrder: "100",
  buttons: [{ id: "btn-1", label: "", type: "step" }],
};

function stepToForm(step: StepRow): FormState {
  return {
    slug: step.slug,
    title: step.title,
    messageText: step.messageText,
    isEntry: step.isEntry,
    isFallback: step.isFallback,
    active: step.active,
    sortOrder: String(step.sortOrder),
    buttons:
      step.buttons.length > 0
        ? step.buttons.map((b) => ({ ...b }))
        : [{ id: "btn-1", label: "", type: "step" }],
  };
}

type SupportBotSettingsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function SupportBotSettingsDialog({
  open,
  onOpenChange,
}: SupportBotSettingsDialogProps) {
  const { data, loading, reload } = useAdminFetch<{
    steps: StepRow[];
    summary: BotSummary;
  }>("/api/admin/support-bot");
  const steps = data?.steps ?? [];

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<StepRow | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [pending, setPending] = useState(false);

  const slugLocked = Boolean(editing);

  const stepOptions = useMemo(
    () => steps.filter((s) => !editing || s.id !== editing.id),
    [steps, editing],
  );

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setEditOpen(true);
  }

  function openEdit(step: StepRow) {
    setEditing(step);
    setForm(stepToForm(step));
    setEditOpen(true);
  }

  function updateButton(index: number, patch: Partial<SupportBotButton>) {
    setForm((prev) => {
      const buttons = [...prev.buttons];
      buttons[index] = { ...buttons[index], ...patch };
      return { ...prev, buttons };
    });
  }

  function addButton() {
    setForm((prev) => {
      if (prev.buttons.length >= MAX_SUPPORT_BOT_BUTTONS) return prev;
      const lastRow = prev.buttons.reduce(
        (max, b) => Math.max(max, typeof b.row === "number" ? b.row : 0),
        0,
      );
      return {
        ...prev,
        buttons: [
          ...prev.buttons,
          {
            id: `btn-${prev.buttons.length + 1}`,
            label: "",
            type: "step",
            row: lastRow > 0 ? lastRow + 1 : undefined,
          },
        ],
      };
    });
  }

  function removeButton(index: number) {
    setForm((prev) => ({
      ...prev,
      buttons: prev.buttons.filter((_, i) => i !== index),
    }));
  }

  async function save() {
    setPending(true);
    const sortOrder = Number.parseInt(form.sortOrder, 10);
    const payload = {
      slug: form.slug.trim() || undefined,
      title: form.title.trim(),
      messageText: form.messageText.trim(),
      isEntry: form.isEntry,
      isFallback: form.isFallback,
      active: form.active,
      sortOrder: Number.isFinite(sortOrder) ? sortOrder : 100,
      buttons: form.buttons
        .filter((b) => b.label.trim())
        .map((b, i) => ({
          id: b.id || `btn-${i + 1}`,
          label: b.label.trim(),
          type: b.type,
          ...(typeof b.row === "number" && b.row > 0 ? { row: b.row } : {}),
          ...(b.type === "step" && b.targetStepId
            ? { targetStepId: b.targetStepId }
            : {}),
          ...(b.type === "link" && b.href ? { href: b.href.trim() } : {}),
        })),
    };

    const result = editing
      ? await adminMutate(`/api/admin/support-bot/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        })
      : await adminMutate("/api/admin/support-bot", {
          method: "POST",
          body: JSON.stringify(payload),
        });

    setPending(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success(editing ? "Step updated" : "Step created");
    setEditOpen(false);
    void reload();
  }

  async function removeStep(step: StepRow) {
    if (!window.confirm(`Delete step "${step.title}"?`)) return;
    const result = await adminMutate(`/api/admin/support-bot/${step.id}`, {
      method: "DELETE",
    });
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success("Step deleted");
    void reload();
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[min(92dvh,44rem)] gap-0 overflow-hidden p-0 sm:max-w-lg">
          <DialogHeader className="border-b border-border bg-muted/40 px-4 py-3">
            <DialogTitle className="flex items-center gap-2">
              <Bot className="size-4 text-primary" />
              Support bot
            </DialogTitle>
            <DialogDescription>
              Telegram-style button tree. Customers tap buttons; free text uses
              the fallback step.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2">
            <p className="text-xs text-muted-foreground">
              {loading
                ? "Loading…"
                : `${data?.summary.active ?? 0} active · entry: ${data?.summary.entryTitle ?? "—"}`}
            </p>
            <Button type="button" size="sm" onClick={openCreate}>
              <Plus className="size-4" />
              Add step
            </Button>
          </div>

          <div className="max-h-[min(60dvh,28rem)] overflow-y-auto px-2 py-2">
            {loading ? (
              <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                Loading steps…
              </p>
            ) : steps.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                No steps yet. Add an entry step to start.
              </p>
            ) : (
              <ul className="space-y-1">
                {steps.map((step) => (
                  <li
                    key={step.id}
                    className="flex items-start gap-2 rounded-lg px-2 py-2 hover:bg-muted/50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{step.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {step.slug} · {step.buttons.length} button
                        {step.buttons.length === 1 ? "" : "s"}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {step.isEntry ? (
                          <Badge variant="outline" className="text-[10px]">
                            Entry
                          </Badge>
                        ) : null}
                        {step.isFallback ? (
                          <Badge variant="secondary" className="text-[10px]">
                            Fallback
                          </Badge>
                        ) : null}
                        {!step.active ? (
                          <Badge variant="destructive" className="text-[10px]">
                            Off
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        aria-label={`Edit ${step.title}`}
                        onClick={() => openEdit(step)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        aria-label={`Delete ${step.title}`}
                        onClick={() => void removeStep(step)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <DialogFooter className="border-t border-border px-4 py-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[min(92dvh,44rem)] gap-0 overflow-hidden p-0 sm:max-w-lg">
          <DialogHeader className="border-b border-border bg-muted/40 px-4 py-3">
            <DialogTitle>{editing ? "Edit step" : "New step"}</DialogTitle>
            <DialogDescription>
              Message shown when the user reaches this step. Buttons link to other
              steps or URLs.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[min(58dvh,26rem)] space-y-4 overflow-y-auto px-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="bot-title">Title</Label>
              <Input
                id="bot-title"
                value={form.title}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder="Deposit help"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="bot-slug">Slug</Label>
              <Input
                id="bot-slug"
                value={form.slug}
                disabled={slugLocked}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, slug: e.target.value }))
                }
                placeholder="deposit_help"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="bot-message">Reply message</Label>
              <Textarea
                id="bot-message"
                value={form.messageText}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, messageText: e.target.value }))
                }
                rows={4}
                placeholder="What the bot says at this step…"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="bot-sort">Sort order</Label>
              <Input
                id="bot-sort"
                type="number"
                value={form.sortOrder}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, sortOrder: e.target.value }))
                }
              />
            </div>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={form.isEntry}
                  onCheckedChange={(v) =>
                    setForm((prev) => ({ ...prev, isEntry: v }))
                  }
                />
                Entry step
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={form.isFallback}
                  onCheckedChange={(v) =>
                    setForm((prev) => ({ ...prev, isFallback: v }))
                  }
                />
                Fallback (free text)
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={form.active}
                  onCheckedChange={(v) =>
                    setForm((prev) => ({ ...prev, active: v }))
                  }
                />
                Active
              </label>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Buttons</Label>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Same row # = side-by-side (Telegram keyboard). Priority topics
                    first; Back / Type alone on their own row.
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={form.buttons.length >= MAX_SUPPORT_BOT_BUTTONS}
                  onClick={addButton}
                >
                  <Plus className="size-4" />
                  Add
                </Button>
              </div>
              {form.buttons.map((btn, index) => (
                <div
                  key={`${btn.id}-${index}`}
                  className="space-y-2 rounded-lg border border-border p-3"
                >
                  <div className="flex gap-2">
                    <Input
                      value={btn.label}
                      onChange={(e) =>
                        updateButton(index, { label: e.target.value })
                      }
                      placeholder="😊 Label with emoji"
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      min={1}
                      max={20}
                      value={btn.row ?? ""}
                      onChange={(e) => {
                        const n = Number.parseInt(e.target.value, 10);
                        updateButton(index, {
                          row: Number.isFinite(n) && n > 0 ? n : undefined,
                        });
                      }}
                      placeholder="Row"
                      className="w-16 shrink-0"
                      aria-label="Keyboard row"
                      title="Telegram keyboard row (same number = side by side)"
                    />
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => removeButton(index)}
                      aria-label="Remove button"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                  <Select
                    value={btn.type}
                    onValueChange={(v) =>
                      updateButton(index, {
                        type: v as SupportBotButtonType,
                        targetStepId: undefined,
                        href: undefined,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BUTTON_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {btn.type === "step" ? (
                    <Select
                      value={btn.targetStepId ?? ""}
                      onValueChange={(v) =>
                        updateButton(index, { targetStepId: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Target step" />
                      </SelectTrigger>
                      <SelectContent>
                        {stepOptions.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : null}
                  {btn.type === "link" ? (
                    <Input
                      value={btn.href ?? ""}
                      onChange={(e) =>
                        updateButton(index, { href: e.target.value })
                      }
                      placeholder="/app/deposit or https://…"
                    />
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="gap-2 border-t border-border px-4 py-3 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" disabled={pending} onClick={() => void save()}>
              {pending ? "Saving…" : "Save step"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function useSupportBotSummary() {
  const { data, loading } = useAdminFetch<{
    steps: StepRow[];
    summary: BotSummary;
  }>("/api/admin/support-bot");
  return {
    loading,
    summary: data?.summary ?? null,
  };
}
