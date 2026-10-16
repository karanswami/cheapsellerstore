import { headers } from "next/headers";
import { PageHeader } from "@/components/app-ui";
import { getCurrentUser } from "@/lib/auth/customer";
import { API_SCOPES } from "@/lib/seller-api/auth";
import { getPlatformApiHubSnapshot } from "@/lib/seller-api/keys";
import { DevelopmentClient } from "./development-client";

export const dynamic = "force-dynamic";

export default async function DevelopmentPage() {
  const user = (await getCurrentUser())!;
  const { overview, credentials, webhooks } = await getPlatformApiHubSnapshot(user);
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");

  return (
    <>
      <PageHeader title="Platform API" subtitle="One credential · catalog · purchases · webhooks." />
      <DevelopmentClient
        overview={JSON.parse(JSON.stringify(overview))}
        credentials={credentials}
        webhooks={webhooks}
        scopes={[...API_SCOPES]}
        baseUrl={`${proto}://${host}/api/v1`}
      />
    </>
  );
}
