import { DevelopersDocsView } from "@/components/developers/developers-docs-view";
import {
  getApiDefaultRateLimitRpm,
  getApiPublicRateLimitRpm,
  getApiPurchaseFeePercent,
} from "@/lib/seller-api/settings";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Developer API Docs | Cheap Seller",
  description:
    "GitBook-style Platform API reference: full route demos, downloadable SDKs (Python/Node/PHP/Go/cURL), OpenAPI, AI prompt packs, live tester.",
};

export default async function DevelopersPage() {
  const [purchaseFeePercent, publicRateLimitRpm, privateRateLimitRpm] =
    await Promise.all([
      getApiPurchaseFeePercent(),
      getApiPublicRateLimitRpm(),
      getApiDefaultRateLimitRpm(),
    ]);
  const baseUrl = (
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3102"
  ).replace(/\/$/, "");

  return (
    <DevelopersDocsView
      purchaseFeePercent={purchaseFeePercent}
      publicRateLimitRpm={publicRateLimitRpm}
      privateRateLimitRpm={privateRateLimitRpm}
      baseUrl={baseUrl}
    />
  );
}
