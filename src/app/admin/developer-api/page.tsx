import { PageHeader } from "@/components/app-ui";
import { PlatformApiTab } from "./platform-api";

export default function AdminDeveloperApiPage() {
  return (
    <>
      <PageHeader title="Developer API" subtitle="Traffic, developers, keys, request logs and limits for the Platform API." />
      <PlatformApiTab />
    </>
  );
}
