"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronsUpDown, Loader2, Search } from "lucide-react";
import { adminFetch, useDebounced } from "@/components/admin/kit";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { PickedUser } from "./price-desk";

export type PickerItem = { id: string; title: string; sub?: string; badge?: string; tone?: "success" | "muted"; initial?: string };

type Props = {
  items: PickerItem[];
  value: string;
  onSelect: (id: string) => void;
  placeholder: string;
  /** Selected item to show when it is not inside `items` (server-filtered lists). */
  selected?: PickerItem | null;
  disabled?: boolean;
  loading?: boolean;
  /** Controlled search for server-side lists; omit for local filtering. */
  search?: string;
  onSearch?: (v: string) => void;
  searchable?: boolean;
  hasMore?: boolean;
  onMore?: () => void;
  emptyText?: string;
  large?: boolean;
};

function Avatar({ text }: { text: string }) {
  return <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold uppercase text-primary">{text.slice(0, 2)}</span>;
}

/** Searchable dropdown: trigger button + popover with search, keyboard navigation and highlighted rows. */
export function SearchPicker({ items, value, onSelect, placeholder, selected, disabled, loading, search, onSearch, searchable = true, hasMore, onMore, emptyText = "Nothing found", large }: Props) {
  const [open, setOpen] = useState(false);
  const [local, setLocal] = useState("");
  const [cursor, setCursor] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);
  const server = onSearch !== undefined;
  const text = server ? (search ?? "") : local;
  const shown = server || !text.trim() ? items : items.filter((i) => `${i.title} ${i.sub ?? ""}`.toLowerCase().includes(text.trim().toLowerCase()));
  const current = items.find((i) => i.id === value) ?? selected ?? null;

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-i="${cursor}"]`)?.scrollIntoView({ block: "nearest" });
  }, [cursor]);

  function pick(id: string) {
    onSelect(id);
    setOpen(false);
    setLocal("");
    onSearch?.("");
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(shown.length - 1, c + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(0, c - 1));
    } else if (e.key === "Enter" && shown[cursor]) {
      e.preventDefault();
      pick(shown[cursor].id);
    }
  }

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        setCursor(0);
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "flex w-full items-center justify-between gap-3 rounded-lg border bg-background px-3 text-left text-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
            large ? "h-14" : "h-10",
          )}
        >
          {current ? (
            <span className="flex min-w-0 items-center gap-2.5">
              {current.initial ? <Avatar text={current.initial} /> : null}
              <span className="min-w-0">
                <span className="block truncate font-medium">{current.title}</span>
                {current.sub && large ? <span className="block truncate text-xs text-muted-foreground">{current.sub}</span> : null}
              </span>
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-(--radix-popover-trigger-width) min-w-72 gap-0 p-0" onKeyDown={onKey}>
        {searchable ? (
          <div className="relative border-b p-2">
            <Search className="pointer-events-none absolute left-4.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              autoFocus
              value={text}
              onChange={(e) => {
                setCursor(0);
                if (server) onSearch!(e.target.value);
                else setLocal(e.target.value);
              }}
              placeholder="Type to search…"
              className="h-9 w-full rounded-md bg-muted/50 pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:bg-muted"
            />
            {loading ? <Loader2 className="absolute right-5 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" /> : null}
          </div>
        ) : null}
        <ul ref={listRef} className="max-h-72 overflow-y-auto p-1">
          {shown.map((it, i) => (
            <li key={it.id} data-i={i}>
              <button
                type="button"
                onClick={() => pick(it.id)}
                onMouseEnter={() => setCursor(i)}
                className={cn("flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left", i === cursor && "bg-accent")}
              >
                {it.initial ? <Avatar text={it.initial} /> : null}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{it.title}</span>
                  {it.sub ? <span className="block truncate text-xs text-muted-foreground">{it.sub}</span> : null}
                </span>
                {it.badge ? <Badge variant={it.tone === "success" ? "success" : "muted"}>{it.badge}</Badge> : null}
                {it.id === value ? <Check className="size-4 text-primary" /> : null}
              </button>
            </li>
          ))}
          {shown.length === 0 ? <li className="px-3 py-6 text-center text-sm text-muted-foreground">{loading ? "Loading…" : emptyText}</li> : null}
          {hasMore ? (
            <li>
              <button type="button" onClick={onMore} className="w-full rounded-md px-2 py-2 text-center text-xs font-medium text-primary hover:bg-accent">
                Load more
              </button>
            </li>
          ) : null}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

type PickUser = PickedUser & { specialPriceCount: number };

/** Server-backed user picker: searches as you type, loads 30 at a time. */
export function UserSearchPicker({ value, onPick, large, placeholder = "Select user…" }: { value: PickedUser | null; onPick: (u: PickedUser) => void; large?: boolean; placeholder?: string }) {
  const [q, setQ] = useState("");
  const dq = useDebounced(q).trim();
  const [pg, setPg] = useState({ dq: "", page: 1 });
  const page = pg.dq === dq ? pg.page : 1;
  const [res, setRes] = useState<{ k: string; users: PickUser[]; hasMore: boolean }>({ k: "", users: [], hasMore: false });
  const reqKey = `${dq}#${page}`;
  const users = res.users;

  useEffect(() => {
    let live = true;
    adminFetch<{ users: PickUser[]; hasMore: boolean }>(`/api/admin/special-prices?pick=1&page=${page}&q=${encodeURIComponent(dq)}`)
      .then((d) => live && setRes((cur) => ({ k: reqKey, users: page === 1 ? d.users : [...cur.users, ...d.users], hasMore: d.hasMore })))
      .catch(() => live && setRes((cur) => ({ ...cur, k: reqKey, hasMore: false })));
    return () => {
      live = false;
    };
  }, [dq, page, reqKey]);

  const toItem = (u: PickUser): PickerItem => ({
    id: u.id,
    title: `@${u.username}`,
    sub: u.email,
    initial: u.username,
    badge: u.specialPriceCount ? `${u.specialPriceCount} deal${u.specialPriceCount === 1 ? "" : "s"}` : u.role,
    tone: u.specialPriceCount ? "success" : "muted",
  });

  return (
    <SearchPicker
      items={users.map(toItem)}
      value={value?.id ?? ""}
      selected={value ? { id: value.id, title: `@${value.username}`, sub: value.email, initial: value.username } : null}
      onSelect={(id) => {
        const u = users.find((x) => x.id === id);
        if (u) onPick({ id: u.id, username: u.username, email: u.email, role: u.role });
      }}
      placeholder={placeholder}
      search={q}
      onSearch={setQ}
      loading={res.k !== reqKey}
      hasMore={res.hasMore}
      onMore={() => setPg({ dq, page: page + 1 })}
      emptyText="No users found"
      large={large}
    />
  );
}
