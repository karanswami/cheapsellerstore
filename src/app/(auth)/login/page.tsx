import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";
import { isGoogleAuthConfigured } from "@/lib/auth/google";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; google_error?: string }>;
}) {
  const { next, google_error } = await searchParams;
  const googleEnabled = await isGoogleAuthConfigured().catch(() => false);
  return (
    <AuthShell mode="login" next={next} googleError={google_error}>
      <AuthForm mode="login" next={next} googleEnabled={googleEnabled} />
    </AuthShell>
  );
}
