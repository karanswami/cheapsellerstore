import { PageHeader } from "@/components/app-ui";
import { AdminLogsClient } from "./logs-client";

export default function AdminLogsPage() {
  return (
    <>
      <PageHeader title="Logs" subtitle="Activity audit trail and store events." />
      <AdminLogsClient />
    </>
  );
}
