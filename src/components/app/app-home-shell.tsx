import { HubPageShell } from "@/components/app/hub/hub-page-shell";

export function AppHomeShell({ children }: { children: React.ReactNode }) {
  return (
    <HubPageShell
      maxWidth="2xl"
      className="pb-2"
      contentClassName="space-y-5"
    >
      {children}
    </HubPageShell>
  );
}
