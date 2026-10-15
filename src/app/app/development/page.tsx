import { DevelopmentView } from "@/components/app/development/development-view";
import { getCurrentUser } from "@/lib/auth/customer";
import { getPlatformApiHubSnapshot } from "@/lib/seller-api/keys";
import { redirect } from "next/navigation";

export default async function DevelopmentPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/?auth=login&next=/app/development");

  if (user.role !== "SELLER" && user.role !== "RESELLER" && user.role !== "ADMIN") {
    redirect("/app");
  }

  const hub = await getPlatformApiHubSnapshot(user);

  return (
    <DevelopmentView
      initialOverview={hub.overview}
      initialCredentials={hub.credentials}
      initialWebhooks={hub.webhooks}
    />
  );
}
