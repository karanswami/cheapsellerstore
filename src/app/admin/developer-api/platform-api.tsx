"use client";

import { useState } from "react";
import { Activity, Code2, KeyRound, LayoutDashboard, Pause, Settings2, ShieldCheck, Users, FlaskConical } from "lucide-react";
import { useAdminQuery } from "@/components/admin/kit";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { DevelopersTab } from "./developers-tab";
import { KeysTab } from "./keys-tab";
import { OverviewTab, type Overview } from "./overview-tab";
import { SettingsTab, type ApiSettings } from "./settings-tab";
import { UsageTab } from "./usage-tab";

export function PlatformApiTab() {
  const [tab, setTab] = useState("overview");
  const overview = useAdminQuery<Overview>("/api/admin/seller-api/overview");
  const settings = useAdminQuery<ApiSettings>("/api/admin/seller-api/settings");
  const k = overview.data?.kpis;
  const s = settings.data;
  const live = s ? s.platformEnabled : true;
  const roles = s ? (Object.entries(s.allowedRoles) as [string, boolean][]).filter(([, on]) => on).map(([r]) => r) : [];

  return (
    <div className="space-y-6">
      <section
        className={cn(
          "relative overflow-hidden rounded-2xl border p-5 sm:p-6",
          live ? "bg-gradient-to-br from-primary/10 via-card to-card" : "bg-gradient-to-br from-destructive/10 via-card to-card",
        )}
      >
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <span className={cn("grid size-12 shrink-0 place-items-center rounded-2xl", live ? "bg-primary/15 text-primary" : "bg-destructive/15 text-destructive")}>
              {live ? <Code2 className="size-6" /> : <Pause className="size-6" />}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-xl font-bold tracking-tight">Platform API</h2>
                <Badge variant={live ? "success" : "destructive"} shape="pill">
                  <span className={cn("size-1.5 rounded-full bg-current", live && "animate-pulse")} /> {live ? "Live" : "Paused"}
                </Badge>
                {s?.sandboxEnabled ? (
                  <Badge variant="warning" shape="pill">
                    <FlaskConical /> Sandbox on
                  </Badge>
                ) : null}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {live ? "Developers can call every /api/v1 endpoint with their keys." : "Every /api/v1 request is rejected until you resume the platform."}
              </p>
              {roles.length ? (
                <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                  <ShieldCheck className="size-3.5" /> Keys allowed for
                  {roles.map((r) => (
                    <Badge key={r} variant="outline" className="capitalize">{r}</Badge>
                  ))}
                </p>
              ) : null}
            </div>
          </div>
          <dl className="grid grid-cols-3 gap-2 sm:gap-3 lg:min-w-96">
            {[
              { l: "Requests 24h", v: k ? k.requests24h.toLocaleString("en-US") : "—" },
              { l: "Active keys", v: k ? k.activeKeys : "—" },
              { l: "Success", v: k ? `${k.successRate}%` : "—" },
            ].map((x) => (
              <div key={x.l} className="rounded-xl border bg-background/60 px-3 py-2.5 text-center backdrop-blur">
                <dd className="font-display text-lg font-bold tabular-nums sm:text-xl">{x.v}</dd>
                <dt className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{x.l}</dt>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList className="w-fit max-w-full">
          <TabsTrigger value="overview"><LayoutDashboard /> Overview</TabsTrigger>
          <TabsTrigger value="developers"><Users /> Developers</TabsTrigger>
          <TabsTrigger value="keys"><KeyRound /> API keys</TabsTrigger>
          <TabsTrigger value="usage"><Activity /> Requests</TabsTrigger>
          <TabsTrigger value="settings"><Settings2 /> Settings</TabsTrigger>
        </TabsList>
        <TabsContent value="overview"><OverviewTab data={overview.data} onGoto={setTab} /></TabsContent>
        <TabsContent value="developers"><DevelopersTab /></TabsContent>
        <TabsContent value="keys"><KeysTab /></TabsContent>
        <TabsContent value="usage"><UsageTab /></TabsContent>
        <TabsContent value="settings">
          <SettingsTab
            data={settings.data}
            onSaved={(next) => {
              settings.setData(next);
              overview.reload();
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
