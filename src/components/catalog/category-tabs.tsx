import { getCategoryLucideIcon, LayoutGrid } from "@/lib/category-icons";
import { cn } from "@/lib/utils";
import { LoaderCircle } from "lucide-react";
import Link from "next/link";

type Category = {
  id: string;
  name: string;
  slug: string;
  icon?: string | null;
};

type CategoryTabsProps = {
  categories: Category[];
  activeSlug?: string;
  basePath?: string;
  onSelectCategory?: (slug: string | undefined) => void;
  onPrefetchCategory?: (slug: string | undefined) => void;
  loadingSlug?: string | null;
};

export function CategoryTabs({
  categories,
  activeSlug,
  basePath = "/",
  onSelectCategory,
  onPrefetchCategory,
  loadingSlug,
}: CategoryTabsProps) {
  const tabs = [
    { id: "all", name: "All", slug: undefined as string | undefined },
    ...categories,
  ];

  const inApp = basePath.startsWith("/app");
  const hash = "#store";

  return (
    <div
      className={cn(
        "sticky z-30 -mx-4 border-b border-border bg-background max-md:bg-background md:bg-background/95 md:backdrop-blur md:supports-backdrop-filter:bg-background/80",
        inApp
          ? "top-16 group-has-data-[collapsible=icon]/sidebar-wrapper:top-12"
          : "top-14",
      )}
    >
      <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 py-3">
        {tabs.map((tab) => {
          const href = tab.slug
            ? `${basePath}?category=${tab.slug}${hash}`
            : `${basePath}${hash}`;
          const isActive =
            tab.slug === undefined ? !activeSlug : activeSlug === tab.slug;
          const isLoadingThisTab =
            tab.slug === undefined
              ? loadingSlug === "" || loadingSlug === "all"
              : loadingSlug === tab.slug;
          const Icon =
            tab.slug === undefined
              ? LayoutGrid
              : getCategoryLucideIcon("icon" in tab ? tab.icon : undefined, tab.slug);

          return (
            <Link
              key={tab.id}
              href={href}
              scroll={false}
              data-interactive
              onClick={(e) => {
                if (onSelectCategory) {
                  e.preventDefault();
                  onSelectCategory(tab.slug);
                }
              }}
              onMouseEnter={() => {
                onPrefetchCategory?.(tab.slug);
              }}
              onTouchStart={() => {
                onPrefetchCategory?.(tab.slug);
              }}
              className={cn(
                "pressable inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-all duration-150 active:scale-95",
                isActive
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {isLoadingThisTab ? (
                <LoaderCircle className="size-3.5 animate-spin opacity-90" />
              ) : (
                <Icon className="size-3.5 opacity-80" />
              )}
              {tab.name}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

