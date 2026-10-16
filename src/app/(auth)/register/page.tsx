import Link from "next/link";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";
import { isGoogleAuthConfigured } from "@/lib/auth/google";

export const dynamic = "force-dynamic";
export const metadata = { title: "Create account" };

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; ref?: string; referral?: string }>;
}) {
  const { next, ref, referral } = await searchParams;
  const referralCode = (ref || referral || "").trim().slice(0, 64);
  const googleEnabled = await isGoogleAuthConfigured().catch(() => false);
  const q = next ? `?next=${encodeURIComponent(next)}` : "";
  return (
    <AuthShell
      mode="register"
      next={next}
      title="Create your account"
      subtitle="Join in seconds and start buying."
      footer={
        <>
          Already have an account?{" "}
          <Link href={`/login${q}`} className="font-semibold text-primary hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <AuthForm mode="register" next={next} referralCode={referralCode} googleEnabled={googleEnabled} />
    </AuthShell>
  );
}
