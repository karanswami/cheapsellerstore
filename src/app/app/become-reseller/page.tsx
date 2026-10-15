import { redirect } from "next/navigation";

/** Legacy path — Seller applications live at /app/become-seller. */
export default function BecomeResellerRedirectPage() {
  redirect("/app/become-seller");
}
