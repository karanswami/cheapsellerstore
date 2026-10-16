import { PageHeader } from "@/components/app-ui";
import { PlatformApiTab } from "./platform-api";

export default function AdminDeveloperApiPage() {
  return (
    <>
      <PageHeader title="Developer API" subtitle="Access, limits, developers, keys and request logs." />
      <PlatformApiTab />
    </>
  );
}
