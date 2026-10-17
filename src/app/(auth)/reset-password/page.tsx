import { ResetPasswordForm } from "@/components/auth/recovery-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Reset password", robots: { index: false } };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; token?: string }>;
}) {
  const { email, token } = await searchParams;
  return <ResetPasswordForm email={email ?? ""} token={token ?? ""} />;
}
