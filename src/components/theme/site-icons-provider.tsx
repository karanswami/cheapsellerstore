"use client";

import {
  defaultSiteIconsMap,
  type SiteIconKey,
  type SiteIconsMap,
} from "@/types/site-icons";
import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";

type SiteIconsContextValue = {
  icons: SiteIconsMap;
  getIcon: (key: SiteIconKey) => string;
};

const SiteIconsContext = createContext<SiteIconsContextValue | null>(null);

export function SiteIconsProvider({
  icons,
  children,
}: {
  icons?: SiteIconsMap | null;
  children: ReactNode;
}) {
  const value = useMemo(() => {
    const map = { ...defaultSiteIconsMap(), ...(icons ?? {}) };
    return {
      icons: map,
      getIcon: (key: SiteIconKey) => map[key] || defaultSiteIconsMap()[key],
    };
  }, [icons]);

  return (
    <SiteIconsContext.Provider value={value}>
      {children}
    </SiteIconsContext.Provider>
  );
}

export function useSiteIcons(): SiteIconsContextValue {
  const ctx = useContext(SiteIconsContext);
  if (!ctx) {
    throw new Error("useSiteIcons must be used within SiteIconsProvider");
  }
  return ctx;
}

export function useSiteIcon(key: SiteIconKey): string {
  return useSiteIcons().getIcon(key);
}
