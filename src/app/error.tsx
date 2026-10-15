"use client";

import { SystemStatusScreen } from "@/components/layout/system-status-screen";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <SystemStatusScreen
      variant="error"
      code="Error"
      title="Something went wrong"
      description="An unexpected error occurred. Try again — if it keeps happening, refresh the page or come back later."
      primaryAction={{
        label: "Try again",
        onClick: () => reset(),
      }}
      secondaryAction={{
        label: "Home",
        href: "/",
        variant: "outline",
      }}
      hideWave
    />
  );
}
