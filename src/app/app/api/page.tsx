import { getCurrentUser } from "@/lib/auth/customer";
import { redirect } from "next/navigation";

/** Legacy Platform API hub → API Keys. */
export default async function PlatformApiRedirectPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/?auth=login&next=/app/development");
  if (user.role !== "SELLER" && user.role !== "RESELLER" && user.role !== "ADMIN") {
    redirect("/app");
  }
  redirect("/app/development");
}
