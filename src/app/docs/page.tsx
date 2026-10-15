import { redirect } from "next/navigation";

/** Short alias → public developer docs. */
export default function DocsRedirectPage() {
  redirect("/developers");
}
