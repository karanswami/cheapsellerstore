import { redirect } from "next/navigation";

/** Legacy path — Seller applications desk lives at /admin/sellers. */
export default function ResellersRedirectPage() {
  redirect("/admin/sellers");
}
