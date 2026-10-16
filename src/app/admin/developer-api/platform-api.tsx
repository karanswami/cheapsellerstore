"use client";

import { Activity, KeyRound, Settings2, ShieldAlert, Users, Zap } from "lucide-react";
import { StatCard, useAdminQuery } from "@/components/admin/kit";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DevelopersTab } from "./developers-tab";
import { KeysTab } from "./keys-tab";
import { SettingsTab } from "./settings-tab";
import { UsageTab } from "./usage-tab";

type Kpis = { requests24h: number; rateLimited24h: number; errors24h: number; activeKeys: number };

export function PlatformApiTab() {
  const { data } = useAdminQuery<{ kpis: Kpis }>("/api/admin/seller-api/usage?limit=1");
  const k = data?.kpis;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={KeyRound} label="Active keys" value={k ? k.activeKeys : "—"} />
        <StatCard icon={Zap} label="Requests 24h" value={k ? k.requests24h : "—"} />
        <StatCard icon={ShieldAlert} label="Errors 24h" value={k ? k.errors24h : "—"} tone={k?.errors24h ? "destructive" : "default"} />
        <StatCard icon={Activity} label="Rate limited 24h" value={k ? k.rateLimited24h : "—"} tone={k?.rateLimited24h ? "warning" : "default"} />
      </div>

      <Tabs defaultValue="settings">
        <TabsList className="w-fit max-w-full">
          <TabsTrigger value="settings">
            <Settings2 /> Settings
          </TabsTrigger>
          <TabsTrigger value="developers">
            <Users /> Developers
          </TabsTrigger>
          <TabsTrigger value="keys">
            <KeyRound /> API keys
          </TabsTrigger>
          <TabsTrigger value="usage">
            <Activity /> Usage
          </TabsTrigger>
        </TabsList>
        <TabsContent value="settings">
          <SettingsTab />
        </TabsContent>
        <TabsContent value="developers">
          <DevelopersTab />
        </TabsContent>
        <TabsContent value="keys">
          <KeysTab />
        </TabsContent>
        <TabsContent value="usage">
          <UsageTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
