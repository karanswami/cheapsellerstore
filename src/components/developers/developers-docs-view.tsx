"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  AI_PROMPT_PACKS,
  API_MONEY_DOCS,
  DOC_ENDPOINTS,
  DOC_ERRORS,
  DOC_NAV,
  SNIPPET_LANGS,
  buildAiPromptPack,
  buildSnippet,
  testerPath,
  type AiPromptPack,
  type DocEndpoint,
  type DocParam,
  type DocStatus,
  type SnippetLang,
} from "@/lib/seller-api/docs-catalog";
import { SDK_PACKS } from "@/lib/seller-api/sdk-packs";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Bot,
  Calculator,
  Check,
  CheckCircle2,
  ChevronRight,
  Code2,
  Copy,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  FileCode2,
  FileJson,
  FlaskConical,
  HelpCircle,
  Info,
  KeyRound,
  Layers,
  ListTree,
  Loader2,
  Lock,
  Play,
  RefreshCw,
  Search,
  Shield,
  ShieldCheck,
  Sparkles,
  Terminal,
  Timer,
  Webhook,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import styles from "./developers-docs-view.module.css";

type DevelopersDocsViewProps = {
  purchaseFeePercent: number;
  publicRateLimitRpm: number;
  privateRateLimitRpm: number;
  baseUrl: string;
};

type ViewTab = "reference" | "guides" | "playground" | "sdks" | "ai";
type DemoTab = "response" | "error" | "request";

