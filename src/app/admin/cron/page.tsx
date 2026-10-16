import { PageHeader } from "@/components/app-ui";
import { AdminCronClient } from "./cron-client";

export default function AdminCronPage() {
  return (
    <>
      <PageHeader title="Cron jobs" subtitle="Background jobs, run history and manual triggers." />
      <AdminCronClient />
    </>
  );
}
