import Link from "next/link";
import { Settings } from "lucide-react";
import { PageHeader } from "@/components/app-ui";
import { Button } from "@/components/ui/button";
import { SpinAdmin } from "./spin-client";

export default function AdminSpinPage() {
  return (
    <>
      <PageHeader
        title="Reward spin"
        subtitle="Build the wheel referrers spin after a friend's first deposit — 1 to 8 slots."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/settings?tab=commerce">
              <Settings /> Reward settings
            </Link>
          </Button>
        }
      />
      <SpinAdmin />
    </>
  );
}
