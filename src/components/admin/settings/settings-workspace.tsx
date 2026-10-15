"use client";

import { AdminListSkeleton, AdminPageHeader } from "@/components/admin/admin-page-header";
import {
  DepositCurrenciesSettings,
  formatCurrenciesSummary,
  formatQuickAmountsSummary,
} from "@/components/admin/settings/deposit-currencies-settings";
import {
  FeedbackSoundsSettingsDialog,
  feedbackSoundsRowSummary,
} from "@/components/admin/settings/feedback-sounds-settings";
import {
  TelegramNotifySettingsDialog,
  telegramNotifyRowSummary,
  defaultTelegramNotifyConfig,
} from "@/components/admin/settings/telegram-notify-settings";
import { WebPushSettingsDialog } from "@/components/admin/settings/web-push-settings";
import {
  ManualDepositMethodsSettings,
  useManualMethodsSummary,
} from "@/components/admin/settings/manual-deposit-methods-settings";
import {
  SupportBotSettingsDialog,
  useSupportBotSummary,
} from "@/components/admin/settings/support-bot-settings";
import type { ManualDepositMethod } from "@/types/manual-deposit";
import { adminMutate, useAdminFetch } from "@/components/admin/use-admin-fetch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  DEFAULT_DEPOSIT_CURRENCIES,
  type DepositCurrencyDef,
} from "@/types/deposit-currency";
import {
  defaultFeedbackSoundConfig,
  type FeedbackSoundConfig,
} from "@/types/feedback-sounds";
import type { TelegramNotifyConfig } from "@/types/telegram-notify";
import {
  DEFAULT_PAGES_ENABLED,
  type PagesEnabledConfig,
} from "@/lib/pages-enabled-shared";
import {
  BellRing,
  Bot,
  Check,
  Code2,
  Coins,
  ChevronRight,
  Copy,
  Handshake,
  Headphones,
  CreditCard,
  ImagePlus,
  KeyRound,
  KeySquare,
  LayoutGrid,
  MessageSquare,
  Percent,
  PieChart,
  Send,
  Settings2,
  Vibrate,
  Wallet,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

type CurrencyMins = Record<string, number>;

type DepositMins = {
  user: CurrencyMins;
  reseller: CurrencyMins;
};

type DepositMethodId = "QRIS" | "BINANCE" | "UPI" | "ESEWA" | "MGCLOUDPAY";

type DepositMethodEntry = {
  enabled: boolean;
  qrUrl: string;
};

type DepositMethods = Record<DepositMethodId, DepositMethodEntry>;

type CurrencyRates = Record<string, number>;

type QuickAmounts = Record<string, number[]>;

type Settings = {
  maintenanceMode: boolean;
  supportContact: string;
  supportTelegram: string;
  supportWhatsapp: string;
  depositMins: DepositMins;
  depositCurrencies: DepositCurrencyDef[];
  depositFxRates: CurrencyRates;
  depositQuickAmounts: QuickAmounts;
  depositMethods: DepositMethods;
  manualDepositMethods: ManualDepositMethod[];
  referralPercent: number;
  sellerPurchasePercent: number;
  resellerPurchasePercent: number;
  resellerProgramEnabled: boolean;
  resellerApplyMinBalance: number;
  resellerCreateMinFunding: number;
  resellerAutoApprove: boolean;
  developerProfitSharePercent: number;
  specialStockDeveloperSharePercent: number;
  supplierBuyPricePercent: number;
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
  autogopayConfigured: boolean;
  ramashopApiKey?: string;
  ramashopBaseUrl?: string;
  mgcloudpayApiKey?: string;
  mgcloudpayBaseUrl?: string;
  famgatewayApiKey: string;
  famgatewayBaseUrl: string;
  cashfreeAppId: string;
  cashfreeSecretKey: string;
  cashfreeWebhookSecret: string;
  cashfreeEnv: "sandbox" | "production";
  binanceConfigured: boolean;
  ramashopConfigured?: boolean;
  mgcloudpayConfigured?: boolean;
  famgatewayConfigured: boolean;
  cashfreeConfigured: boolean;
  apiSandboxEnabled: boolean;
  feedbackSounds: FeedbackSoundConfig;
  telegramNotifications: TelegramNotifyConfig;
  pagesEnabled: PagesEnabledConfig;
};

type EditSection =
  | "general"
  | "supportChannels"
  | "pagesEnabled"
  | "depositMins"
  | "depositMethods"
  | "referral"
  | "shares"
  | "reseller"
  | "auth"
  | "paymentKeys"
  | "apiSandbox"
  | null;

const METHOD_ROWS: {
  id: DepositMethodId;
  label: string;
  hint: string;
  hasManualQr: boolean;
  defaultQr: string;
}[] = [
  {
    id: "QRIS",
    label: "QRIS",
    hint: "Indonesia · AutoGoPay auto",
    hasManualQr: false,
    defaultQr: "",
  },
  {
    id: "BINANCE",
    label: "Binance Pay",
    hint: "USD · memo match · upload QR",
    hasManualQr: true,
    defaultQr: "/binance-pay-qr.png",
  },
  {
    id: "UPI",
    label: "INR (FamGateway UPI)",
    hint: "India · dynamic UPI QR & deep intent auto",
    hasManualQr: false,
    defaultQr: "",
  },
];

/** Legacy ESEWA rail — kept disabled; QR may still migrate into manual methods. */
function legacyEsewaEntry(from?: DepositMethods["ESEWA"]): DepositMethods["ESEWA"] {
  return {
    enabled: false,
    qrUrl: from?.qrUrl?.trim() ?? "",
  };
}

const EMPTY_METHODS: DepositMethods = {
  QRIS: { enabled: true, qrUrl: "" },
  BINANCE: { enabled: true, qrUrl: "" },
  UPI: { enabled: true, qrUrl: "" },
  ESEWA: { enabled: true, qrUrl: "" },
  MGCLOUDPAY: { enabled: false, qrUrl: "" },
};

const EMPTY_MINS: CurrencyMins = { USD: 1, INR: 92, IDR: 17000, NPR: 134 };
const EMPTY_RATES: CurrencyRates = { USD: 1, INR: 92, IDR: 17000, NPR: 134 };
const EMPTY_QUICK_AMOUNTS: QuickAmounts = {
  USD: [1, 5, 10, 25],
  INR: [100, 250, 500, 1000],
  IDR: [17000, 50000, 100000, 250000],
  NPR: [140, 500, 1000, 2000],
};

function formatMinSummary(mins?: CurrencyMins) {
  if (!mins) return "—";
  const parts = Object.entries(mins)
    .slice(0, 4)
    .map(([code, amount]) => `${amount} ${code}`);
  return parts.join(" · ") || "—";
}

function CurrencyMinsFields({
  idPrefix,
  value,
  onChange,
  currencies,
}: {
  idPrefix: string;
  value?: CurrencyMins;
  onChange: (next: CurrencyMins) => void;
  currencies: DepositCurrencyDef[];
}) {
  const current = value ?? {};
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {currencies.map((c) => (
        <div key={c.code} className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-${c.code}`}>
            {c.symbol} {c.code}
          </Label>
          <Input
            id={`${idPrefix}-${c.code}`}
            type="number"
            min={0}
            step={c.code === "USD" ? "0.01" : c.code === "IDR" ? "1000" : "1"}
            value={current[c.code] ?? 0}
            onChange={(e) =>
              onChange({
                ...current,
                [c.code]: Number(e.target.value) || 0,
              })
            }
            className="h-11 tabular-nums"
          />
        </div>
      ))}
    </div>
  );
}

export function SettingsWorkspace() {
  const { data, loading, reload } = useAdminFetch<Settings>("/api/admin/settings");
  const { summary: botSummary, loading: botSummaryLoading } =
    useSupportBotSummary();
  const [edit, setEdit] = useState<EditSection>(null);
  const [supportBotOpen, setSupportBotOpen] = useState(false);
  const [manualMethodsOpen, setManualMethodsOpen] = useState(false);
  const [currenciesOpen, setCurrenciesOpen] = useState(false);
  const [feedbackSoundsOpen, setFeedbackSoundsOpen] = useState(false);
  const [telegramNotifyOpen, setTelegramNotifyOpen] = useState(false);
  const [webPushOpen, setWebPushOpen] = useState(false);
  const [pending, setPending] = useState(false);

  const [generalDraft, setGeneralDraft] = useState({
    maintenanceMode: false,
    supportContact: "",
  });
  const [supportChannelsDraft, setSupportChannelsDraft] = useState({
    supportTelegram: "",
    supportWhatsapp: "",
    supportContact: "",
  });
  const [pagesDraft, setPagesDraft] = useState<PagesEnabledConfig>({
    ...DEFAULT_PAGES_ENABLED,
  });
  const [depositDraft, setDepositDraft] = useState<DepositMins>({
    user: { ...EMPTY_MINS },
    reseller: { ...EMPTY_MINS },
  });
  const [methodsDraft, setMethodsDraft] =
    useState<DepositMethods>(EMPTY_METHODS);
  const [uploadingQr, setUploadingQr] = useState<DepositMethodId | null>(null);
  const [referralDraft, setReferralDraft] = useState({
    referralPercent: 5,
    sellerPurchasePercent: 5,
    resellerPurchasePercent: 5,
  });
  const [sharesDraft, setSharesDraft] = useState({
    developerProfitSharePercent: 10,
    specialStockDeveloperSharePercent: 50,
    supplierBuyPricePercent: 50,
  });
  const [resellerDraft, setResellerDraft] = useState({
    resellerProgramEnabled: true,
    resellerApplyMinBalance: 5,
    resellerCreateMinFunding: 5,
    resellerAutoApprove: false,
  });
  const [authDraft, setAuthDraft] = useState({
    googleClientId: "",
    googleClientSecret: "",
    resendApiKey: "",
    resendFromEmail: "Cheap Seller <onboarding@resend.dev>",
  });
  const [copiedAutogopayWebhook, setCopiedAutogopayWebhook] = useState(false);
  const appUrl = typeof window !== "undefined" ? window.location.origin : "";
  const autogopayWebhookUrl = `${appUrl}/api/webhooks/autogopay`;

  const [paymentKeysDraft, setPaymentKeysDraft] = useState({
    binanceApiKey: "",
    binanceSecretKey: "",
    binancePayId: "",
    autogopayApiKey: "",
    autogopayBaseUrl: "https://v1-gateway.autogopay.site",
    famgatewayApiKey: "",
    famgatewayBaseUrl: "https://famgateway.in",
    cashfreeAppId: "",
    cashfreeSecretKey: "",
    cashfreeWebhookSecret: "",
    cashfreeEnv: "sandbox" as "sandbox" | "production",
  });
  const [apiSandboxDraft, setApiSandboxDraft] = useState({
    apiSandboxEnabled: true,
  });

  const settings: Settings | null = data
    ? {
        ...data,
        depositCurrencies:
          data.depositCurrencies?.length > 0
            ? data.depositCurrencies
            : DEFAULT_DEPOSIT_CURRENCIES,
        depositMins: {
          user: data.depositMins?.user ?? { ...EMPTY_MINS },
          reseller: data.depositMins?.reseller ?? { ...EMPTY_MINS },
        },
        depositFxRates: data.depositFxRates ?? EMPTY_RATES,
        depositQuickAmounts: data.depositQuickAmounts ?? EMPTY_QUICK_AMOUNTS,
        depositMethods: {
          QRIS: data.depositMethods?.QRIS ?? { enabled: true, qrUrl: "" },
          BINANCE: data.depositMethods?.BINANCE ?? { enabled: true, qrUrl: "" },
          UPI: data.depositMethods?.UPI ?? { enabled: true, qrUrl: "" },
          ESEWA: data.depositMethods?.ESEWA ?? { enabled: false, qrUrl: "" },
          MGCLOUDPAY: data.depositMethods?.MGCLOUDPAY ?? { enabled: false, qrUrl: "" },
        },
        manualDepositMethods: data.manualDepositMethods ?? [],
        feedbackSounds: data.feedbackSounds ?? defaultFeedbackSoundConfig(),
        telegramNotifications:
          data.telegramNotifications ?? defaultTelegramNotifyConfig(),
        pagesEnabled: data.pagesEnabled ?? { ...DEFAULT_PAGES_ENABLED },
        developerProfitSharePercent: data.developerProfitSharePercent ?? 10,
        specialStockDeveloperSharePercent: data.specialStockDeveloperSharePercent ?? 50,
        supplierBuyPricePercent: data.supplierBuyPricePercent ?? 50,
      }
    : null;

  function openGeneral() {
    if (!settings) return;
    setGeneralDraft({
      maintenanceMode: Boolean(settings.maintenanceMode),
      supportContact: settings.supportContact ?? "",
    });
    setEdit("general");
  }

  function openSupportChannels() {
    if (!settings) return;
    setSupportChannelsDraft({
      supportTelegram: settings.supportTelegram ?? "",
      supportWhatsapp: settings.supportWhatsapp ?? "",
      supportContact: settings.supportContact ?? "",
    });
    setEdit("supportChannels");
  }

  function openPagesEnabled() {
    if (!settings) return;
    setPagesDraft({ ...DEFAULT_PAGES_ENABLED, ...(settings.pagesEnabled ?? {}) });
    setEdit("pagesEnabled");
  }

  function openDepositMins() {
    if (!settings) return;
    setDepositDraft({
      user: { ...EMPTY_MINS, ...(settings.depositMins?.user ?? {}) },
      reseller: { ...EMPTY_MINS, ...(settings.depositMins?.reseller ?? {}) },
    });
    setEdit("depositMins");
  }

  function openDepositMethods() {
    if (!settings) return;
    setMethodsDraft({
      QRIS: { enabled: settings.depositMethods?.QRIS?.enabled ?? true, qrUrl: settings.depositMethods?.QRIS?.qrUrl ?? "" },
      BINANCE: { enabled: settings.depositMethods?.BINANCE?.enabled ?? true, qrUrl: settings.depositMethods?.BINANCE?.qrUrl ?? "" },
      UPI: { enabled: settings.depositMethods?.UPI?.enabled ?? true, qrUrl: settings.depositMethods?.UPI?.qrUrl ?? "" },
      ESEWA: legacyEsewaEntry(settings.depositMethods?.ESEWA),
      MGCLOUDPAY: { enabled: settings.depositMethods?.MGCLOUDPAY?.enabled ?? false, qrUrl: settings.depositMethods?.MGCLOUDPAY?.qrUrl ?? "" },
    });
    setEdit("depositMethods");
  }

  function depositMethodsPayload(draft: DepositMethods): DepositMethods {
    return {
      QRIS: draft.QRIS ?? { enabled: true, qrUrl: "" },
      BINANCE: draft.BINANCE ?? { enabled: true, qrUrl: "" },
      UPI: draft.UPI ?? { enabled: true, qrUrl: "" },
      ESEWA: legacyEsewaEntry(draft.ESEWA),
      MGCLOUDPAY: draft.MGCLOUDPAY ?? { enabled: false, qrUrl: "" },
    };
  }

  function openReferral() {
    if (!settings) return;
    setReferralDraft({
      referralPercent: settings.referralPercent,
      sellerPurchasePercent: settings.sellerPurchasePercent,
      resellerPurchasePercent: settings.resellerPurchasePercent,
    });
    setEdit("referral");
  }

  function openShares() {
    if (!settings) return;
    setSharesDraft({
      developerProfitSharePercent: settings.developerProfitSharePercent,
      specialStockDeveloperSharePercent: settings.specialStockDeveloperSharePercent,
      supplierBuyPricePercent: settings.supplierBuyPricePercent,
    });
    setEdit("shares");
  }

  function openReseller() {
    if (!settings) return;
    setResellerDraft({
      resellerProgramEnabled: settings.resellerProgramEnabled,
      resellerApplyMinBalance: settings.resellerApplyMinBalance,
      resellerCreateMinFunding: settings.resellerCreateMinFunding,
      resellerAutoApprove: settings.resellerAutoApprove,
    });
    setEdit("reseller");
  }

  function openAuth() {
    if (!settings) return;
    setAuthDraft({
      googleClientId: settings.googleClientId,
      googleClientSecret: settings.googleClientSecret,
      resendApiKey: settings.resendApiKey,
      resendFromEmail: settings.resendFromEmail,
    });
    setEdit("auth");
  }

  function openPaymentKeys() {
    if (!settings) return;
    setPaymentKeysDraft({
      binanceApiKey: settings.binanceApiKey ?? "",
      binanceSecretKey: settings.binanceSecretKey ?? "",
      binancePayId: settings.binancePayId ?? "",
      autogopayApiKey: settings.autogopayApiKey ?? "",
      autogopayBaseUrl: settings.autogopayBaseUrl || "https://v1-gateway.autogopay.site",
      famgatewayApiKey: settings.famgatewayApiKey ?? "",
      famgatewayBaseUrl: settings.famgatewayBaseUrl ?? "https://famgateway.in",
      cashfreeAppId: settings.cashfreeAppId ?? "",
      cashfreeSecretKey: settings.cashfreeSecretKey ?? "",
      cashfreeWebhookSecret: settings.cashfreeWebhookSecret ?? "",
      cashfreeEnv: settings.cashfreeEnv ?? "sandbox",
    });
    setEdit("paymentKeys");
  }

  function openApiSandbox() {
    if (!settings) return;
    setApiSandboxDraft({
      apiSandboxEnabled: settings.apiSandboxEnabled ?? true,
    });
    setEdit("apiSandbox");
  }

  async function uploadMethodQr(method: DepositMethodId, file: File) {
    setUploadingQr(method);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/admin/settings/deposit-qr", {
        method: "POST",
        credentials: "include",
        body,
      });
      const json = (await res.json()) as {
        error?: { message?: string };
        data?: { upload?: { url?: string } };
      };
      if (!res.ok || !json.data?.upload?.url) {
        toast.error(json.error?.message ?? "Upload failed");
        return;
      }
      setMethodsDraft((prev) => ({
        ...prev,
        [method]: { ...prev[method], qrUrl: json.data!.upload!.url! },
      }));
      toast.success("QR uploaded");
    } finally {
      setUploadingQr(null);
    }
  }

  function methodsSummary(methods?: DepositMethods) {
    if (!methods) return `0 of ${METHOD_ROWS.length} on`;
    const on = METHOD_ROWS.filter((m) => Boolean(methods[m.id]?.enabled)).length;
    return `${on} of ${METHOD_ROWS.length} on`;
  }

  async function save(partial: Partial<Settings>) {
    setPending(true);
    const result = await adminMutate("/api/admin/settings", {
      method: "PATCH",
      body: JSON.stringify(partial),
    });
    setPending(false);
    if (!result.ok) {
      toast.error(result.message);
      return false;
    }
    toast.success("Settings saved");
    void reload();
    return true;
  }

  const manualMethodsSummary = useManualMethodsSummary(
    settings?.manualDepositMethods,
  );
  const feedbackSummary = settings
    ? feedbackSoundsRowSummary(settings.feedbackSounds)
    : null;
  const telegramSummary = settings
    ? telegramNotifyRowSummary(settings.telegramNotifications)
    : null;

  return (
    <main className="space-y-6">
      <AdminPageHeader
        title="Settings"
        description="Payments, referral rates, and seller program"
      />
      {loading || !settings ? (
        <AdminListSkeleton rows={4} />
      ) : (
        <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
          <SettingsRow
            icon={<Settings2 className="size-4" />}
            title="General"
            description="Maintenance mode & system status"
            badges={
              <Badge
                variant={settings.maintenanceMode ? "destructive" : "outline"}
                className={cn(
                  !settings.maintenanceMode &&
                    "border-success/30 bg-success/10 text-success",
                )}
              >
                {settings.maintenanceMode ? "Maintenance" : "Live"}
              </Badge>
            }
            onClick={openGeneral}
          />
          <SettingsRow
            icon={<Headphones className="size-4" />}
            title="Support & Direct Contact Channels"
            description={
              settings.supportTelegram || settings.supportWhatsapp
                ? [
                    settings.supportTelegram && `Telegram: ${settings.supportTelegram}`,
                    settings.supportWhatsapp && `WhatsApp: ${settings.supportWhatsapp}`,
                  ]
                    .filter(Boolean)
                    .join(" · ")
                : "Set owner Telegram (@username) & WhatsApp (+number)"
            }
            badges={
              settings.supportTelegram && settings.supportWhatsapp ? (
                <Badge
                  variant="outline"
                  className="border-success/30 bg-success/10 text-success"
                >
                  Telegram & WhatsApp Active
                </Badge>
              ) : settings.supportTelegram ? (
                <Badge
                  variant="outline"
                  className="border-sky-500/30 bg-sky-500/10 text-sky-400"
                >
                  Telegram Active
                </Badge>
              ) : settings.supportWhatsapp ? (
                <Badge
                  variant="outline"
                  className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                >
                  WhatsApp Active
                </Badge>
              ) : (
                <Badge variant="secondary">Unset</Badge>
              )
            }
            onClick={openSupportChannels}
          />
          <SettingsRow
            icon={<LayoutGrid className="size-4" />}
            title="Pages enable"
            description="Turn risky store pages on or off for customers"
            badges={
              <Badge
                variant={
                  settings.pagesEnabled.giftCodes ? "outline" : "secondary"
                }
                className={cn(
                  settings.pagesEnabled.giftCodes &&
                    "border-warning/40 bg-warning/10 text-warning",
                )}
              >
                Gift codes {settings.pagesEnabled.giftCodes ? "on" : "off"}
              </Badge>
            }
            onClick={openPagesEnabled}
          />
          <SettingsRow
            icon={<Bot className="size-4" />}
            title="Support bot"
            description={
              botSummaryLoading
                ? "Loading button tree…"
                : botSummary
                  ? `${botSummary.active} active steps · entry: ${botSummary.entryTitle}`
                  : "Telegram-style button flows"
            }
            badges={<Badge variant="secondary">Button tree</Badge>}
            onClick={() => setSupportBotOpen(true)}
          />
          <SettingsRow
            icon={<Wallet className="size-4" />}
            title="Deposit minimums"
            description={`Users · ${formatMinSummary(settings.depositMins.user)}`}
            badges={
              <Badge variant="secondary" className="max-w-[14rem] truncate">
                Sellers · {formatMinSummary(settings.depositMins.reseller)}
              </Badge>
            }
            onClick={openDepositMins}
          />
          <SettingsRow
            icon={<Coins className="size-4" />}
            title="Currencies & rates"
            description={formatCurrenciesSummary(settings.depositCurrencies)}
            badges={
              <Badge variant="secondary" className="max-w-[14rem] truncate">
                {formatQuickAmountsSummary(
                  settings.depositCurrencies,
                  settings.depositQuickAmounts,
                )}
              </Badge>
            }
            onClick={() => setCurrenciesOpen(true)}
          />
          <SettingsRow
            icon={<CreditCard className="size-4" />}
            title="Auto deposit methods"
            description={
              METHOD_ROWS.filter((m) => Boolean(settings.depositMethods[m.id]?.enabled))
                .map((m) => (m.id === "UPI" ? "INR" : m.label))
                .join(" · ") || "All auto rails off"
            }
            badges={
              <Badge
                variant="outline"
                className="border-success/30 bg-success/10 text-success"
              >
                {methodsSummary(settings.depositMethods)}
              </Badge>
            }
            onClick={openDepositMethods}
          />
          <SettingsRow
            icon={<Wallet className="size-4" />}
            title="Manual deposit methods"
            description={manualMethodsSummary}
            badges={
              <Badge variant="secondary">
                On/off · name · symbol · logo · QR
              </Badge>
            }
            onClick={() => setManualMethodsOpen(true)}
          />
          <SettingsRow
            icon={<Percent className="size-4" />}
            title="Referral rates"
            description={`User ${settings.referralPercent}% · Seller ${settings.sellerPurchasePercent}% · Reseller ${settings.resellerPurchasePercent}%`}
            onClick={openReferral}
          />
          <SettingsRow
            icon={<PieChart className="size-4" />}
            title="Shares & margins"
            description={`Dev ${settings.developerProfitSharePercent}% · Special stock ${settings.specialStockDeveloperSharePercent}% · Supplier buy ${settings.supplierBuyPricePercent}%`}
            badges={<Badge variant="secondary">Settlements · catalog</Badge>}
            onClick={openShares}
          />
          <SettingsRow
            icon={<Handshake className="size-4" />}
            title="Seller program"
            description={`Apply min $${settings.resellerApplyMinBalance} · Create funding min $${settings.resellerCreateMinFunding}`}
            badges={
              <>
                <Badge
                  variant={
                    settings.resellerProgramEnabled ? "outline" : "secondary"
                  }
                    className={cn(
                      settings.resellerProgramEnabled &&
                        "border-success/30 bg-success/10 text-success",
                    )}
                >
                  {settings.resellerProgramEnabled
                    ? "Applications open"
                    : "Closed"}
                </Badge>
                <Badge variant="secondary">
                  Auto-approve {settings.resellerAutoApprove ? "on" : "off"}
                </Badge>
              </>
            }
            onClick={openReseller}
          />
          <SettingsRow
            icon={<KeyRound className="size-4" />}
            title="Authentication"
            description={
              settings.googleAuthEnabled || settings.resendEnabled
                ? [
                    settings.googleAuthEnabled ? "Google on" : "Google off",
                    settings.resendEnabled ? "Email OTP on" : "Email OTP off",
                  ].join(" · ")
                : "Google & password reset email not configured"
            }
            badges={
              <>
                <Badge
                  variant="outline"
                  className={cn(
                    settings.googleAuthEnabled &&
                      "border-success/30 bg-success/10 text-success",
                  )}
                >
                  Google {settings.googleAuthEnabled ? "on" : "off"}
                </Badge>
                <Badge
                  variant="outline"
                  className={cn(
                    settings.resendEnabled &&
                      "border-success/30 bg-success/10 text-success",
                  )}
                >
                  Resend {settings.resendEnabled ? "on" : "off"}
                </Badge>
              </>
            }
            onClick={openAuth}
          />
          <SettingsRow
            icon={<KeySquare className="size-4" />}
            title="Payment API keys"
            description="Binance · AutoGoPay QRIS · FamGateway"
            badges={
              <>
                <Badge
                  variant="outline"
                  className={cn(
                    settings.binanceConfigured &&
                      "border-success/30 bg-success/10 text-success",
                  )}
                >
                  Binance {settings.binanceConfigured ? "on" : "off"}
                </Badge>
                <Badge
                  variant="outline"
                  className={cn(
                    settings.autogopayConfigured &&
                      "border-success/30 bg-success/10 text-success",
                  )}
                >
                  QRIS (AutoGoPay) {settings.autogopayConfigured ? "on" : "off"}
                </Badge>
                <Badge
                  variant="outline"
                  className={cn(
                    settings.famgatewayConfigured &&
                      "border-success/30 bg-success/10 text-success",
                  )}
                >
                  FamGateway (INR) {settings.famgatewayConfigured ? "on" : "off"}
                </Badge>
              </>
            }
            onClick={openPaymentKeys}
          />
          <SettingsRow
            icon={<Code2 className="size-4" />}
            title="Platform API & Sandbox keys"
            description="Allow developers to test with Sandbox API keys without real balance"
            badges={
              <Badge
                variant={settings.apiSandboxEnabled ? "outline" : "secondary"}
                className={cn(
                  settings.apiSandboxEnabled &&
                    "border-success/30 bg-success/10 text-success",
                )}
              >
                Sandbox {settings.apiSandboxEnabled ? "Enabled" : "Disabled"}
              </Badge>
            }
            onClick={openApiSandbox}
          />
          <SettingsRow
            icon={<Vibrate className="size-4" />}
            title="Sound & haptics"
            description={
              feedbackSummary?.description ?? "Site vibration and UI sounds"
            }
            badges={
              <>
                <Badge
                  variant="outline"
                  className={cn(
                    feedbackSummary?.hapticsOn &&
                      "border-success/30 bg-success/10 text-success",
                  )}
                >
                  Haptics {feedbackSummary?.hapticsOn ? "on" : "off"}
                </Badge>
                <Badge variant="secondary">
                  {(feedbackSummary?.customCount ?? 0) > 0
                    ? `${feedbackSummary!.customCount} custom`
                    : "Built-in"}
                </Badge>
              </>
            }
            onClick={() => setFeedbackSoundsOpen(true)}
          />
          <SettingsRow
            icon={<Send className="size-4" />}
            title="Telegram notifications"
            description={
              telegramSummary?.description ??
              "Push events to Telegram channels"
            }
            badges={
              <>
                <Badge
                  variant="outline"
                  className={cn(
                    telegramSummary?.enabled &&
                      "border-success/30 bg-success/10 text-success",
                  )}
                >
                  {telegramSummary?.enabled ? "On" : "Off"}
                </Badge>
                <Badge variant="secondary">
                  {telegramSummary?.activeCount ?? 0} channels
                </Badge>
              </>
            }
            onClick={() => setTelegramNotifyOpen(true)}
          />
          <SettingsRow
            icon={<BellRing className="size-4" />}
            title="Web Push notifications"
            description="Browser push alerts, active subscribers & live test"
            badges={
              <Badge
                variant="outline"
                className="border-primary/30 bg-primary/10 text-primary"
              >
                VAPID Native
              </Badge>
            }
            onClick={() => setWebPushOpen(true)}
            last
          />
        </div>
      )}

      <Dialog
        open={edit === "general"}
        onOpenChange={(open) => !open && setEdit(null)}
      >
        <DialogContent className="flex max-h-[min(92dvh,640px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
          <div className="shrink-0 border-b border-border/40 bg-muted/40 px-5 py-4">
            <DialogHeader className="gap-1.5 pr-8 text-left">
              <div className="mb-1 flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Settings2 className="size-5" />
              </div>
              <DialogTitle className="text-lg">General settings</DialogTitle>
              <DialogDescription>
                Maintenance mode and system status.
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
            <div className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3">
              <div className="min-w-0">
                <Label htmlFor="maint" className="text-sm font-medium">
                  Maintenance mode
                </Label>
                <p className="text-xs text-muted-foreground">
                  Pause storefront access while you work.
                </p>
              </div>
              <Switch
                id="maint"
                checked={generalDraft.maintenanceMode}
                onCheckedChange={(checked) =>
                  setGeneralDraft({ ...generalDraft, maintenanceMode: checked })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEdit(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={pending}
              onClick={() => {
                void save({ maintenanceMode: generalDraft.maintenanceMode }).then((ok) => {
                  if (ok) setEdit(null);
                });
              }}
            >
              {pending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={edit === "supportChannels"}
        onOpenChange={(open) => !open && setEdit(null)}
      >
        <DialogContent className="flex max-h-[min(92dvh,680px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
          <div className="shrink-0 border-b border-border/40 bg-muted/40 px-5 py-4">
            <DialogHeader className="gap-1.5 pr-8 text-left">
              <div className="mb-1 flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Headphones className="size-5" />
              </div>
              <DialogTitle className="text-lg">Support & Contact Channels</DialogTitle>
              <DialogDescription>
                Configure owner direct Telegram & WhatsApp channels for one-tap customer assistance.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
            <div className="space-y-2">
              <Label htmlFor="tg-channel" className="flex items-center gap-1.5 text-sm font-medium">
                <Send className="size-3.5 text-sky-400" />
                Telegram Support (Username / Link)
              </Label>
              <Input
                id="tg-channel"
                value={supportChannelsDraft.supportTelegram}
                onChange={(e) =>
                  setSupportChannelsDraft({
                    ...supportChannelsDraft,
                    supportTelegram: e.target.value,
                  })
                }
                placeholder="@username or https://t.me/yourname"
                className="h-11"
              />
              <p className="text-xs text-muted-foreground">
                Customers tapping Telegram will open a direct chat with this handle.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="wa-channel" className="flex items-center gap-1.5 text-sm font-medium">
                <MessageSquare className="size-3.5 text-emerald-400" />
                WhatsApp Support (Number / Link)
              </Label>
              <Input
                id="wa-channel"
                value={supportChannelsDraft.supportWhatsapp}
                onChange={(e) =>
                  setSupportChannelsDraft({
                    ...supportChannelsDraft,
                    supportWhatsapp: e.target.value,
                  })
                }
                placeholder="+919876543210 or https://wa.me/919876543210"
                className="h-11"
              />
              <p className="text-xs text-muted-foreground">
                Customers without Telegram can reach you directly on WhatsApp (include country code).
              </p>
            </div>

            <div className="space-y-2 border-t border-border/50 pt-3">
              <Label htmlFor="fb-channel" className="text-sm font-medium">
                Fallback Support Contact (Optional)
              </Label>
              <Input
                id="fb-channel"
                value={supportChannelsDraft.supportContact}
                onChange={(e) =>
                  setSupportChannelsDraft({
                    ...supportChannelsDraft,
                    supportContact: e.target.value,
                  })
                }
                placeholder="https://... or secondary handle"
                className="h-11"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEdit(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={pending}
              onClick={() => {
                void save(supportChannelsDraft).then((ok) => {
                  if (ok) setEdit(null);
                });
              }}
            >
              {pending ? "Saving…" : "Save channels"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={edit === "pagesEnabled"}
        onOpenChange={(open) => !open && setEdit(null)}
      >
        <DialogContent className="flex max-h-[min(92dvh,640px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
          <div className="shrink-0 border-b border-border/40 bg-muted/40 px-5 py-4">
            <DialogHeader className="gap-1.5 pr-8 text-left">
              <div className="mb-1 flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <LayoutGrid className="size-5" />
              </div>
              <DialogTitle className="text-lg">Pages enable</DialogTitle>
              <DialogDescription>
                Store-wide switches for customer-facing pages. Keep risky
                options off unless you need them.
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
            <div className="flex items-center justify-between gap-3 rounded-xl border border-warning/30 bg-warning/5 px-4 py-3">
              <div className="min-w-0">
                <Label htmlFor="page-gift-codes" className="text-sm font-medium">
                  Gift codes
                </Label>
                <p className="text-xs text-muted-foreground">
                  Customer claim page + deposit entry. Default off — supplier
                  risk if discovered.
                </p>
              </div>
              <Switch
                id="page-gift-codes"
                checked={pagesDraft.giftCodes}
                onCheckedChange={(checked) =>
                  setPagesDraft({ ...pagesDraft, giftCodes: checked })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEdit(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={pending}
              onClick={() => {
                void save({ pagesEnabled: pagesDraft }).then((ok) => {
                  if (ok) setEdit(null);
                });
              }}
            >
              {pending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={edit === "depositMins"}
        onOpenChange={(open) => !open && setEdit(null)}
      >
        <DialogContent className="flex max-h-[min(92dvh,820px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
          <div className="shrink-0 border-b border-border/40 bg-muted/40 px-5 py-4">
            <DialogHeader className="gap-1.5 pr-8 text-left">
              <div className="mb-1 flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Wallet className="size-5" />
              </div>
              <DialogTitle className="text-lg">Deposit minimums</DialogTitle>
              <DialogDescription>
                Set minimums in each payment currency — separately for normal
                users and the Seller / Reseller wholesale tier.
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-4">
            <section className="space-y-3">
              <div>
                <p className="text-sm font-semibold">Normal users</p>
                <p className="text-xs text-muted-foreground">
                  Applies to USER (and ADMIN) deposit attempts.
                </p>
              </div>
              <CurrencyMinsFields
                idPrefix="user"
                value={depositDraft.user}
                currencies={settings?.depositCurrencies ?? DEFAULT_DEPOSIT_CURRENCIES}
                onChange={(user) =>
                  setDepositDraft({ ...depositDraft, user })
                }
              />
            </section>
            <section className="space-y-3">
              <div>
                <p className="text-sm font-semibold">Sellers &amp; resellers</p>
                <p className="text-xs text-muted-foreground">
                  Applies to SELLER and RESELLER (same deposit mins).
                </p>
              </div>
              <CurrencyMinsFields
                idPrefix="reseller"
                value={depositDraft.reseller}
                currencies={settings?.depositCurrencies ?? DEFAULT_DEPOSIT_CURRENCIES}
                onChange={(reseller) =>
                  setDepositDraft({ ...depositDraft, reseller })
                }
              />
            </section>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEdit(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={pending}
              onClick={() => {
                void save({ depositMins: depositDraft }).then((ok) => {
                  if (ok) setEdit(null);
                });
              }}
            >
              {pending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={edit === "depositMethods"}
        onOpenChange={(open) => !open && setEdit(null)}
      >
        <DialogContent className="flex max-h-[min(92dvh,820px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
          <div className="shrink-0 border-b border-border/40 bg-muted/40 px-5 py-4">
            <DialogHeader className="gap-1.5 pr-8 text-left">
              <div className="mb-1 flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <CreditCard className="size-5" />
              </div>
              <DialogTitle className="text-lg">Auto deposit methods</DialogTitle>
              <DialogDescription>
                QRIS (AutoGoPay), Binance Pay, and FamGateway INR
                — on/off only. Binance accepts a pay QR upload. Manual proof
                rails are configured separately.
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
            {METHOD_ROWS.map((row) => {
              const entry = methodsDraft[row.id] ?? { enabled: false, qrUrl: "" };
              const previewQr =
                (entry.qrUrl ?? "").trim() || row.defaultQr || "";
              const uploading = uploadingQr === row.id;
              return (
                <div
                  key={row.id}
                  className="space-y-3 rounded-xl border border-border px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <Label
                        htmlFor={`method-${row.id}`}
                        className="text-sm font-medium"
                      >
                        {row.label}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {row.hint}
                      </p>
                    </div>
                    <Switch
                      id={`method-${row.id}`}
                      checked={entry.enabled}
                      onCheckedChange={(checked) =>
                        setMethodsDraft({
                          ...methodsDraft,
                          [row.id]: { ...entry, enabled: checked },
                        })
                      }
                    />
                  </div>
                  {row.hasManualQr ? (
                    <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/30 p-3 sm:flex-row sm:items-center">
                      <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-background">
                        {previewQr ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={previewQr}
                            alt=""
                            className="size-full object-contain p-1"
                          />
                        ) : (
                          <ImagePlus className="size-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1 space-y-2">
                        <p className="truncate text-xs text-muted-foreground">
                          {entry.qrUrl.trim()
                            ? entry.qrUrl
                            : "Using default QR asset"}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <label
                            className={cn(
                              "inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-border bg-background px-3 text-xs font-medium shadow-xs transition-colors hover:bg-muted",
                              uploading && "pointer-events-none opacity-50",
                            )}
                          >
                            <ImagePlus className="size-3.5" />
                            {uploading ? "Uploading…" : "Upload QR"}
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              className="sr-only"
                              disabled={uploading || pending}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                e.target.value = "";
                                if (file) void uploadMethodQr(row.id, file);
                              }}
                            />
                          </label>
                          {entry.qrUrl.trim() ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={uploading || pending}
                              onClick={() =>
                                setMethodsDraft({
                                  ...methodsDraft,
                                  [row.id]: { ...entry, qrUrl: "" },
                                })
                              }
                            >
                              Use default
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEdit(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={pending || uploadingQr !== null}
              onClick={() => {
                void save({
                  depositMethods: depositMethodsPayload(methodsDraft),
                }).then((ok) => {
                  if (ok) setEdit(null);
                });
              }}
            >
              {pending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={edit === "referral"}
        onOpenChange={(open) => !open && setEdit(null)}
      >
        <DialogContent className="flex max-h-[min(92dvh,640px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
          <div className="shrink-0 border-b border-border/40 bg-muted/40 px-5 py-4">
            <DialogHeader className="gap-1.5 pr-8 text-left">
              <div className="mb-1 flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Percent className="size-5" />
              </div>
              <DialogTitle className="text-lg">Referral rates</DialogTitle>
              <DialogDescription>
                Percent credited to the referrer when an invited user of that
                role completes a paid purchase.
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
            <div className="space-y-2">
              <Label htmlFor="ref-pct">User purchase percent</Label>
              <Input
                id="ref-pct"
                type="number"
                min={0}
                max={100}
                value={referralDraft.referralPercent}
                onChange={(e) =>
                  setReferralDraft({
                    ...referralDraft,
                    referralPercent: Number(e.target.value) || 0,
                  })
                }
                className="h-11 tabular-nums"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="seller-pct">Seller purchase percent</Label>
              <Input
                id="seller-pct"
                type="number"
                min={0}
                max={100}
                value={referralDraft.sellerPurchasePercent}
                onChange={(e) =>
                  setReferralDraft({
                    ...referralDraft,
                    sellerPurchasePercent: Number(e.target.value) || 0,
                  })
                }
                className="h-11 tabular-nums"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="res-pct">Reseller purchase percent</Label>
              <Input
                id="res-pct"
                type="number"
                min={0}
                max={100}
                value={referralDraft.resellerPurchasePercent}
                onChange={(e) =>
                  setReferralDraft({
                    ...referralDraft,
                    resellerPurchasePercent: Number(e.target.value) || 0,
                  })
                }
                className="h-11 tabular-nums"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEdit(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={pending}
              onClick={() => {
                void save(referralDraft).then((ok) => {
                  if (ok) setEdit(null);
                });
              }}
            >
              {pending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={edit === "shares"}
        onOpenChange={(open) => !open && setEdit(null)}
      >
        <DialogContent className="flex max-h-[min(92dvh,640px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
          <div className="shrink-0 border-b border-border/40 bg-muted/40 px-5 py-4">
            <DialogHeader className="gap-1.5 pr-8 text-left">
              <div className="mb-1 flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <PieChart className="size-5" />
              </div>
              <DialogTitle className="text-lg">Shares & margins</DialogTitle>
              <DialogDescription>
                Developer settlement shares and supplier catalog buy-cost fill.
                Changes apply to new calculations immediately.
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
            <div className="space-y-2">
              <Label htmlFor="dev-share-pct">Order developer share %</Label>
              <Input
                id="dev-share-pct"
                type="number"
                min={0}
                max={100}
                value={sharesDraft.developerProfitSharePercent}
                onChange={(e) =>
                  setSharesDraft({
                    ...sharesDraft,
                    developerProfitSharePercent: Number(e.target.value) || 0,
                  })
                }
                className="h-11 tabular-nums"
              />
              <p className="text-[11px] text-muted-foreground">
                Of gross profit (sale − buy) on Development / Statistics.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="special-stock-share-pct">Special stock developer share %</Label>
              <Input
                id="special-stock-share-pct"
                type="number"
                min={0}
                max={100}
                value={sharesDraft.specialStockDeveloperSharePercent}
                onChange={(e) =>
                  setSharesDraft({
                    ...sharesDraft,
                    specialStockDeveloperSharePercent: Number(e.target.value) || 0,
                  })
                }
                className="h-11 tabular-nums"
              />
              <p className="text-[11px] text-muted-foreground">
                Of gross profit from special stock batch keys (50% developer / 50% owner default).
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplier-buy-pct">Supplier buy price %</Label>
              <Input
                id="supplier-buy-pct"
                type="number"
                min={0}
                max={100}
                value={sharesDraft.supplierBuyPricePercent}
                onChange={(e) =>
                  setSharesDraft({
                    ...sharesDraft,
                    supplierBuyPricePercent: Number(e.target.value) || 0,
                  })
                }
                className="h-11 tabular-nums"
              />
              <p className="text-[11px] text-muted-foreground">
                When picking a supplier catalog item, buy cost = list × this %.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEdit(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={pending}
              onClick={() => {
                void save(sharesDraft).then((ok) => {
                  if (ok) setEdit(null);
                });
              }}
            >
              {pending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={edit === "reseller"}
        onOpenChange={(open) => !open && setEdit(null)}
      >
        <DialogContent className="flex max-h-[min(92dvh,640px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
          <div className="shrink-0 border-b border-border/40 bg-muted/40 px-5 py-4">
            <DialogHeader className="gap-1.5 pr-8 text-left">
              <div className="mb-1 flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Handshake className="size-5" />
              </div>
              <DialogTitle className="text-lg">Seller program</DialogTitle>
              <DialogDescription>
                Control Become a Seller applications, auto-approve, apply
                minimum balance, and minimum funding when creating a child
                reseller.
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
            <div className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3">
              <div className="min-w-0">
                <Label htmlFor="res-enabled" className="text-sm font-medium">
                  Application submissions
                </Label>
                <p className="text-xs text-muted-foreground">
                  Allow customers to apply as sellers.
                </p>
              </div>
              <Switch
                id="res-enabled"
                checked={resellerDraft.resellerProgramEnabled}
                onCheckedChange={(checked) =>
                  setResellerDraft({
                    ...resellerDraft,
                    resellerProgramEnabled: checked,
                  })
                }
              />
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3">
              <div className="min-w-0">
                <Label htmlFor="res-auto" className="text-sm font-medium">
                  Auto-approve applications
                </Label>
                <p className="text-xs text-muted-foreground">
                  Skip manual review when eligible.
                </p>
              </div>
              <Switch
                id="res-auto"
                checked={resellerDraft.resellerAutoApprove}
                onCheckedChange={(checked) =>
                  setResellerDraft({
                    ...resellerDraft,
                    resellerAutoApprove: checked,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="res-min">Apply minimum wallet balance (USD)</Label>
              <Input
                id="res-min"
                type="number"
                min={0}
                step="1"
                value={resellerDraft.resellerApplyMinBalance}
                onChange={(e) =>
                  setResellerDraft({
                    ...resellerDraft,
                    resellerApplyMinBalance: Number(e.target.value) || 0,
                  })
                }
                className="h-11 tabular-nums"
              />
              <p className="text-xs text-muted-foreground">
                Required balance before a customer can submit Become a Seller.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="res-create-min">
                Child reseller create funding min (USD)
              </Label>
              <Input
                id="res-create-min"
                type="number"
                min={0}
                step="1"
                value={resellerDraft.resellerCreateMinFunding}
                onChange={(e) =>
                  setResellerDraft({
                    ...resellerDraft,
                    resellerCreateMinFunding: Number(e.target.value) || 0,
                  })
                }
                className="h-11 tabular-nums"
              />
              <p className="text-xs text-muted-foreground">
                Minimum initial funding when a Seller or Admin creates a child
                reseller.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEdit(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={pending}
              onClick={() => {
                void save(resellerDraft).then((ok) => {
                  if (ok) setEdit(null);
                });
              }}
            >
              {pending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={edit === "auth"}
        onOpenChange={(open) => !open && setEdit(null)}
      >
        <DialogContent className="flex max-h-[min(92dvh,720px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
          <div className="shrink-0 border-b border-border/40 bg-muted/40 px-5 py-4">
            <DialogHeader className="gap-1.5 pr-8 text-left">
              <div className="mb-1 flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <KeyRound className="size-5" />
              </div>
              <DialogTitle className="text-lg">Authentication</DialogTitle>
              <DialogDescription>
                Google OAuth and Resend email for forgot-password OTP. Values
                here override <code className="text-xs">.env</code> when set.
                Login/register title uses Site Config brand name.
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
            <section className="space-y-3">
              <p className="text-sm font-semibold">Google sign-in</p>
              <div className="space-y-2">
                <Label htmlFor="google-client-id">Client ID</Label>
                <Input
                  id="google-client-id"
                  value={authDraft.googleClientId}
                  onChange={(e) =>
                    setAuthDraft({
                      ...authDraft,
                      googleClientId: e.target.value,
                    })
                  }
                  placeholder="xxxx.apps.googleusercontent.com"
                  className="h-11 font-mono text-sm"
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="google-client-secret">Client secret</Label>
                <Input
                  id="google-client-secret"
                  type="password"
                  value={authDraft.googleClientSecret}
                  onChange={(e) =>
                    setAuthDraft({
                      ...authDraft,
                      googleClientSecret: e.target.value,
                    })
                  }
                  placeholder="GOCSPX-…"
                  className="h-11 font-mono text-sm"
                  autoComplete="new-password"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Redirect URI:{" "}
                <span className="font-mono">
                  {typeof window !== "undefined"
                    ? `${window.location.origin}/api/auth/google/callback`
                    : "/api/auth/google/callback"}
                </span>
              </p>
            </section>
            <section className="space-y-3 border-t border-border pt-4">
              <p className="text-sm font-semibold">Password reset email</p>
              <div className="space-y-2">
                <Label htmlFor="resend-api-key">Resend API key</Label>
                <Input
                  id="resend-api-key"
                  type="password"
                  value={authDraft.resendApiKey}
                  onChange={(e) =>
                    setAuthDraft({ ...authDraft, resendApiKey: e.target.value })
                  }
                  placeholder="re_…"
                  className="h-11 font-mono text-sm"
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="resend-from">From address</Label>
                <Input
                  id="resend-from"
                  value={authDraft.resendFromEmail}
                  onChange={(e) =>
                    setAuthDraft({
                      ...authDraft,
                      resendFromEmail: e.target.value,
                    })
                  }
                  placeholder="Cheap Seller <noreply@yourdomain.com>"
                  className="h-11"
                />
              </div>
            </section>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEdit(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={pending}
              onClick={() => {
                void save(authDraft).then((ok) => {
                  if (ok) setEdit(null);
                });
              }}
            >
              {pending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={edit === "paymentKeys"}
        onOpenChange={(open) => !open && setEdit(null)}
      >
        <DialogContent className="flex max-h-[min(92dvh,720px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
          <div className="shrink-0 border-b border-border/40 bg-muted/40 px-5 py-4">
            <DialogHeader className="gap-1.5 pr-8 text-left">
              <div className="mb-1 flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <KeySquare className="size-5" />
              </div>
              <DialogTitle className="text-lg">Payment API keys</DialogTitle>
              <DialogDescription>
                Binance Pay, AutoGoPay QRIS, and FamGateway credentials. Values
                here override <code className="text-xs">.env</code> when set. Leave
                a field empty to fall back to env.
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
            <section className="space-y-3">
              <p className="text-sm font-semibold">Binance Pay</p>
              <div className="space-y-2">
                <Label htmlFor="binance-api-key">API key</Label>
                <Input
                  id="binance-api-key"
                  type="password"
                  value={paymentKeysDraft.binanceApiKey}
                  onChange={(e) =>
                    setPaymentKeysDraft({
                      ...paymentKeysDraft,
                      binanceApiKey: e.target.value,
                    })
                  }
                  placeholder="Binance API key"
                  className="h-11 font-mono text-sm"
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="binance-secret-key">Secret key</Label>
                <Input
                  id="binance-secret-key"
                  type="password"
                  value={paymentKeysDraft.binanceSecretKey}
                  onChange={(e) =>
                    setPaymentKeysDraft({
                      ...paymentKeysDraft,
                      binanceSecretKey: e.target.value,
                    })
                  }
                  placeholder="Binance secret key"
                  className="h-11 font-mono text-sm"
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="binance-pay-id">Pay ID</Label>
                <Input
                  id="binance-pay-id"
                  value={paymentKeysDraft.binancePayId}
                  onChange={(e) =>
                    setPaymentKeysDraft({
                      ...paymentKeysDraft,
                      binancePayId: e.target.value,
                    })
                  }
                  placeholder="Shown on waiting ticket"
                  className="h-11 font-mono text-sm"
                  autoComplete="off"
                />
              </div>
            </section>

            <section className="space-y-3 border-t border-border pt-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">AutoGoPay (QRIS)</p>
                <a
                  href="https://autogopay.site"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-primary underline underline-offset-2"
                >
                  autogopay.site ↗
                </a>
              </div>
              <div className="space-y-2">
                <Label htmlFor="autogopay-api-key">API key</Label>
                <Input
                  id="autogopay-api-key"
                  type="password"
                  value={paymentKeysDraft.autogopayApiKey}
                  onChange={(e) =>
                    setPaymentKeysDraft({
                      ...paymentKeysDraft,
                      autogopayApiKey: e.target.value,
                    })
                  }
                  placeholder="AutoGoPay API key"
                  className="h-11 font-mono text-sm"
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="autogopay-base-url">Base URL</Label>
                <Input
                  id="autogopay-base-url"
                  value={paymentKeysDraft.autogopayBaseUrl}
                  onChange={(e) =>
                    setPaymentKeysDraft({
                      ...paymentKeysDraft,
                      autogopayBaseUrl: e.target.value,
                    })
                  }
                  placeholder="https://v1-gateway.autogopay.site"
                  className="h-11 font-mono text-sm"
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="autogopay-webhook-url">Webhook URL</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="autogopay-webhook-url"
                    readOnly
                    value={autogopayWebhookUrl}
                    className="h-11 font-mono text-xs bg-muted/50 text-muted-foreground select-all"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-11 shrink-0 px-3"
                    onClick={() => {
                      if (!autogopayWebhookUrl) return;
                      void navigator.clipboard.writeText(autogopayWebhookUrl);
                      setCopiedAutogopayWebhook(true);
                      toast.success("Webhook URL copied to clipboard");
                      setTimeout(() => setCopiedAutogopayWebhook(false), 2000);
                    }}
                  >
                    {copiedAutogopayWebhook ? (
                      <Check className="size-4 text-success" />
                    ) : (
                      <Copy className="size-4" />
                    )}
                    <span className="ml-1.5 hidden sm:inline">
                      {copiedAutogopayWebhook ? "Copied" : "Copy"}
                    </span>
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Set this as the callback URL for your AutoGoPay API key (webhooks are signed with HMAC-SHA256 using the API key)
                </p>
              </div>
            </section>

            <section className="space-y-3 border-t border-border pt-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">FamGateway (INR / UPI)</p>
                <a
                  href="https://famgateway.in/docs.php"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-primary underline underline-offset-2"
                >
                  famgateway.in/docs.php ↗
                </a>
              </div>
              <div className="space-y-2">
                <Label htmlFor="famgateway-api-key">API Key</Label>
                <Input
                  id="famgateway-api-key"
                  type="password"
                  value={paymentKeysDraft.famgatewayApiKey}
                  onChange={(e) =>
                    setPaymentKeysDraft({
                      ...paymentKeysDraft,
                      famgatewayApiKey: e.target.value,
                    })
                  }
                  placeholder="Paste your FamGateway API Key"
                  className="h-11 font-mono text-sm"
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="famgateway-base-url">Gateway Base URL</Label>
                <Input
                  id="famgateway-base-url"
                  value={paymentKeysDraft.famgatewayBaseUrl}
                  onChange={(e) =>
                    setPaymentKeysDraft({
                      ...paymentKeysDraft,
                      famgatewayBaseUrl: e.target.value,
                    })
                  }
                  placeholder="https://famgateway.in"
                  className="h-11 font-mono text-sm"
                  autoComplete="off"
                />
              </div>
              <div className="rounded-xl border border-border/70 bg-muted/30 p-3 text-xs text-muted-foreground">
                <p className="font-medium text-foreground">
                  Webhook Configuration:
                </p>
                <code className="mt-1 block select-all break-all rounded bg-background px-2 py-1 font-mono text-[11px] text-primary">
                  https://cheapseller.store/api/webhooks/famgateway
                </code>
                <p className="mt-1.5 text-[11px] leading-relaxed">
                  Webhooks are cryptographically verified via HMAC-SHA256 with
                  your default API Key.
                </p>
              </div>
            </section>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEdit(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={pending}
              onClick={() => {
                void save(paymentKeysDraft).then((ok) => {
                  if (ok) setEdit(null);
                });
              }}
            >
              {pending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={edit === "apiSandbox"}
        onOpenChange={(o) => !o && setEdit(null)}
      >
        <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md">
          <DialogHeader className="border-b border-border/60 bg-muted/30 px-5 py-4">
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Code2 className="size-4" />
              </div>
              <div>
                <DialogTitle>Platform API & Sandbox</DialogTitle>
                <DialogDescription className="text-xs">
                  Allow developers to create and test with Sandbox API keys
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-4 px-5 py-4">
            <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="api-sandbox-toggle" className="text-sm font-medium">
                  Enable Sandbox Mode
                </Label>
                <p className="text-xs text-muted-foreground">
                  When enabled, users can create Sandbox API keys in the developer portal to simulate purchases and query endpoints without spending USD balance.
                </p>
              </div>
              <Switch
                id="api-sandbox-toggle"
                checked={apiSandboxDraft.apiSandboxEnabled}
                onCheckedChange={(checked) =>
                  setApiSandboxDraft({ apiSandboxEnabled: checked })
                }
              />
            </div>
          </div>
          <DialogFooter className="border-t border-border/60 px-5 py-3">
            <Button variant="outline" onClick={() => setEdit(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={pending}
              onClick={() => {
                void save(apiSandboxDraft).then((ok) => {
                  if (ok) setEdit(null);
                });
              }}
            >
              {pending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SupportBotSettingsDialog
        open={supportBotOpen}
        onOpenChange={setSupportBotOpen}
      />
      {settings ? (
        <DepositCurrenciesSettings
          open={currenciesOpen}
          onOpenChange={setCurrenciesOpen}
          currencies={settings.depositCurrencies}
          quickAmounts={settings.depositQuickAmounts}
          usedByManualMethods={settings.manualDepositMethods.map(
            (m) => m.currency,
          )}
          onSaved={() => void reload()}
        />
      ) : null}
      {settings ? (
        <ManualDepositMethodsSettings
          open={manualMethodsOpen}
          onOpenChange={setManualMethodsOpen}
          methods={settings.manualDepositMethods}
          currencies={settings.depositCurrencies}
          onSaved={() => void reload()}
        />
      ) : null}
      {settings ? (
        <FeedbackSoundsSettingsDialog
          open={feedbackSoundsOpen}
          onOpenChange={setFeedbackSoundsOpen}
          initial={settings.feedbackSounds}
          pending={pending}
          onSave={async (next) => save({ feedbackSounds: next })}
        />
      ) : null}
      {settings ? (
        <TelegramNotifySettingsDialog
          open={telegramNotifyOpen}
          onOpenChange={setTelegramNotifyOpen}
          initial={settings.telegramNotifications}
          pending={pending}
          onSave={async (next) => save({ telegramNotifications: next })}
        />
      ) : null}
      <WebPushSettingsDialog
        open={webPushOpen}
        onOpenChange={setWebPushOpen}
      />
    </main>
  );
}

function SettingsRow({
  icon,
  title,
  description,
  badges,
  onClick,
  last = false,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  badges?: ReactNode;
  onClick: () => void;
  last?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted/40 active:bg-muted/60 sm:px-5",
        !last && "border-b border-border",
      )}
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="text-sm font-semibold">{title}</p>
          {badges}
        </div>
        <p className="truncate text-sm text-muted-foreground">{description}</p>
      </div>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </button>
  );
}
