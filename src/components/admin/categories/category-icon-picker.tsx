"use client";

import { useMemo, useState } from "react";
import {
  CATEGORY_ICON_OPTIONS,
  getCategoryLucideIcon,
  type CategoryIconOption,
} from "@/lib/category-icons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Check, ChevronDown, FolderTree, Search, X } from "lucide-react";

type CategoryIconPickerProps = {
  value?: string | null;
  onChange: (value: string) => void;
  disabled?: boolean;
};

export function CategoryIconPicker({
  value,
  onChange,
  disabled,
}: CategoryIconPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selectedOption = useMemo(
    () => CATEGORY_ICON_OPTIONS.find((opt) => opt.value.toLowerCase() === (value || "").toLowerCase()),
    [value],
  );

  const CurrentIcon = value ? getCategoryLucideIcon(value) : FolderTree;

  const filteredOptions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return CATEGORY_ICON_OPTIONS;
    return CATEGORY_ICON_OPTIONS.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        opt.value.toLowerCase().includes(q) ||
        opt.group.toLowerCase().includes(q),
    );
  }, [search]);

  const grouped = useMemo(() => {
    const map = new Map<string, CategoryIconOption[]>();
    for (const opt of filteredOptions) {
      const list = map.get(opt.group) ?? [];
      list.push(opt);
      map.set(opt.group, list);
    }
    return Array.from(map.entries());
  }, [filteredOptions]);

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            setSearch("");
            setOpen(true);
          }}
          className={cn(
            "pressable flex h-10 flex-1 items-center justify-between gap-2.5 rounded-lg border border-input bg-background/50 px-3 text-sm transition-colors hover:bg-muted/50 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50",
            !value && "text-muted-foreground",
          )}
        >
          <div className="flex items-center gap-2.5 truncate">
            <div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <CurrentIcon className="size-4" />
            </div>
            <span className="truncate font-medium text-foreground">
              {selectedOption ? selectedOption.label : value || "Select icon (Optional)"}
            </span>
          </div>
          <ChevronDown className="size-4 shrink-0 opacity-50" />
        </button>

        {value ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-10 shrink-0 text-muted-foreground hover:text-foreground"
            onClick={() => onChange("")}
            title="Clear icon"
            disabled={disabled}
          >
            <X className="size-4" />
          </Button>
        ) : null}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[min(90dvh,580px)] w-full max-w-[calc(100%-1.25rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
          <div className="shrink-0 border-b border-border/40 bg-muted/40 px-4 pt-4 pb-3 sm:px-5">
            <DialogHeader className="gap-1.5 text-left">
              <DialogTitle className="text-base font-semibold">
                Select category icon
              </DialogTitle>
            </DialogHeader>

            <div className="relative mt-2.5">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search icon (e.g. game, shield, phone, crown)…"
                className="h-9 pl-8.5 text-xs"
                autoFocus
              />
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
            {grouped.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No icons found matching &ldquo;{search}&rdquo;.
              </div>
            ) : (
              grouped.map(([groupName, options]) => (
                <div key={groupName} className="space-y-1.5">
                  <p className="px-1 text-[11px] font-semibold tracking-wider text-muted-foreground/80 uppercase">
                    {groupName}
                  </p>
                  <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                    {options.map((opt) => {
                      const Icon = opt.icon;
                      const isSelected = value?.toLowerCase() === opt.value.toLowerCase();
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            onChange(opt.value);
                            setOpen(false);
                          }}
                          className={cn(
                            "pressable flex items-center gap-2 rounded-lg border p-2 text-left transition-all",
                            isSelected
                              ? "border-primary bg-primary/15 text-primary shadow-xs"
                              : "border-border/60 bg-card/60 text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground",
                          )}
                        >
                          <div
                            className={cn(
                              "flex size-7 shrink-0 items-center justify-center rounded-md",
                              isSelected ? "bg-primary text-primary-foreground" : "bg-muted/80 text-foreground",
                            )}
                          >
                            <Icon className="size-3.5" />
                          </div>
                          <span className="min-w-0 flex-1 truncate text-xs font-medium">
                            {opt.label}
                          </span>
                          {isSelected ? <Check className="size-3.5 shrink-0 text-primary" /> : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
