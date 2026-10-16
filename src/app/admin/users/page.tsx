import { PageHeader } from "@/components/app-ui";
import { AdminUsersClient } from "./users-client";

export default function AdminUsersPage() {
  return (
    <>
      <PageHeader title="Users" subtitle="Accounts, roles, wallets and bans." />
      <AdminUsersClient />
    </>
  );
}
