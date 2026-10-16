import { PageHeader } from "@/components/app-ui";
import { AdminSettingsClient } from "./settings-client";

export default function AdminSettingsPage() {
  return (
    <>
      <PageHeader title="Settings" subtitle="Store, commerce rules, integrations and notifications." />
      <AdminSettingsClient />
    </>
  );
}
