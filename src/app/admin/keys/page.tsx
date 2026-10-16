import { PageHeader } from "@/components/app-ui";
import { AdminKeysClient } from "./keys-client";

export default function AdminKeysPage() {
  return (
    <>
      <PageHeader title="Keys" subtitle="Stock per duration, bulk import and key lookup." />
      <AdminKeysClient />
    </>
  );
}
