import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Maintenance",
  robots: { index: false, follow: false },
};

/** Legacy URL — enter clears non-admin sessions then shows landing + pinned banner. */
export default function MaintenancePage() {
  redirect("/api/maintenance/enter");
}
