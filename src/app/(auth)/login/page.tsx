import Link from "next/link";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";
import { isGoogleAuthConfigured } from "@/lib/auth/google";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const googleEnabled = await isGoogleAuthConfigured().catch(() => false);
  const q = next ? `?next=${encodeURIComponent(next)}` : "";
  return (
    <AuthShell
      mode="login"
      next={next}
      title="Welcome back"
      subtitle="Sign in to your account."
      footer={
        <>
          New here?{" "}
          <Link href={`/register${q}`} className="font-semibold text-primary hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <AuthForm mode="login" next={next} googleEnabled={googleEnabled} />
    </AuthShell>
  );
}
