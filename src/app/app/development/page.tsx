import { headers } from "next/headers";
import { getCurrentUser } from "@/lib/auth/customer";
import { API_SCOPES } from "@/lib/seller-api/auth";
import { getPlatformApiHubSnapshot } from "@/lib/seller-api/keys";
import { SDK_PACKS } from "@/lib/seller-api/sdk-packs";
import { DevelopmentClient } from "./development-client";

export const dynamic = "force-dynamic";

export default async function DevelopmentPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const user = (await getCurrentUser())!;
  const [{ overview, credentials, webhooks }, { tab }, h] = await Promise.all([getPlatformApiHubSnapshot(user), searchParams, headers()]);
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");

  return (
    <DevelopmentClient
      overview={JSON.parse(JSON.stringify(overview))}
      credentials={credentials}
      webhooks={webhooks}
      scopes={[...API_SCOPES]}
      origin={`${proto}://${host}`}
      sdks={SDK_PACKS.map(({ id, label, filename, description }) => ({ id, label, filename, description }))}
      initialTab={tab}
    />
  );
}
