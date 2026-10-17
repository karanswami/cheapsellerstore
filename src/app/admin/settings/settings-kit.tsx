"use client";

import { useState } from "react";
import { toast } from "sonner";
import { SubmitButton, adminFetch, errMsg } from "@/components/admin/kit";
import type { SellerProgramConfig } from "@/types/seller-program";

export type AdminSettings = {
  maintenanceMode: boolean;
  supportContact: string;
  supportTelegram: string;
  supportWhatsapp: string;
  depositMins: { user: Record<string, number>; reseller: Record<string, number> };
  depositCurrencies: { code: string; name: string; symbol: string; rate: number; sortOrder: number }[];
  depositQuickAmounts: Record<string, number[]>;
  depositMethods: Record<string, { enabled: boolean; qrUrl: string; currency: string }>;
  autoGateways: AdminGateway[];
  manualDepositMethods: ManualMethod[];
  feedbackSounds: { hapticsEnabled: boolean; soundsEnabled: boolean; sounds: Record<string, string> };
  telegramNotifications: { enabled: boolean; botToken: string; channels: Record<string, { enabled: boolean; chatId: string; inviteLink: string; label: string }> };
  referralCommissionEnabled: boolean;
  referralPercent: number;
  sellerPurchasePercent: number;
  resellerPurchasePercent: number;
  resellerProgramEnabled: boolean;
  resellerApplyMinBalance: number;
  resellerCreateMinFunding: number;
  resellerAutoApprove: boolean;
  sellerProgram: SellerProgramConfig;
  developerProfitSharePercent: number;
  specialStockDeveloperSharePercent: number;
  defaultProductDemoUrl: string;
  googleClientId: string;
  googleClientSecret: string;
  resendApiKey: string;
  resendFromEmail: string;
  googleAuthEnabled: boolean;
  resendEnabled: boolean;
  binanceApiKey: string;
  binanceSecretKey: string;
  binancePayId: string;
  autogopayApiKey: string;
  autogopayBaseUrl: string;
  famgatewayApiKey: string;
  famgatewayBaseUrl: string;
  cashfreeAppId: string;
  cashfreeSecretKey: string;
  cashfreeWebhookSecret: string;
  cashfreeEnv: "sandbox" | "production";
};

export type AdminGateway = {
  id: string;
  provider: "QRIS" | "UPI" | "BINANCE" | "ESEWA" | "NASIONALPAY";
  name: string;
  currency: string;
  enabled: boolean;
  maintenance: boolean;
  maintenanceNote: string;
  qrUrl: string;
  creds: Record<string, string>;
};

export type ManualMethod = {
  id?: string;
  name: string;
  currency: string;
  currencyName?: string;
  currencySymbol?: string;
  accountNumber?: string;
  qrUrl?: string;
  iconUrl?: string;
  iconKey?: string;
  instructions?: string;
  enabled: boolean;
  sortOrder: number;
};

/** Returns a `save(partial)` that PATCHes /api/admin/settings and toasts the outcome. */
export function useSettingsSave() {
  const [busy, setBusy] = useState(false);
  async function save(partial: Record<string, unknown>, okMsg = "Settings saved.") {
    setBusy(true);
    try {
      await adminFetch("/api/admin/settings", { method: "PATCH", json: partial });
      toast.success(okMsg);
      return true;
    } catch (e) {
      toast.error(errMsg(e));
      return false;
    } finally {
      setBusy(false);
    }
  }
  return { save, busy };
}

export function SettingsCard({
  title,
  description,
  busy,
  onSave,
  children,
}: {
  title: string;
  description?: string;
  busy?: boolean;
  onSave?: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border bg-card p-4 sm:p-5">
      <div className="mb-4">
        <h3 className="font-display text-lg font-semibold">{title}</h3>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      <div className="grid gap-4">{children}</div>
      {onSave ? (
        <div className="mt-5">
          <SubmitButton busy={busy} onClick={onSave}>
            Save changes
          </SubmitButton>
        </div>
      ) : null}
    </section>
  );
}
