import styles from "@/components/app/hub/hub-toolbar.module.css";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";
import type { ReactNode } from "react";

type HubToolbarProps = {
  children?: ReactNode;
  className?: string;
};

export function HubToolbar({ children, className }: HubToolbarProps) {
  return (
    <div className={cn(styles.toolbar, className)}>{children}</div>
  );
}

export function HubToolbarRow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn(styles.row, className)}>{children}</div>;
}

type HubSearchProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
};

export function HubSearch({
  value,
  onChange,
  placeholder = "Search…",
  className,
}: HubSearchProps) {
  return (
    <div className={cn(styles.searchWrap, className)}>
      <Search className={styles.searchIcon} aria-hidden />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={styles.searchInput}
      />
    </div>
  );
}
