import { redirect } from "next/navigation";

export default async function AdminProductKeysPage({
  params,
}: {
  params: Promise<{ id: string; durationId: string }>;
}) {
  const { durationId } = await params;
  redirect(`/admin/keys?durationId=${encodeURIComponent(durationId)}`);
}
