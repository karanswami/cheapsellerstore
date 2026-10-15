"use client";

import { brandInitial, type SiteConfig } from "@/types/site-config";
import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";

type SiteConfigContextValue = SiteConfig & {
  initial: string;
};

const SiteConfigContext = createContext<SiteConfigContextValue | null>(null);

export function SiteConfigProvider({
  config,
  children,
}: {
  config: SiteConfig;
  children: ReactNode;
}) {
  const value = useMemo(
    () => ({
      ...config,
      initial: brandInitial(config.siteName),
    }),
    [config],
  );

  return (
    <SiteConfigContext.Provider value={value}>
      {children}
    </SiteConfigContext.Provider>
  );
}

export function useSiteConfig(): SiteConfigContextValue {
  const ctx = useContext(SiteConfigContext);
  if (!ctx) {
    throw new Error("useSiteConfig must be used within SiteConfigProvider");
  }
  return ctx;
}