export function DevelopersDocsView({
  purchaseFeePercent,
  publicRateLimitRpm,
  privateRateLimitRpm,
  baseUrl,
}: DevelopersDocsViewProps) {
  const [activeTab, setActiveTab] = useState<ViewTab>("reference");
  const [selectedEndpointId, setSelectedEndpointId] = useState<string>(
    DOC_ENDPOINTS[0]!.id,
  );
  const [lang, setLang] = useState<SnippetLang>("curl");
  const [snippetKey, setSnippetKey] = useState("drip_sk_live_YOUR_KEY");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Playground state
  const [liveEpId, setLiveEpId] = useState<string>(DOC_ENDPOINTS[0]!.id);

  // AI Prompt Pack state
  const [aiKey, setAiKey] = useState("");
  const [aiPack, setAiPack] = useState<AiPromptPack>("full");

  // Money calculator state
  const [calcUsd, setCalcUsd] = useState("1.00");
  const [calcMicrocents, setCalcMicrocents] = useState("100000000");

  const selectedEndpoint = useMemo(
    () =>
      DOC_ENDPOINTS.find((e) => e.id === selectedEndpointId) ??
      DOC_ENDPOINTS[0]!,
    [selectedEndpointId],
  );

  const filteredEndpoints = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return DOC_ENDPOINTS;
    return DOC_ENDPOINTS.filter(
      (e) =>
        e.path.toLowerCase().includes(q) ||
        e.method.toLowerCase().includes(q) ||
        e.summary.toLowerCase().includes(q) ||
        e.id.toLowerCase().includes(q),
    );
  }, [searchQuery]);

  const endpointCategories = useMemo(() => {
    return [
      {
        id: "products",
        title: "Catalog & Pricing",
        icon: <Layers className="size-3.5" />,
        endpoints: filteredEndpoints.filter((e) => e.group === "products"),
      },
      {
        id: "wallet",
        title: "Wallet & Account",
        icon: <KeyRound className="size-3.5" />,
        endpoints: filteredEndpoints.filter((e) => e.group === "wallet"),
      },
      {
        id: "orders",
        title: "Orders & Keys",
        icon: <Zap className="size-3.5" />,
        endpoints: filteredEndpoints.filter((e) => e.group === "orders"),
      },
    ].filter((g) => g.endpoints.length > 0);
  }, [filteredEndpoints]);

  const copy = (text: string, label = "Copied to clipboard", id?: string) => {
    void navigator.clipboard.writeText(text);
    if (id) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
    toast.success(label);
  };

  const handleUsdChange = (val: string) => {
    setCalcUsd(val);
    const parsed = parseFloat(val);
    if (!isNaN(parsed) && parsed >= 0) {
      setCalcMicrocents(Math.round(parsed * 100_000_000).toString());
    }
  };

  const handleMicrocentsChange = (val: string) => {
    setCalcMicrocents(val);
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed) && parsed >= 0) {
      setCalcUsd((parsed / 100_000_000).toFixed(2));
    }
  };

  const launchInPlayground = (epId: string) => {
    setLiveEpId(epId);
    setActiveTab("playground");
    window.scrollTo({ top: 200, behavior: "smooth" });
  };

  const aiPrompt = useMemo(
    () =>
      buildAiPromptPack(aiPack, {
        baseUrl,
        publicRpm: publicRateLimitRpm,
        privateRpm: privateRateLimitRpm,
        purchaseFeePercent,
        apiKey: aiKey,
      }),
    [
      aiPack,
      baseUrl,
      publicRateLimitRpm,
      privateRateLimitRpm,
      purchaseFeePercent,
      aiKey,
    ],
  );

  return (
    <main className="relative min-h-screen w-full max-w-full overflow-x-hidden bg-background text-foreground selection:bg-primary/30 selection:text-primary">
      {/* Ambient background glow layers */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[32rem] bg-[radial-gradient(ellipse_70%_50%_at_50%_-5%,color-mix(in_oklab,var(--primary)_20%,transparent),transparent_75%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-40 top-32 size-80 rounded-full bg-primary/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-40 top-64 size-80 rounded-full bg-accent/10 blur-3xl"
      />

      <div className="relative mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {/* S-Tier Header Hero */}
        <header className="mb-6 space-y-4 sm:mb-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-0.5 text-xs font-semibold text-primary backdrop-blur-md">
              <Sparkles className="size-3.5" />
              Platform API v1.0 · High-Speed Key Fulfillment
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400 backdrop-blur-md">
              <span className="size-1.5 rounded-full bg-emerald-400 animate-ping" />
              Online & Ready
            </span>
          </div>

          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
            <div className="space-y-1.5 max-w-2xl">
              <h1 className="text-2xl font-black tracking-tight sm:text-3xl lg:text-4xl">
                Developer <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent to-primary">API Reference</span>
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Automate digital key delivery, query real-time stock & wholesale prices, and integrate instant license fulfillment into your site.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button asChild size="sm" className="shadow-md shadow-primary/20 gap-1.5 h-9">
                <Link href="/app/development">
                  <KeyRound className="size-3.5" />
                  Get API Key
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="gap-1.5 h-9">
                <a href="/api/v1/openapi.json" target="_blank" rel="noopener noreferrer">
                  <FileJson className="size-3.5" />
                  OpenAPI 3.1
                </a>
              </Button>
            </div>
          </div>

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
            <div className="flex items-center gap-2.5 rounded-xl border border-border/70 bg-card/40 p-2.5 sm:p-3 backdrop-blur-md">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <Zap className="size-3.5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground font-medium truncate">Execution</p>
                <p className="text-xs font-bold text-foreground truncate">&lt;50ms Latency</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 rounded-xl border border-border/70 bg-card/40 p-2.5 sm:p-3 backdrop-blur-md">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
                <ShieldCheck className="size-3.5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground font-medium truncate">Fulfillment</p>
                <p className="text-xs font-bold text-foreground truncate">100% Idempotent</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 rounded-xl border border-border/70 bg-card/40 p-2.5 sm:p-3 backdrop-blur-md">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent">
                <Calculator className="size-3.5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground font-medium truncate">Precision</p>
                <p className="text-xs font-bold text-foreground truncate">USD Microcents</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 rounded-xl border border-border/70 bg-card/40 p-2.5 sm:p-3 backdrop-blur-md">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sky-500/15 text-sky-400">
                <Sparkles className="size-3.5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground font-medium truncate">VIP Tier</p>
                <p className="text-xs font-bold text-foreground truncate">0% Developer Fee</p>
              </div>
            </div>
          </div>

          {/* Primary View Switcher Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-border/60">
            {[
              { id: "reference", label: "API Reference", icon: <Layers className="size-3.5" /> },
              { id: "playground", label: "Live Playground", icon: <FlaskConical className="size-3.5" /> },
              { id: "guides", label: "Guides & Architecture", icon: <BookOpen className="size-3.5" /> },
              { id: "sdks", label: "SDKs & Downloads", icon: <Download className="size-3.5" /> },
              { id: "ai", label: "AI Prompt Packs", icon: <Bot className="size-3.5" /> },
            ].map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as ViewTab)}
                  className={cn(
                    "flex items-center gap-2 whitespace-nowrap rounded-lg px-3.5 py-2 text-xs font-semibold transition-all cursor-pointer",
                    active
                      ? "bg-primary/15 text-primary border border-primary/30 shadow-xs"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground border border-transparent",
                  )}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </header>

        {/* ========================================================================= */}
        {/* TAB 1: API REFERENCE EXPLORER */}
        {/* ========================================================================= */}
        {activeTab === "reference" && (
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Left Column: Endpoint Navigation Sidebar */}
            <div className="space-y-4 lg:col-span-4 xl:col-span-3">
              {/* Search Bar */}
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter endpoints…"
                  className="h-9 pl-9 pr-8 text-xs bg-card/60 border-border/80"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground hover:text-foreground"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Endpoints List grouped by resource */}
              <div className="space-y-4 rounded-xl border border-border/70 bg-card/30 p-3 max-h-[calc(100vh-14rem)] overflow-y-auto">
                {endpointCategories.length === 0 ? (
                  <p className="text-center py-6 text-xs text-muted-foreground">
                    No endpoints match &quot;{searchQuery}&quot;
                  </p>
                ) : (
                  endpointCategories.map((group) => (
                    <div key={group.id} className="space-y-1.5">
                      <div className="flex items-center gap-1.5 px-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        {group.icon}
                        <span>{group.title}</span>
                      </div>
                      <div className="space-y-1">
                        {group.endpoints.map((ep) => {
                          const isSelected = selectedEndpointId === ep.id;
                          return (
                            <button
                              key={ep.id}
                              type="button"
                              onClick={() => setSelectedEndpointId(ep.id)}
                              className={cn(
                                "flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs transition-all cursor-pointer",
                                isSelected
                                  ? "bg-primary/20 font-bold text-primary border border-primary/30 shadow-xs"
                                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground border border-transparent",
                              )}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <MethodBadge method={ep.method} />
                                <span className="font-mono text-[11px] truncate text-foreground">
                                  {ep.path}
                                </span>
                              </div>
                              {ep.auth === "private" ? (
                                <Lock className="size-2.5 shrink-0 text-muted-foreground" />
                              ) : null}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Right Column: Detailed Endpoint Documentation */}
            <div className="space-y-6 lg:col-span-8 xl:col-span-9 min-w-0">
              <EndpointDetailView
                ep={selectedEndpoint}
                baseUrl={baseUrl}
                snippetKey={snippetKey}
                onSnippetKeyChange={setSnippetKey}
                lang={lang}
                onLangChange={setLang}
                onLaunchPlayground={() => launchInPlayground(selectedEndpoint.id)}
                copy={copy}
                copiedId={copiedId}
              />
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: LIVE API PLAYGROUND */}
        {/* ========================================================================= */}
        {activeTab === "playground" && (
          <div className="max-w-4xl mx-auto space-y-6">
            <LiveTester
              baseUrl={baseUrl}
              endpoints={DOC_ENDPOINTS}
              defaultKey={snippetKey}
              epId={liveEpId}
              onEpIdChange={setLiveEpId}
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: GUIDES & ARCHITECTURE */}
        {/* ========================================================================= */}
        {activeTab === "guides" && (
          <div className="space-y-8 max-w-4xl mx-auto">
            {/* Quickstart Flow */}
            <section className="space-y-4 rounded-2xl border border-border/80 bg-card/40 p-5 sm:p-6 backdrop-blur-md">
              <SectionHeading
                icon={<BookOpen className="size-4" />}
                title="3-Step Instant Key Delivery Guide"
                description="The standard workflow to automate sales and deliver digital license keys."
              />

              <div className="grid gap-3 sm:grid-cols-3 pt-2">
                {[
                  {
                    step: "01",
                    title: "Fetch SKUs & Stock",
                    method: "GET",
                    path: "/api/v1/products",
                    desc: "List active SKUs with wholesale prices & current available stock.",
                  },
                  {
                    step: "02",
                    title: "Check Wallet Balance",
                    method: "GET",
                    path: "/api/v1/balance",
                    desc: "Verify your available USD balance (in integer microcents) before ordering.",
                  },
                  {
                    step: "03",
                    title: "Fulfill & Deliver Keys",
                    method: "POST",
                    path: "/api/v1/orders",
                    desc: "Buy license keys atomically with Idempotency-Key. Receives keys[] instantly.",
                  },
                ].map((s) => (
                  <div
                    key={s.step}
                    className="flex flex-col justify-between rounded-xl border border-border/70 bg-background/60 p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex size-6 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
                        {s.step}
                      </span>
                      <MethodBadge method={s.method as "GET" | "POST"} />
                    </div>
                    <p className="text-sm font-bold text-foreground">{s.title}</p>
                    <p className="font-mono text-[11px] text-muted-foreground">{s.path}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Authentication & Security */}
            <section className="space-y-4 rounded-2xl border border-border/80 bg-card/40 p-5 sm:p-6 backdrop-blur-md">
              <SectionHeading
                icon={<KeyRound className="size-4" />}
                title="Authentication & Security Architecture"
                description="Bearer token authentication, rate limiting, and private key safety."
              />

              <AttrTable
                rows={[
                  {
                    name: "Authorization",
                    type: "HTTP Header",
                    required: true,
                    description: "Bearer drip_sk_live_… (or drip_sk_test_… for sandbox)",
                  },
                  {
                    name: "Public Rate Limit",
                    type: "IP Rate Limit",
                    required: false,
                    description: `${publicRateLimitRpm} RPM per IP address on public catalog endpoints`,
                  },
                  {
                    name: "Private Rate Limit",
                    type: "Key Rate Limit",
                    required: false,
                    description: `${privateRateLimitRpm} RPM per active key (elevated for VIP)`,
                  },
                ]}
              />

              <Callout variant="warning">
                <strong>Server-Side Only:</strong> Never embed your secret API key in browser JavaScript or mobile apps. Always route requests through your own backend server.
              </Callout>
            </section>

            {/* Money & Microcents Calculator */}
            <section className="space-y-4 rounded-2xl border border-border/80 bg-card/40 p-5 sm:p-6 backdrop-blur-md">
              <SectionHeading
                icon={<Calculator className="size-4" />}
                title="Money & Microcents Precision"
                description="All monetary amounts are integers in USD microcents: 1 USD = 100,000,000 microcents."
              />

              <div className="rounded-xl border border-border/80 bg-background/60 p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Interactive Live Calculator
                  </p>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    1 USD = 100,000,000 Microcents
                  </Badge>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">USD Amount ($)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-mono">$</span>
                      <Input
                        type="number"
                        step="0.01"
                        value={calcUsd}
                        onChange={(e) => handleUsdChange(e.target.value)}
                        className="pl-7 font-mono text-sm bg-card/60"
                        placeholder="1.00"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Microcents Integer</Label>
                    <Input
                      type="number"
                      value={calcMicrocents}
                      onChange={(e) => handleMicrocentsChange(e.target.value)}
                      className="font-mono text-sm bg-card/60"
                      placeholder="100000000"
                    />
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  Formula: <InlineCode>microcents = Math.round(usd * 100_000_000)</InlineCode> · <InlineCode>usd = (microcents / 100_000_000).toFixed(2)</InlineCode>
                </p>
              </div>

              <Callout variant="note">
                Response payloads also include convenient <InlineCode>*Usd</InlineCode> string helpers (e.g. <InlineCode>&quot;1.00&quot;</InlineCode>) for frontend display.
              </Callout>
            </section>

            {/* Webhooks Guide */}
            <section className="space-y-4 rounded-2xl border border-border/80 bg-card/40 p-5 sm:p-6 backdrop-blur-md">
              <SectionHeading
                icon={<Webhook className="size-4" />}
                title="Webhooks & Real-Time Fulfillment Events"
                description="Receive instant push notifications on your server when orders complete."
              />

              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Configure webhooks in your developer hub at <Link href="/app/development" className="text-primary underline-offset-2 hover:underline">/app/development</Link>. Every webhook payload is signed with HMAC-SHA256 for integrity verification.
              </p>

              <div className="space-y-3 rounded-xl border border-border/70 bg-background/60 p-4">
                <div className="grid gap-2 text-xs">
                  <div className="flex items-center justify-between rounded-lg bg-card/50 p-2 font-mono">
                    <span className="text-muted-foreground">X-Drip-Event</span>
                    <span className="text-emerald-400 font-bold">order.fulfilled</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-card/50 p-2 font-mono">
                    <span className="text-muted-foreground">X-Drip-Signature</span>
                    <span className="text-accent font-bold">sha256_hex_hash</span>
                  </div>
                </div>

                <pre className={cn("rounded-lg border border-border/60 bg-card/80 p-3 text-[11px] font-mono leading-relaxed overflow-x-auto", styles.codePanel)}>
{`// Webhook Payload Schema (order.fulfilled)
{
  "event": "order.fulfilled",
  "data": {
    "id": "ord_01HXYZ...",
    "sku": "SANDBOX-DEMO-30D",
    "status": "FULFILLED",
    "quantity": 1,
    "keys": ["XXXX-YYYY-ZZZZ"],
    "totalUsd": "1.00",
    "createdAt": "2026-10-05T06:00:00.000Z"
  }
}`}
                </pre>
              </div>
            </section>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: SDKS & DOWNLOADS */}
        {/* ========================================================================= */}
        {activeTab === "sdks" && (
          <div className="space-y-8 max-w-4xl mx-auto">
            <div className="grid gap-4 sm:grid-cols-2">
              {SDK_PACKS.map((pack) => (
                <div
                  key={pack.id}
                  className="flex flex-col justify-between rounded-2xl border border-border/70 bg-card/40 p-5 backdrop-blur-md transition-all hover:border-primary/40 hover:bg-card/60"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-foreground flex items-center gap-2">
                        <FileCode2 className="size-4 text-primary" />
                        {pack.label}
                      </span>
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {pack.filename}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {pack.description}
                    </p>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2 pt-3 border-t border-border/40">
                    <Button asChild size="sm" className="gap-1.5 shadow-xs">
                      <a href={`/api/v1/sdk/${pack.id}`} download>
                        <Download className="size-3.5" />
                        Download SDK
                      </a>
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setLang(pack.id);
                        setActiveTab("reference");
                      }}
                      className="gap-1.5"
                    >
                      <Code2 className="size-3.5" />
                      View Snippet
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Error Codes Matrix */}
            <section className="space-y-4 rounded-2xl border border-border/80 bg-card/40 p-5 sm:p-6 backdrop-blur-md">
              <SectionHeading
                icon={<AlertTriangle className="size-4" />}
                title="Error Codes Matrix"
                description="Standardized error response envelope: { error: { code: string, message: string } }"
              />
              <StatusTable rows={DOC_ERRORS} />
            </section>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: AI PROMPT PACKS */}
        {/* ========================================================================= */}
        {activeTab === "ai" && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className="rounded-2xl border border-border/80 bg-card/40 p-5 sm:p-6 backdrop-blur-md space-y-4">
              <SectionHeading
                icon={<Bot className="size-4" />}
                title="AI Integration Prompt Generator"
                description="Feed these verified specifications into Cursor, Claude, ChatGPT, or Gemini to auto-generate perfect clients."
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Select AI Prompt Mode</Label>
                  <Select
                    value={aiPack}
                    onValueChange={(v) => setAiPack(v as AiPromptPack)}
                  >
                    <SelectTrigger className="bg-card/60 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AI_PROMPT_PACKS.map((p) => (
                        <SelectItem key={p.id} value={p.id} className="text-xs">
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Optional API Key in Prompt</Label>
                  <Input
                    value={aiKey}
                    onChange={(e) => setAiKey(e.target.value)}
                    placeholder="drip_sk_live_… (optional)"
                    className="font-mono text-xs bg-card/60"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="gap-1.5"
                  onClick={() => copy(aiPrompt, "AI Prompt copied to clipboard", "ai-tab")}
                >
                  {copiedId === "ai-tab" ? (
                    <Check className="size-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="size-3.5" />
                  )}
                  {copiedId === "ai-tab" ? "Copied" : "Copy Prompt"}
                </Button>
                <Button asChild size="sm" variant="outline" className="gap-1.5">
                  <a
                    href={`/api/v1/ai-prompt?pack=${encodeURIComponent(aiPack)}${
                      aiKey.trim() ? `&key=${encodeURIComponent(aiKey.trim())}` : ""
                    }`}
                    download
                  >
                    <Download className="size-3.5" />
                    Download .md
                  </a>
                </Button>
              </div>

              <pre
                className={cn(
                  "max-h-96 overflow-auto rounded-xl border border-border/80 bg-background/80 p-4 text-xs leading-relaxed font-mono",
                  styles.codePanel,
                )}
              >
                {aiPrompt}
              </pre>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

{/* Endpoint Detail View Component */}
function EndpointDetailView({
  ep,
  baseUrl,
  snippetKey,
  onSnippetKeyChange,
  lang,
  onLangChange,
  onLaunchPlayground,
  copy,
  copiedId,
}: {
  ep: DocEndpoint;
  baseUrl: string;
  snippetKey: string;
  onSnippetKeyChange: (v: string) => void;
  lang: SnippetLang;
  onLangChange: (v: SnippetLang) => void;
  onLaunchPlayground: () => void;
  copy: (text: string, label?: string, id?: string) => void;
  copiedId: string | null;
}) {
  const [demoTab, setDemoTab] = useState<DemoTab>("response");

  const fullUrl = `${baseUrl}${ep.pathExample ?? ep.path}${
    ep.queryExample ? `?${ep.queryExample}` : ""
  }`;

  const snippet = useMemo(
    () =>
      buildSnippet(
        lang,
        ep,
        baseUrl,
        snippetKey.trim() || "drip_sk_live_YOUR_KEY",
      ),
    [lang, ep, baseUrl, snippetKey],
  );

  const demoJson =
    demoTab === "request"
      ? ep.exampleRequest ?? { note: "No request body required" }
      : demoTab === "error"
        ? ep.exampleError ?? {
            error: { code: "ERROR", message: "See status codes below." },
          }
        : ep.exampleResponse;

  return (
    <article className="space-y-6 rounded-2xl border border-border/80 bg-card/40 p-5 sm:p-6 backdrop-blur-md">
      {/* Header Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between border-b border-border/50 pb-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <MethodBadge method={ep.method} />
            <span className="font-mono text-sm sm:text-base font-bold text-foreground">
              {ep.path}
            </span>
            <button
              type="button"
              onClick={() => copy(fullUrl, "Endpoint URL copied", "url-btn")}
              className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/60 hover:text-foreground cursor-pointer"
              title="Copy endpoint URL"
            >
              {copiedId === "url-btn" ? (
                <Check className="size-3 text-emerald-400" />
              ) : (
                <Copy className="size-3" />
              )}
            </button>
            {ep.auth === "private" ? (
              <Badge variant="secondary" className="gap-1 text-[10px] font-medium">
                <Lock className="size-2.5" />
                Private Bearer
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] font-medium text-emerald-400 border-emerald-500/30 bg-emerald-500/5">
                Public No-Auth
              </Badge>
            )}
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{ep.summary}</p>
        </div>

        <Button
          type="button"
          size="sm"
          onClick={onLaunchPlayground}
          className="gap-1.5 shrink-0 shadow-xs border-primary/30 text-primary hover:bg-primary/10"
          variant="outline"
        >
          <FlaskConical className="size-3.5" />
          Test in Playground
        </Button>
      </div>

      {/* Warnings if any */}
      {ep.warnings?.map((w) => (
        <Callout key={w} variant="warning">
          {w}
        </Callout>
      ))}

      {/* Two Column Layout: Parameters & Specs on Left, Code & Responses on Right */}
      <div className="grid gap-6 xl:grid-cols-12 min-w-0">
        {/* Left Side: Parameters & Headers */}
        <div className="space-y-5 xl:col-span-6 min-w-0">
          {ep.headers && ep.headers.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Headers
              </h4>
              <AttrTable rows={ep.headers} />
            </div>
          )}

          {ep.params && ep.params.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Query / Path Parameters
              </h4>
              <AttrTable rows={ep.params} />
            </div>
          )}

          {ep.bodyParams && ep.bodyParams.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                JSON Request Body
              </h4>
              <AttrTable rows={ep.bodyParams} />
            </div>
          )}

          {ep.statuses && ep.statuses.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Status Codes
              </h4>
              <StatusTable rows={ep.statuses} />
            </div>
          )}
        </div>

        {/* Right Side: Code Snippet & Live Response Explorer */}
        <div className="space-y-4 xl:col-span-6 min-w-0">
          {/* Language Snippet Card */}
          <div className="rounded-xl border border-border/80 bg-background/60 p-3.5 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-2">
              <div className="flex flex-wrap gap-1">
                {SNIPPET_LANGS.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => onLangChange(l.id)}
                    className={cn(
                      "rounded-md px-2 py-0.5 text-[10px] font-semibold transition-all cursor-pointer",
                      lang === l.id
                        ? "bg-primary/20 text-primary shadow-xs"
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                    )}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-[10px] gap-1"
                onClick={() => copy(snippet, "Snippet copied", "snippet-copy")}
              >
                {copiedId === "snippet-copy" ? (
                  <Check className="size-3 text-emerald-400" />
                ) : (
                  <Copy className="size-3" />
                )}
                {copiedId === "snippet-copy" ? "Copied" : "Copy"}
              </Button>
            </div>
            <pre
              className={cn(
                "max-h-64 overflow-auto text-[11px] font-mono leading-relaxed pt-1 text-foreground/90",
                styles.codePanel,
              )}
            >
              {snippet}
            </pre>
          </div>

          {/* Response Inspector Card */}
          <div className="rounded-xl border border-border/80 bg-background/60 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between border-b border-border/50 pb-2">
              <div className="flex items-center gap-1">
                {(
                  [
                    ["response", "200 Success"],
                    ["error", "4xx Error"],
                    ["request", "Request Body"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setDemoTab(id)}
                    className={cn(
                      "rounded-md px-2 py-0.5 text-[10px] font-semibold transition-all cursor-pointer",
                      demoTab === id
                        ? "bg-primary/20 text-primary shadow-xs"
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-[10px] gap-1"
                onClick={() => copy(JSON.stringify(demoJson, null, 2), "JSON copied", "json-copy")}
              >
                {copiedId === "json-copy" ? (
                  <Check className="size-3 text-emerald-400" />
                ) : (
                  <Copy className="size-3" />
                )}
                {copiedId === "json-copy" ? "Copied" : "Copy"}
              </Button>
            </div>
            <pre
              className={cn(
                "max-h-64 overflow-auto text-[11px] font-mono leading-relaxed pt-1 text-foreground/90",
                styles.codePanel,
              )}
            >
              {JSON.stringify(demoJson, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </article>
  );
}

{/* Live Playground Console Component */}
function LiveTester({
  baseUrl,
  endpoints,
  defaultKey,
  epId,
  onEpIdChange,
}: {
  baseUrl: string;
  endpoints: DocEndpoint[];
  defaultKey: string;
  epId: string;
  onEpIdChange: (id: string) => void;
}) {
  const [apiKey, setApiKey] = useState(defaultKey);
  const [showKey, setShowKey] = useState(false);
  const [pathCode, setPathCode] = useState("SANDBOX-DEMO");
  const [orderId, setOrderId] = useState("");
  const [sku, setSku] = useState("SANDBOX-DEMO-30D");
  const [body, setBody] = useState(
    JSON.stringify({ sku: "SANDBOX-DEMO-30D", quantity: 1 }, null, 2),
  );
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<number | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [result, setResult] = useState("");

  const ep = endpoints.find((e) => e.id === epId) ?? endpoints[0]!;

  async function run() {
    setLoading(true);
    setResult("");
    setStatus(null);
    setLatencyMs(null);
    const start = performance.now();
    try {
      const path = testerPath(ep, {
        pathCode,
        orderId: orderId || "ORDER_ID",
        duration: sku,
      });
      const headers: Record<string, string> = {
        Accept: "application/json",
      };
      if (ep.auth === "private") {
        headers.Authorization = `Bearer ${apiKey.trim()}`;
      }
      let init: RequestInit = { method: ep.method, headers };
      if (ep.method === "POST") {
        headers["Content-Type"] = "application/json";
        headers["Idempotency-Key"] =
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `drip_${Date.now()}`;
        init = { ...init, body };
      }
      const res = await fetch(`${baseUrl}${path}`, init);
      const text = await res.text();
      const end = performance.now();
      setLatencyMs(Math.round(end - start));
      setStatus(res.status);

      let pretty = text;
      try {
        pretty = JSON.stringify(JSON.parse(text), null, 2);
      } catch {
        /* keep raw */
      }
      setResult(pretty);
    } catch (e) {
      const end = performance.now();
      setLatencyMs(Math.round(end - start));
      setStatus(0);
      setResult(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  const formatJsonBody = () => {
    try {
      setBody(JSON.stringify(JSON.parse(body), null, 2));
      toast.success("JSON formatted");
    } catch {
      toast.error("Invalid JSON syntax");
    }
  };

  return (
    <div className={cn("space-y-5 rounded-2xl border border-border/80 bg-card/50 p-5 sm:p-6 backdrop-blur-md shadow-lg", styles.playgroundGlow)}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-4">
        <SectionHeading
          icon={<FlaskConical className="size-4" />}
          title="Interactive Live Playground"
          description="Send live API requests directly from your browser. Secret keys stay on your client."
        />
        <Badge variant="outline" className="gap-1.5 font-mono text-xs border-primary/30 text-primary">
          <Terminal className="size-3.5" />
          Browser Console
        </Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Endpoint Selector */}
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-xs font-semibold text-foreground">Select Endpoint</Label>
          <Select value={epId} onValueChange={onEpIdChange}>
            <SelectTrigger className="bg-background/80 font-mono text-xs h-10 border-border/80">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {endpoints.map((e) => (
                <SelectItem key={e.id} value={e.id} className="font-mono text-xs">
                  {e.method} {e.path} — {e.summary}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Bearer Token for private endpoints */}
        {ep.auth === "private" && (
          <div className="space-y-1.5 sm:col-span-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-foreground">Bearer API Key Token</Label>
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
              >
                {showKey ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
                {showKey ? "Hide" : "Show"}
              </button>
            </div>
            <Input
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="drip_sk_live_… or drip_sk_test_…"
              className="font-mono text-xs bg-background/80 h-10"
            />
          </div>
        )}

        {/* Dynamic Parameter inputs */}
        {ep.id === "product" && (
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">Path param: code</Label>
            <Input
              value={pathCode}
              onChange={(e) => setPathCode(e.target.value)}
              className="font-mono text-xs bg-background/80"
              placeholder="SANDBOX-DEMO"
            />
          </div>
        )}

        {(ep.id === "pricing" || ep.id === "stock") && (
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">Query param: sku</Label>
            <Input
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              className="font-mono text-xs bg-background/80"
              placeholder="SANDBOX-DEMO-30D"
            />
          </div>
        )}

        {ep.id === "orders-get" && (
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">Path param: order id</Label>
            <Input
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              className="font-mono text-xs bg-background/80"
              placeholder="ord_..."
            />
          </div>
        )}

        {/* JSON Body editor for POST */}
        {ep.method === "POST" && (
          <div className="space-y-1.5 sm:col-span-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-foreground">JSON Request Body</Label>
              <button
                type="button"
                onClick={formatJsonBody}
                className="text-[11px] text-primary hover:underline cursor-pointer"
              >
                Format JSON
              </button>
            </div>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              className="font-mono text-xs bg-background/80 leading-relaxed"
            />
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-3 pt-2">
        <Button
          type="button"
          size="default"
          onClick={() => void run()}
          disabled={loading}
          className="gap-2 shadow-md shadow-primary/20"
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Play className="size-4" />
          )}
          Send Request
        </Button>
        <Button
          type="button"
          size="default"
          variant="outline"
          onClick={() => {
            setResult("");
            setStatus(null);
            setLatencyMs(null);
          }}
          className="gap-1.5"
        >
          <RefreshCw className="size-3.5" />
          Reset
        </Button>
      </div>

      {/* Live Response Panel */}
      {status !== null && (
        <div className="space-y-2 rounded-xl border border-border/80 bg-background/80 p-4 transition-all">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-foreground uppercase tracking-wider">Response</span>
              <Badge
                className={cn(
                  "font-mono text-xs font-bold",
                  status >= 200 && status < 300
                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                    : status === 429 || status === 409
                      ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                      : "bg-destructive/20 text-rose-400 border-destructive/30",
                )}
              >
                {status === 0 ? "Network Error" : `${status} ${status === 200 ? "OK" : ""}`}
              </Badge>
              {latencyMs !== null && (
                <span className="text-xs text-muted-foreground font-mono flex items-center gap-1">
                  <Timer className="size-3" />
                  {latencyMs}ms
                </span>
              )}
            </div>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 text-xs gap-1 cursor-pointer"
              onClick={() => {
                void navigator.clipboard.writeText(result);
                toast.success("Response copied");
              }}
            >
              <Copy className="size-3" />
              Copy
            </Button>
          </div>
          <pre
            className={cn(
              "max-h-96 overflow-auto text-xs font-mono leading-relaxed pt-2",
              styles.codePanel,
            )}
          >
            {result}
          </pre>
        </div>
      )}
    </div>
  );
}

function SectionHeading({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-primary shadow-xs">
          {icon}
        </span>
        <h2 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">{title}</h2>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

function MethodBadge({ method }: { method: "GET" | "POST" }) {
  return (
    <Badge
      className={cn(
        "font-mono text-[10px] font-bold px-1.5 py-0 shadow-xs border",
        method === "GET"
          ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/15"
          : "bg-sky-500/15 text-sky-400 border-sky-500/30 hover:bg-sky-500/15",
      )}
    >
      {method}
    </Badge>
  );
}

function InlineCode({ children }: { children: ReactNode }) {
  return (
    <code className="rounded-md border border-border/60 bg-muted/60 px-1.5 py-0.5 font-mono text-[0.8em] font-semibold text-foreground">
      {children}
    </code>
  );
}

function Callout({
  variant,
  children,
}: {
  variant: "note" | "warning";
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex gap-3 rounded-xl border p-3.5 text-xs sm:text-sm leading-relaxed backdrop-blur-md",
        variant === "warning"
          ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
          : "border-primary/30 bg-primary/10 text-foreground",
      )}
    >
      {variant === "warning" ? (
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-400" />
      ) : (
        <Info className="mt-0.5 size-4 shrink-0 text-primary" />
      )}
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function AttrTable({ rows }: { rows: DocParam[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border/70 bg-card/30">
      <table className="w-full min-w-[20rem] text-left text-xs">
        <thead className="border-b border-border/60 bg-muted/40 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-3 py-2">Attribute</th>
            <th className="px-3 py-2">Type</th>
            <th className="px-3 py-2">Required</th>
            <th className="px-3 py-2">Description</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40">
          {rows.map((r) => (
            <tr key={r.name} className="hover:bg-muted/30 transition-colors">
              <td className="px-3 py-2 font-mono font-semibold text-foreground">{r.name}</td>
              <td className="px-3 py-2 text-muted-foreground font-mono">{r.type}</td>
              <td className="px-3 py-2">
                {r.required ? (
                  <Badge variant="secondary" className="text-[10px] px-1 py-0 bg-primary/15 text-primary">
                    yes
                  </Badge>
                ) : (
                  <span className="text-[10px] text-muted-foreground">no</span>
                )}
              </td>
              <td className="px-3 py-2 text-muted-foreground leading-relaxed">{r.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusTable({ rows }: { rows: DocStatus[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border/70 bg-card/30">
      <table className="w-full min-w-[20rem] text-left text-xs">
        <thead className="border-b border-border/60 bg-muted/40 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-3 py-2">HTTP</th>
            <th className="px-3 py-2">Code</th>
            <th className="px-3 py-2">When</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40">
          {rows.map((r) => (
            <tr
              key={`${r.http}-${r.code}-${r.when}`}
              className="hover:bg-muted/30 transition-colors"
            >
              <td className="px-3 py-2 font-mono">
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] font-bold font-mono",
                    r.http === 200
                      ? "text-emerald-400 border-emerald-500/30"
                      : r.http >= 400 && r.http < 500
                        ? "text-amber-400 border-amber-500/30"
                        : "text-rose-400 border-rose-500/30",
                  )}
                >
                  {r.http}
                </Badge>
              </td>
              <td className="px-3 py-2 font-mono font-bold text-foreground">{r.code}</td>
              <td className="px-3 py-2 text-muted-foreground leading-relaxed">{r.when}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
