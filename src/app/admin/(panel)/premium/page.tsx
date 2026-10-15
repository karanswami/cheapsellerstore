import { redirect } from "next/navigation";

/** Premium grant/revoke lives on Accounts Desk (`/admin/users`). */
export default function PremiumRedirectPage() {
  redirect("/admin/users");
}
