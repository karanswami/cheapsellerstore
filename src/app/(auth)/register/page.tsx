import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";
import { isGoogleAuthConfigured } from "@/lib/auth/google";

export const dynamic = "force-dynamic";
export const metadata = { title: "Create account" };

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; ref?: string; referral?: string; google_error?: string }>;
}) {
  const { next, ref, referral, google_error } = await searchParams;
  const referralCode = (ref || referral || "").trim().slice(0, 64);
  const googleEnabled = await isGoogleAuthConfigured().catch(() => false);
  return (
    <AuthShell mode="register" next={next} googleError={google_error} referralCode={referralCode || undefined}>
      <AuthForm mode="register" next={next} referralCode={referralCode} googleEnabled={googleEnabled} />
    </AuthShell>
  );
}
