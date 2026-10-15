import { SystemStatusScreen } from "@/components/layout/system-status-screen";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Session expired",
  robots: { index: false, follow: false },
};

export default function SessionExpiredPage() {
  return (
    <SystemStatusScreen
      variant="session"
      code="401"
      title="Session expired"
      description="For your security, your session ended. Sign in again to continue shopping, check keys, or manage your wallet."
      primaryAction={{
        label: "Sign in again",
        href: "/?auth=login&next=/app",
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
