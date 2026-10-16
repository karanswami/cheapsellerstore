"use client";

import { Bell, Building2, Percent, Plug, Truck } from "lucide-react";
import { TableSkeleton, useAdminQuery } from "@/components/admin/kit";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BrandingSection, GeneralSection } from "./section-general";
import { IconsSection } from "./section-icons";
import { CommerceSection } from "./section-commerce";
import { IntegrationsSection, NotificationsSection } from "./section-integrations";
import { SupplierSection } from "./section-supplier";
import type { AdminSettings } from "./settings-kit";

export function AdminSettingsClient({ defaultTab = "general" }: { defaultTab?: string }) {
  const { data, error } = useAdminQuery<AdminSettings>("/api/admin/settings");

  return (
    <Tabs defaultValue={defaultTab} className="space-y-4">
      <TabsList>
        <TabsTrigger value="general">
          <Building2 className="size-4" /> Store
        </TabsTrigger>
        <TabsTrigger value="commerce">
          <Percent className="size-4" /> Commerce
        </TabsTrigger>
        <TabsTrigger value="integrations">
          <Plug className="size-4" /> Integrations
        </TabsTrigger>
        <TabsTrigger value="notifications">
          <Bell className="size-4" /> Notifications
        </TabsTrigger>
        <TabsTrigger value="supplier">
          <Truck className="size-4" /> Supplier
        </TabsTrigger>
      </TabsList>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {!data ? (
        <TableSkeleton rows={6} />
      ) : (
        <>
          <TabsContent value="general" className="space-y-6">
            <GeneralSection s={data} />
            <BrandingSection />
            <IconsSection />
          </TabsContent>
          <TabsContent value="commerce" className="space-y-6">
            <CommerceSection s={data} />
          </TabsContent>
          <TabsContent value="integrations" className="space-y-6">
            <IntegrationsSection s={data} />
          </TabsContent>
          <TabsContent value="notifications" className="space-y-6">
            <NotificationsSection s={data} />
          </TabsContent>
          <TabsContent value="supplier" className="space-y-6">
            <SupplierSection />
          </TabsContent>
        </>
      )}
    </Tabs>
  );
}

