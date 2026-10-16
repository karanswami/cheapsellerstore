import { PageHeader } from "@/components/app-ui";
import { AdminBroadcastClient } from "./broadcast-client";

export default function AdminBroadcastPage() {
  return (
    <>
      <PageHeader title="Broadcast" subtitle="Announcements, in-app notifications and web push." />
      <AdminBroadcastClient />
    </>
  );
}
