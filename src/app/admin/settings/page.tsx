import { PageHeader } from "@/components/app-ui";
import { AdminSettingsClient } from "./settings-client";

const TABS = ["general", "commerce", "sellers", "integrations", "notifications", "supplier"];

export default async function AdminSettingsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  return (
    <>
      <PageHeader title="Settings" subtitle="Store, commerce rules, sellers, integrations and notifications." />
      <AdminSettingsClient defaultTab={tab && TABS.includes(tab) ? tab : "general"} />
    </>
  );
}
