import { PageHeader } from "@/components/app-ui";
import { getCurrentUser } from "@/lib/auth/customer";
import { ProfileClient } from "./profile-client";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = (await getCurrentUser())!;
  return (
    <>
      <PageHeader title="Profile" subtitle="Your photo, name, Google and password." />
      <ProfileClient user={user} />
    </>
  );
}
