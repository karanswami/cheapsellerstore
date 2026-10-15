"use client";

import { SystemStatusScreen } from "@/components/layout/system-status-screen";

export default function NotFound() {
  return (
    <SystemStatusScreen
      variant="notFound"
      code="404"
      title="Page not found"
      description="This link is broken or the page moved. Head back to the store and keep browsing."
      primaryAction={{
        label: "Open store",
        href: "/",
      }}
      secondaryAction={{
        label: "Customer app",
        href: "/app",
        variant: "outline",
      }}
      hideWave
    />
  );
}
