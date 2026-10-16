"use client";

import { useState } from "react";
import { Coins, Landmark, Wrench, Zap } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AdminSettings } from "../settings/settings-kit";
import { CurrenciesTab } from "./currencies-tab";
import { GatewaysTab } from "./gateways-tab";
import { ManualTab } from "./manual-tab";
import { Stat } from "./payments-ui";

export function PaymentsSection({ s }: { s: AdminSettings }) {
  const [gateways, setGateways] = useState(s.autoGateways);
  const [currencies, setCurrencies] = useState(s.depositCurrencies);
  const [mins, setMins] = useState(s.depositMins);
  const [quick, setQuick] = useState(s.depositQuickAmounts);
  const [manual, setManual] = useState(s.manualDepositMethods);

  const usage: Record<string, number> = {};
  for (const m of [...gateways, ...manual]) usage[m.currency] = (usage[m.currency] ?? 0) + 1;

  const live = gateways.filter((g) => g.enabled && !g.maintenance).length;
  const maint = gateways.filter((g) => g.enabled && g.maintenance).length;
  const manualLive = manual.filter((m) => m.enabled).length;

  // Shared (Settings / env) provider keys: used by any gateway that leaves a key blank.
  const shared: Record<string, string> = {
    binanceApiKey: s.binanceApiKey, binanceSecretKey: s.binanceSecretKey, binancePayId: s.binancePayId,
    autogopayApiKey: s.autogopayApiKey, autogopayBaseUrl: s.autogopayBaseUrl,
    famgatewayApiKey: s.famgatewayApiKey, famgatewayBaseUrl: s.famgatewayBaseUrl,
    cashfreeAppId: s.cashfreeAppId, cashfreeSecretKey: s.cashfreeSecretKey, cashfreeWebhookSecret: s.cashfreeWebhookSecret,
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={Coins} label="Currencies" value={currencies.length} />
        <Stat icon={Zap} label="Gateways live" value={`${live}/${gateways.length}`} tone="success" />
        <Stat icon={Wrench} label="In maintenance" value={maint} tone={maint ? "warning" : undefined} />
        <Stat icon={Landmark} label="Manual live" value={`${manualLive}/${manual.length}`} />
      </div>

      <Tabs defaultValue="gateways" className="gap-5">
        <TabsList className="h-auto w-full flex-wrap justify-start gap-1 sm:w-fit">
          <TabsTrigger value="gateways">Auto gateways</TabsTrigger>
          <TabsTrigger value="manual">Manual methods</TabsTrigger>
          <TabsTrigger value="currencies">Currencies</TabsTrigger>
        </TabsList>
        <TabsContent value="gateways">
          <GatewaysTab list={gateways} setList={setGateways} currencies={currencies} shared={shared} />
        </TabsContent>
        <TabsContent value="manual">
          <ManualTab list={manual} setList={setManual} codes={currencies.map((c) => c.code)} />
        </TabsContent>
        <TabsContent value="currencies">
          <CurrenciesTab list={currencies} setList={setCurrencies} mins={mins} setMins={setMins} quick={quick} setQuick={setQuick} usage={usage} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
