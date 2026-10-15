import { SystemStatusScreen } from "@/components/layout/system-status-screen";
import { getSupportChannels } from "@/lib/support-channels";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Account suspended",
  robots: { index: false, follow: false },
};

export default async function BannedPage() {
  const support = await getSupportChannels();
  const supportHref = support.telegramHref || support.whatsappHref || support.primaryHref;

  return (
    <SystemStatusScreen
      variant="banned"
      code="403"
      title="Account suspended"
      description="This account has been suspended and can no longer access the store. If you believe this is an error, please reach out on Telegram or WhatsApp."
      primaryAction={{ label: "Back to store", href: "/" }}
      secondaryAction={
        supportHref
          ? {
              label: support.telegramHref
                ? "Contact on Telegram"
                : support.whatsappHref
                  ? "Contact on WhatsApp"
                  : "Contact support",
              href: supportHref,
              variant: "outline",
            }
          : undefined
      }
      supportHref={supportHref ? null : undefined}
      hideWave
    />
  );
}
