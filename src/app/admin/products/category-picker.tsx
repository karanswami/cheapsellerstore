"use client";

import { createElement } from "react";
import { Folder } from "lucide-react";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CATEGORY_ICON_OPTIONS, getCategoryLucideIcon } from "@/lib/category-icons";
import { cn } from "@/lib/utils";
import type { CategoryRow } from "./types";

/** Rounded tile with a category's Lucide icon (falls back to a slug-based guess). */
export function CategoryIcon({
  icon,
  slug,
  className,
  tile = false,
}: {
  icon?: string | null;
  slug?: string | null;
  className?: string;
  tile?: boolean;
}) {
  const glyph = getCategoryLucideIcon(icon, slug);
  if (!tile) return createElement(glyph, { className: cn("size-4", className) });
  return (
    <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary", className)}>
      {createElement(glyph, { className: "size-5" })}
    </span>
  );
}

const NONE = "__none__";

/** Category dropdown where every option shows its icon. */
export function CategorySelect({
  value,
  onChange,
  categories,
  allowAll,
  className,
}: {
  value: string | null;
  onChange: (id: string | null) => void;
  categories: CategoryRow[];
  /** Filter mode: adds an "All categories" row (value "all"). */
  allowAll?: boolean;
  className?: string;
}) {
  const current = allowAll && value === "all" ? "all" : value ?? NONE;
  return (
    <Select
      value={current}
      onValueChange={(v) => onChange(v === NONE ? null : v)}
    >
      <SelectTrigger className={cn("w-full", className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {allowAll ? (
          <SelectItem value="all">
            <span className="flex items-center gap-2"><Folder className="size-4 text-muted-foreground" /> All categories</span>
          </SelectItem>
        ) : null}
        <SelectItem value={NONE}>
          <span className="flex items-center gap-2"><Folder className="size-4 text-muted-foreground" /> Uncategorized</span>
        </SelectItem>
        {categories.map((c) => (
          <SelectItem key={c.id} value={c.id}>
            <span className="flex items-center gap-2"><CategoryIcon icon={c.icon} slug={c.slug} className="text-primary" /> {c.name}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

const ICON_GROUPS = Array.from(new Set(CATEGORY_ICON_OPTIONS.map((o) => o.group)));

/** Icon dropdown for the category form — grouped, each row previews its glyph. */
export function IconSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Select value={value || "auto"} onValueChange={(v) => onChange(v === "auto" ? "" : v)}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Pick an icon" />
      </SelectTrigger>
      <SelectContent className="max-h-72">
        <SelectItem value="auto">
          <span className="flex items-center gap-2"><Folder className="size-4 text-muted-foreground" /> Auto (from name)</span>
        </SelectItem>
        {ICON_GROUPS.map((g) => (
          <SelectGroup key={g}>
            <SelectLabel>{g}</SelectLabel>
            {CATEGORY_ICON_OPTIONS.filter((o) => o.group === g).map((o) => (
              <SelectItem key={o.value} value={o.value}>
                <span className="flex items-center gap-2"><o.icon className="size-4 text-primary" /> {o.label}</span>
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}
