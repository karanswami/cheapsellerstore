"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

type VersionPickerProps = {
  versions: string[];
  value: string | null;
  onChange: (version: string) => void;
};

export function VersionPicker({
  versions,
  value,
  onChange,
}: VersionPickerProps) {
  const multi = versions.length >= 2;

  return (
    <div
      className={cn("grid gap-2.5", multi && "sm:grid-cols-2")}
      role="radiogroup"
      aria-label="Select version"
    >
      {versions.map((version) => {
        const selected = value === version;
        return (
          <button
            key={version}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(version)}
            className={cn(
              "group relative flex min-h-[3.25rem] w-full items-center rounded-2xl px-3.5 py-3 text-left ring-1 transition-[background-color,box-shadow,ring-color,transform]",
              "pressable",
              selected
                ? "bg-primary/12 ring-primary shadow-[var(--glow-soft)]"
                : "bg-card/80 ring-foreground/10 hover:bg-muted/50 hover:ring-foreground/20",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "absolute top-3 right-3 flex size-5 items-center justify-center rounded-full ring-2 transition-colors",
                selected
                  ? "bg-primary text-primary-foreground ring-primary"
                  : "bg-transparent ring-muted-foreground/35 group-hover:ring-muted-foreground/55",
              )}
            >
              {selected ? <Check className="size-3 stroke-[3]" /> : null}
            </span>
            <p className="pr-7 text-sm font-semibold tracking-tight">
              {version}
            </p>
          </button>
        );
      })}
    </div>
  );
}
