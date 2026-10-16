/** Platform API docs catalog — GitBook-style reference metadata (single source of truth). */

export type DocMethod = "GET" | "POST";
export type DocAuth = "public" | "private";
export type SnippetLang = "curl" | "python" | "node" | "php" | "go";
export type AiPromptPack =
  | "full"
  | "wire"
  | "python"
  | "node"
  | "php"
  | "go";

export type DocParam = {
  name: string;
  type: string;
  required: boolean;
  description: string;
};

export type DocStatus = {
  http: number;
  code: string;
  when: string;
};

export type DocExampleRequest = {
  headers?: Record<string, string>;
  query?: Record<string, string>;
  pathParams?: Record<string, string>;
  body?: Record<string, unknown>;
};

export type DocEndpoint = {
  id: string;
  method: DocMethod;
  path: string;
  auth: DocAuth;
  scope: string;
  summary: string;
  group: "products" | "wallet" | "orders";
  params?: DocParam[];
  headers?: DocParam[];
  bodyParams?: DocParam[];
  body?: Record<string, unknown>;
  queryExample?: string;
  pathExample?: string;
  exampleRequest?: DocExampleRequest;
  exampleResponse: Record<string, unknown>;
  exampleError?: Record<string, unknown>;
  statuses?: DocStatus[];
  warnings?: string[];
};

export const API_MONEY_DOCS = {
  unit: "USD_MICROCENTS",
  perUsd: 100_000_000,
  formula: "usd = amount / 100_000_000",
  examples: [
    { microcents: 100_000_000, usd: "1.00" },
    { microcents: 50_000_000, usd: "0.50" },
  ],
  warning:
    "Do not divide by 100 (bank cents). This API uses microcents: 1 USD = 100_000_000. Prefer *Usd helper strings for display.",
};

const AUTH_BEARER_HEADER: DocParam = {
  name: "Authorization",
  type: "string",
  required: true,
  description: "Bearer drip_sk_live_… or drip_sk_test_…",
};

const ORDER_DETAIL_DEMO = {
  id: "ord_demo_01HXYZ",
  status: "FULFILLED",
  sku: "SANDBOX-DEMO-30D",
  quantity: 1,
  price: 100_000_000,
  priceUsd: "1.00",
  total: 100_000_000,
  totalUsd: "1.00",
  currency: "USD",
  keys: ["XXXX-YYYY-ZZZZ"],
  items: [
    {
      name: "Sandbox Demo Product — 30 Days",
      key: "XXXX-YYYY-ZZZZ",
      price: 100_000_000,
      priceUsd: "1.00",
    },
  ],
  createdAt: "2026-07-29T12:00:00.000Z",
  durationApiCode: "SANDBOX-DEMO-30D",
  subtotalMicrocents: 100_000_000,
  totalMicrocents: 100_000_000,
};

const SKU_ITEM_DEMO = {
  apiCode: "SANDBOX-DEMO-30D",
  name: "Sandbox Demo Product — 30 Days",
  product: "Sandbox Demo Product",
  productApiCode: "SANDBOX-DEMO",
  category: "Sandbox",
  label: "30 Days",
  days: 30,
  price: 100_000_000,
  priceUsd: "1.00",
  currency: "USD",
  stock: 999,
  inStock: true,
  priceTier: "retail",
  requires_android_id: false,
  is_maintenance: false,
};

export const DOC_NAV = [
  {
    id: "overview",
    label: "Overview",
    children: [
      { id: "get-started", label: "Get started" },
      { id: "auth", label: "Authentication" },
      { id: "money", label: "Money & microcents" },
      { id: "pricing-rules", label: "Pricing rules" },
      { id: "security", label: "Security & limits" },
      { id: "webhooks", label: "Webhooks" },
    ],
  },
  {
    id: "resources",
    label: "API reference",
    children: [
      { id: "ep-products", label: "Products" },
      { id: "ep-pricing", label: "Pricing" },
      { id: "ep-stock", label: "Stock" },
      { id: "ep-me", label: "Me" },
      { id: "ep-balance", label: "Balance" },
      { id: "ep-orders", label: "Orders" },
    ],
  },
  {
    id: "tooling",
    label: "Tooling",
    children: [
      { id: "sdks", label: "SDKs & downloads" },
      { id: "errors", label: "Errors" },
      { id: "samples", label: "Code samples" },
      { id: "live", label: "Live tester" },
    ],
  },
  {
    id: "ai-section",
    label: "AI",
    children: [
      { id: "ai-full", label: "Full API prompt" },
      { id: "ai-wire", label: "Wire my site" },
      { id: "ai-lang", label: "Language prompts" },
    ],
  },
] as const;

export const DOC_ENDPOINTS: DocEndpoint[] = [
  {
    id: "products",
    method: "GET",
    path: "/api/v1/products",
    auth: "public",
    scope: "none (public)",
    group: "products",
    summary:
      "Flat buyable SKU catalog. Public returns retail price. With Bearer, price is your account tier.",
    warnings: [
      "Use items[].apiCode as sku when buying. Product apiCode alone is not a SKU.",
      "Public responses never include wholesale prices.",
    ],
    exampleRequest: {
      headers: { Accept: "application/json" },
    },
    exampleResponse: {
      data: {
        money: { unit: "USD_MICROCENTS", perUsd: 100_000_000 },
        priceTier: "retail",
        items: [SKU_ITEM_DEMO],
      },
    },
    exampleError: {
      error: {
        code: "BUSY",
        message: "Too many requests. Retry shortly.",
      },
    },
    statuses: [
      { http: 200, code: "OK", when: "Catalog returned" },
      { http: 429, code: "BUSY", when: "Public IP rate limit exceeded" },
    ],
  },
  {
    id: "product",
    method: "GET",
    path: "/api/v1/products/{code}",
    pathExample: "/api/v1/products/SANDBOX-DEMO",
    auth: "public",
    scope: "none (public)",
    group: "products",
    summary:
      "Product detail by product apiCode or single SKU apiCode. Returns product meta + items[].",
    params: [
      {
        name: "code",
        type: "string",
        required: true,
        description: "Product apiCode or SKU apiCode",
      },
    ],
    exampleRequest: {
      headers: { Accept: "application/json" },
      pathParams: { code: "SANDBOX-DEMO" },
    },
    exampleResponse: {
      data: {
        product: {
          apiCode: "SANDBOX-DEMO",
          title: "Sandbox Demo Product",
          description: "Fake catalog item for sandbox keys.",
          imageUrl: null,
          category: "Sandbox",
        },
        items: [SKU_ITEM_DEMO],
        money: { unit: "USD_MICROCENTS", perUsd: 100_000_000 },
        priceTier: "retail",
      },
    },
    exampleError: {
      error: {
        code: "NOT_FOUND",
        message: "Product not found. Call GET /api/v1/products for apiCodes.",
      },
    },
    statuses: [
      { http: 200, code: "OK", when: "Found" },
      { http: 404, code: "NOT_FOUND", when: "Unknown code" },
    ],
  },
  {
    id: "pricing",
    method: "GET",
    path: "/api/v1/pricing",
    queryExample: "sku=SANDBOX-DEMO-30D",
    auth: "public",
    scope: "none (public)",
    group: "products",
    summary:
      "Price for one SKU. Optional Bearer uses your tier. Alias query: duration=",
    params: [
      {
        name: "sku",
        type: "string",
        required: true,
        description: "SKU apiCode (alias: duration)",
      },
    ],
    exampleRequest: {
      headers: { Accept: "application/json" },
      query: { sku: "SANDBOX-DEMO-30D" },
    },
    exampleResponse: {
      data: {
        apiCode: "SANDBOX-DEMO-30D",
        name: "Sandbox Demo Product — 30 Days",
        price: 100_000_000,
        priceUsd: "1.00",
        currency: "USD",
        stock: 999,
        inStock: true,
        priceTier: "retail",
        requires_android_id: false,
        is_maintenance: false,
      },
    },
    exampleError: {
      error: {
        code: "UNKNOWN_DURATION",
        message:
          "Unknown SKU. Call GET /api/v1/products and use items[].apiCode.",
      },
    },
    statuses: [
      { http: 200, code: "OK", when: "Price returned" },
      { http: 404, code: "UNKNOWN_DURATION", when: "Unknown SKU" },
      { http: 429, code: "BUSY", when: "Rate limited" },
    ],
  },
  {
    id: "stock",
    method: "GET",
    path: "/api/v1/stock",
    queryExample: "sku=SANDBOX-DEMO-30D",
    auth: "public",
    scope: "none (public)",
    group: "products",
    summary: "Live stock for one SKU. Alias query: duration=",
    params: [
      {
        name: "sku",
        type: "string",
        required: true,
        description: "SKU apiCode (alias: duration)",
      },
    ],
    exampleRequest: {
      headers: { Accept: "application/json" },
      query: { sku: "SANDBOX-DEMO-30D" },
    },
    exampleResponse: {
      data: {
        apiCode: "SANDBOX-DEMO-30D",
        stock: 999,
        inStock: true,
        busy: false,
        is_maintenance: false,
      },
    },
    exampleError: {
      error: {
        code: "UNKNOWN_DURATION",
        message:
          "Unknown SKU. Call GET /api/v1/products and use items[].apiCode.",
      },
    },
    statuses: [
      { http: 200, code: "OK", when: "Stock returned" },
      { http: 404, code: "UNKNOWN_DURATION", when: "Unknown SKU" },
      { http: 429, code: "BUSY", when: "Rate limited" },
    ],
  },
  {
    id: "me",
    method: "GET",
    path: "/api/v1/me",
    auth: "private",
    scope: "any active key",
    group: "wallet",
    summary: "Account role, priceTier, RPM, and key metadata.",
    headers: [AUTH_BEARER_HEADER],
    exampleRequest: {
      headers: {
        Accept: "application/json",
        Authorization: "Bearer drip_sk_test_YOUR_KEY",
      },
    },
    exampleResponse: {
      data: {
        username: "demo_seller",
        role: "SELLER",
        priceTier: "wholesale",
        rateLimitRpm: 300,
        sandbox: false,
        money: { unit: "USD_MICROCENTS", perUsd: 100_000_000 },
        key: {
          id: "key_demo",
          name: "Production",
          prefix: "drip_sk_live_",
          mode: "LIVE",
          scopes: ["balance:read", "orders:read", "orders:write"],
        },
      },
    },
    exampleError: {
      error: {
        code: "UNAUTHORIZED",
        message: "Missing or invalid API key.",
      },
    },
    statuses: [
      { http: 200, code: "OK", when: "Authenticated" },
      { http: 401, code: "UNAUTHORIZED", when: "Missing or invalid key" },
    ],
  },
  {
    id: "balance",
    method: "GET",
    path: "/api/v1/balance",
    auth: "private",
    scope: "balance:read",
    group: "wallet",
    summary: "Wallet balance (microcents + balanceUsd).",
    headers: [AUTH_BEARER_HEADER],
    exampleRequest: {
      headers: {
        Accept: "application/json",
        Authorization: "Bearer drip_sk_test_YOUR_KEY",
      },
    },
    exampleResponse: {
      data: {
        balance: 2_500_000_000,
        balanceUsd: "25.00",
        currency: "USD",
      },
    },
    exampleError: {
      error: {
        code: "UNAUTHORIZED",
        message: "Missing or invalid API key.",
      },
    },
    statuses: [
      { http: 200, code: "OK", when: "Balance returned" },
      { http: 401, code: "UNAUTHORIZED", when: "Missing or invalid key" },
      { http: 403, code: "FORBIDDEN", when: "Missing balance:read scope" },
    ],
  },
  {
    id: "orders-create",
    method: "POST",
    path: "/api/v1/orders",
    auth: "private",
    scope: "orders:write",
    group: "orders",
    summary:
      "Buy keys for one SKU. Debits wallet (role price). Returns keys[].",
    warnings: [
      "Idempotency-Key header is required.",
      "Never send price in the body — the API ignores client prices.",
      "Key codes appear only on create and GET /orders/{id}, never on the list.",
    ],
    headers: [
      AUTH_BEARER_HEADER,
      {
        name: "Idempotency-Key",
        type: "string",
        required: true,
        description:
          "UUID recommended. Same key retries return the same result.",
      },
    ],
    bodyParams: [
      {
        name: "sku",
        type: "string",
        required: true,
        description: "SKU from items[].apiCode (alias: duration)",
      },
      {
        name: "quantity",
        type: "integer",
        required: false,
        description: "1–50, default 1",
      },
    ],
    body: { sku: "SANDBOX-DEMO-30D", quantity: 1 },
    exampleRequest: {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: "Bearer drip_sk_test_YOUR_KEY",
        "Idempotency-Key": "550e8400-e29b-41d4-a716-446655440000",
      },
      body: { sku: "SANDBOX-DEMO-30D", quantity: 1 },
    },
    exampleResponse: {
      data: ORDER_DETAIL_DEMO,
    },
    exampleError: {
      error: {
        code: "INSUFFICIENT_BALANCE",
        message: "Wallet balance is too low for this purchase.",
      },
    },
    statuses: [
      { http: 200, code: "OK", when: "Fulfilled" },
      {
        http: 400,
        code: "IDEMPOTENCY_REQUIRED",
        when: "Missing Idempotency-Key",
      },
      { http: 402, code: "INSUFFICIENT_BALANCE", when: "Wallet too low" },
      { http: 409, code: "BUSY", when: "Out of stock" },
      { http: 429, code: "BUSY", when: "Rate limited" },
    ],
  },
  {
    id: "orders-list",
    method: "GET",
    path: "/api/v1/orders",
    queryExample: "page=1&limit=20",
    auth: "private",
    scope: "orders:read",
    group: "orders",
    summary:
      "Paginated order history. List rows never include key codes (keysCount only).",
    headers: [AUTH_BEARER_HEADER],
    params: [
      {
        name: "page",
        type: "integer",
        required: false,
        description: "Page number, default 1",
      },
      {
        name: "limit",
        type: "integer",
        required: false,
        description: "Page size 1–50, default 20",
      },
    ],
    warnings: [
      "Full key codes are only on POST create and GET /orders/{id}.",
    ],
    exampleRequest: {
      headers: {
        Accept: "application/json",
        Authorization: "Bearer drip_sk_test_YOUR_KEY",
      },
      query: { page: "1", limit: "20" },
    },
    exampleResponse: {
      data: {
        page: 1,
        limit: 20,
        total: 3,
        hasMore: false,
        items: [
          {
            id: "ord_demo_01HXYZ",
            status: "FULFILLED",
            sku: "SANDBOX-DEMO-30D",
            name: "Sandbox Demo Product — 30 Days",
            quantity: 1,
            total: 101_000_000,
            totalUsd: "1.01",
            keysCount: 1,
            createdAt: "2026-07-29T12:00:00.000Z",
          },
        ],
      },
    },
    exampleError: {
      error: {
        code: "UNAUTHORIZED",
        message: "Missing or invalid API key.",
      },
    },
    statuses: [
      { http: 200, code: "OK", when: "List returned" },
      { http: 401, code: "UNAUTHORIZED", when: "Missing or invalid key" },
    ],
  },
  {
    id: "orders-get",
    method: "GET",
    path: "/api/v1/orders/{id}",
    pathExample: "/api/v1/orders/ord_demo_01HXYZ",
    auth: "private",
    scope: "orders:read",
    group: "orders",
    summary: "Order detail including keys[] for an order you own.",
    headers: [AUTH_BEARER_HEADER],
    params: [
      {
        name: "id",
        type: "string",
        required: true,
        description: "Order id from create or list",
      },
    ],
    exampleRequest: {
      headers: {
        Accept: "application/json",
        Authorization: "Bearer drip_sk_test_YOUR_KEY",
      },
      pathParams: { id: "ord_demo_01HXYZ" },
    },
    exampleResponse: {
      data: ORDER_DETAIL_DEMO,
    },
    exampleError: {
      error: {
        code: "NOT_FOUND",
        message: "Order not found.",
      },
    },
    statuses: [
      { http: 200, code: "OK", when: "Order owned by key holder" },
      { http: 404, code: "NOT_FOUND", when: "Unknown or not owned" },
    ],
  },
];

export const DOC_ERRORS: DocStatus[] = [
  {
    http: 400,
    code: "IDEMPOTENCY_REQUIRED",
    when: "POST /orders is missing the required Idempotency-Key header",
  },
  {
    http: 400,
    code: "DURATION_REQUIRED",
    when: "Sent a product apiCode instead of a specific SKU apiCode (items[].apiCode)",
  },
  {
    http: 400,
    code: "PRODUCT_MAINTENANCE",
    when: "The requested product is currently undergoing temporary maintenance",
  },
  {
    http: 400,
    code: "PRICE_MISSING",
    when: "No USD price is configured for this specific SKU",
  },
  {
    http: 400,
    code: "INVALID_QTY",
    when: "Purchase quantity is outside the allowed range (1–50 keys per order)",
  },
  {
    http: 401,
    code: "UNAUTHORIZED",
    when: "Missing, malformed, or invalid Bearer API key in Authorization header",
  },
  {
    http: 402,
    code: "INSUFFICIENT_BALANCE",
    when: "Account wallet balance cannot cover the required purchase price",
  },
  {
    http: 403,
    code: "FORBIDDEN",
    when: "API key lacks required scope, account is disabled/banned, or role not permitted",
  },
  {
    http: 404,
    code: "NOT_FOUND",
    when: "Target product, SKU, or order ID does not exist or is not owned by key holder",
  },
  {
    http: 404,
    code: "UNKNOWN_DURATION",
    when: "Unrecognized SKU apiCode. Call GET /api/v1/products to fetch valid SKUs",
  },
  {
    http: 409,
    code: "BUSY",
    when: "Product SKU is temporarily out of stock (no available keys in inventory/supplier)",
  },
  {
    http: 429,
    code: "BUSY",
    when: "Rate limit exceeded (100 RPM per IP on public / 300 RPM on private keys)",
  },
];

export const SNIPPET_LANGS: { id: SnippetLang; label: string }[] = [
  { id: "curl", label: "cURL" },
  { id: "python", label: "Python" },
  { id: "node", label: "Node.js" },
  { id: "php", label: "PHP" },
  { id: "go", label: "Go" },
];

export const AI_PROMPT_PACKS: {
  id: AiPromptPack;
  label: string;
  description: string;
}[] = [
  {
    id: "full",
    label: "Full API reference",
    description: "Every endpoint with request/response demos for any LLM.",
  },
  {
    id: "wire",
    label: "Wire my site",
    description:
      "Build middleware that maps products → Cheap Seller SKUs and delivers keys[].",
  },
  {
    id: "python",
    label: "Python client",
    description: "Full reference + output only a Python client.",
  },
  {
    id: "node",
    label: "Node.js client",
    description: "Full reference + output only a Node.js client.",
  },
  {
    id: "php",
    label: "PHP client",
    description: "Full reference + output only a PHP client.",
  },
  {
    id: "go",
    label: "Go client",
    description: "Full reference + output only a Go client.",
  },
];

function resolvePath(ep: DocEndpoint): string {
  return ep.pathExample ?? ep.path;
}

function fullUrl(base: string, ep: DocEndpoint): string {
  const path = resolvePath(ep);
  const q = ep.queryExample ? `?${ep.queryExample}` : "";
  return `${base.replace(/\/$/, "")}${path}${q}`;
}

export function buildSnippet(
  lang: SnippetLang,
  ep: DocEndpoint,
  baseUrl: string,
  apiKey = "drip_sk_live_YOUR_KEY",
): string {
  const url = fullUrl(baseUrl, ep);
  const body = ep.body ? JSON.stringify(ep.body) : null;
  const isPost = ep.method === "POST";
  const needsAuth = ep.auth === "private";

  switch (lang) {
    case "curl": {
      const lines = [`curl -X ${ep.method} \\`];
      if (needsAuth) {
        lines.push(`  -H "Authorization: Bearer ${apiKey}" \\`);
      }
      lines.push(`  -H "Accept: application/json" \\`);
      if (isPost) {
        lines.push(`  -H "Content-Type: application/json" \\`);
        lines.push(`  -H "Idempotency-Key: $(uuidgen)" \\`);
        if (body) lines.push(`  -d '${body}' \\`);
      }
      lines.push(`  "${url}"`);
      return lines.join("\n");
    }
    case "python": {
      const headersLines = ['        "Accept": "application/json",'];
      if (needsAuth) {
        headersLines.unshift('        "Authorization": f"Bearer {API_KEY}",');
      }
      if (isPost) {
        headersLines.push('        "Content-Type": "application/json",');
        headersLines.push('        "Idempotency-Key": str(uuid.uuid4()),');
      }
      const dataLine =
        isPost && body
          ? `    data=json.dumps(${JSON.stringify(ep.body)}).encode(),`
          : "    data=None,";
      const keyLine = needsAuth ? `API_KEY = "${apiKey}"\n` : "";
      return [
        "import json, uuid, urllib.request",
        "",
        keyLine + `URL = "${url}"`,
        "",
        "req = urllib.request.Request(",
        "    URL,",
        dataLine,
        "    headers={",
        ...headersLines,
        "    },",
        `    method="${ep.method}",`,
        ")",
        "with urllib.request.urlopen(req) as res:",
        "    print(res.status, res.read().decode())",
      ].join("\n");
    }
    case "node": {
      const headerObj: Record<string, string> = {
        Accept: "application/json",
      };
      if (needsAuth) headerObj.Authorization = `Bearer ${apiKey}`;
      if (isPost) {
        headerObj["Content-Type"] = "application/json";
        headerObj["Idempotency-Key"] = "replace-with-uuid";
      }
      const headerJson = JSON.stringify(headerObj, null, 2).replace(
        /\n/g,
        "\n  ",
      );
      const parts = [
        `const res = await fetch("${url}", {`,
        `  method: "${ep.method}",`,
        `  headers: ${headerJson},`,
      ];
      if (isPost && body) {
        parts.push(`  body: JSON.stringify(${JSON.stringify(ep.body)}),`);
      }
      parts.push(
        "});",
        "const json = await res.json();",
        "console.log(res.status, json);",
      );
      return parts.join("\n");
    }
    case "php": {
      const opts = [
        `  CURLOPT_URL => "${url}",`,
        "  CURLOPT_RETURNTRANSFER => true,",
        `  CURLOPT_CUSTOMREQUEST => "${ep.method}",`,
        "  CURLOPT_HTTPHEADER => [",
      ];
      if (needsAuth) {
        opts.push(`    "Authorization: Bearer ${apiKey}",`);
      }
      opts.push('    "Accept: application/json",');
      if (isPost) {
        opts.push('    "Content-Type: application/json",');
        opts.push('    "Idempotency-Key: " . uniqid("drip_", true),');
      }
      opts.push("  ],");
      if (isPost && body) {
        opts.push(`  CURLOPT_POSTFIELDS => '${body}',`);
      }
      return [
        "<?php",
        "$ch = curl_init();",
        "curl_setopt_array($ch, [",
        ...opts,
        "]);",
        "$body = curl_exec($ch);",
        'echo curl_getinfo($ch, CURLINFO_HTTP_CODE), "\\n", $body;',
      ].join("\n");
    }
    case "go": {
      const lines = [
        "package main",
        "",
        "import (",
        '  "fmt"',
        '  "io"',
        '  "net/http"',
      ];
      if (isPost && body) lines.push('  "strings"');
      lines.push(
        ")",
        "",
        "func main() {",
        isPost && body
          ? `  body := strings.NewReader(\`${body}\`)`
          : "  var body io.Reader = nil",
        `  req, _ := http.NewRequest("${ep.method}", "${url}", body)`,
      );
      if (needsAuth) {
        lines.push(`  req.Header.Set("Authorization", "Bearer ${apiKey}")`);
      }
      lines.push(`  req.Header.Set("Accept", "application/json")`);
      if (isPost) {
        lines.push(`  req.Header.Set("Content-Type", "application/json")`);
        lines.push(
          `  req.Header.Set("Idempotency-Key", "drip-idempotency-key")`,
        );
      }
      lines.push(
        "  res, err := http.DefaultClient.Do(req)",
        "  if err != nil { panic(err) }",
        "  defer res.Body.Close()",
        "  b, _ := io.ReadAll(res.Body)",
        "  fmt.Println(res.StatusCode, string(b))",
        "}",
      );
      return lines.join("\n");
    }
  }
}

export function testerPath(
  ep: DocEndpoint,
  overrides?: {
    pathCode?: string;
    orderId?: string;
    duration?: string;
  },
): string {
  let path = ep.path;
  if (ep.id === "product") {
    path = `/api/v1/products/${overrides?.pathCode || "SANDBOX-DEMO"}`;
  } else if (ep.id === "orders-get") {
    path = `/api/v1/orders/${overrides?.orderId || "ORDER_ID"}`;
  }
  const sku = overrides?.duration || "SANDBOX-DEMO-30D";
  if (ep.id === "pricing" || ep.id === "stock") {
    return `${path}?sku=${encodeURIComponent(sku)}`;
  }
  if (ep.id === "orders-list") {
    return `${path}?page=1&limit=20`;
  }
  return path;
}

function formatEndpointForPrompt(ep: DocEndpoint): string {
  const lines = [
    `### ${ep.method} ${ep.path}`,
    `Auth: ${ep.auth} · Scope: ${ep.scope}`,
    ep.summary,
  ];
  if (ep.warnings?.length) {
    lines.push(`Warnings: ${ep.warnings.join(" | ")}`);
  }
  if (ep.params?.length) {
    lines.push(
      "Params: " +
        ep.params
          .map(
            (p) =>
              `${p.name} (${p.type}${p.required ? ", required" : ""}) — ${p.description}`,
          )
          .join("; "),
    );
  }
  if (ep.headers?.length) {
    lines.push(
      "Headers: " +
        ep.headers
          .map(
            (h) =>
              `${h.name}${h.required ? " (required)" : ""} — ${h.description}`,
          )
          .join("; "),
    );
  }
  if (ep.bodyParams?.length) {
    lines.push(
      "Body: " +
        ep.bodyParams
          .map(
            (b) =>
              `${b.name} (${b.type}${b.required ? ", required" : ""}) — ${b.description}`,
          )
          .join("; "),
    );
  }
  if (ep.exampleRequest) {
    lines.push("Example request:");
    lines.push("```json");
    lines.push(JSON.stringify(ep.exampleRequest, null, 2));
    lines.push("```");
  }
  lines.push("Example success response:");
  lines.push("```json");
  lines.push(JSON.stringify(ep.exampleResponse, null, 2));
  lines.push("```");
  if (ep.exampleError) {
    lines.push("Example error response:");
    lines.push("```json");
    lines.push(JSON.stringify(ep.exampleError, null, 2));
    lines.push("```");
  }
  if (ep.statuses?.length) {
    lines.push(
      "Status codes: " +
        ep.statuses.map((s) => `${s.http} ${s.code} (${s.when})`).join("; "),
    );
  }
  return lines.join("\n");
}

function buildApiRulesBlock(input: {
  baseUrl: string;
  publicRpm: number;
  privateRpm: number;
  apiKey?: string;
}): string {
  const keyLine = input.apiKey?.trim()
    ? `Sandbox/live API key to use for private calls: ${input.apiKey.trim()}`
    : "Ask me for a sandbox key (drip_sk_test_…) before generating private-call code.";

  return [
    `Base URL: ${input.baseUrl}`,
    "",
    "Happy path (3 calls):",
    "1) GET /api/v1/products (+ optional Bearer) → flat items[] with price + stock",
    "2) GET /api/v1/balance (Bearer) → wallet",
    "3) POST /api/v1/orders with { sku, quantity } + Idempotency-Key → keys[]",
    "",
    "API key policy:",
    "- Multiple API keys per account (default max 5, admin-configurable) at /app/development",
    "- Rotate revokes the old secret instantly",
    "- Private: Authorization: Bearer drip_sk_test_… or drip_sk_live_…",
    "",
    "Public (no key): GET /products, /products/{code}, /pricing?sku=, /stock?sku=",
    `  Rate: ${input.publicRpm}/min per IP → over limit BUSY`,
    "Private: GET /me, /balance, GET|POST /orders, GET /orders/{id}",
    `  Rate: ${input.privateRpm} RPM per key → over limit or OOS → BUSY`,
    "",
    "Money: USD microcents. 1 USD = 100_000_000. Prefer priceUsd / balanceUsd for UI.",
    "Pricing: public = retail only. Bearer = USER/ADMIN retail, SELLER/RESELLER wholesale (special overrides).",
    "Never send price in POST body — server ignores it.",
    "No API fees: you pay only the SKU price.",
    "",
    "SKU rules: buy with items[].apiCode as sku (alias duration). Product apiCode alone fails.",
    "Security: Idempotency-Key required on POST /orders. Order list has keysCount only; full keys on create + GET by id.",
    "",
    "Envelope: success { data } · error { error: { code, message } }",
    "",
    "Global errors:",
    ...DOC_ERRORS.map((e) => `- ${e.http} ${e.code}: ${e.when}`),
    "",
    keyLine,
  ].join("\n");
}

export function buildAiPromptPack(
  pack: AiPromptPack,
  input: {
    baseUrl: string;
    publicRpm: number;
    privateRpm: number;
    apiKey?: string;
  },
): string {
  const rules = buildApiRulesBlock(input);
  const endpointsBlock = DOC_ENDPOINTS.map(formatEndpointForPrompt).join(
    "\n\n",
  );

  const header = [
    "You are helping me integrate the Cheap Seller Platform API (v1 — simplified SKU model).",
    "",
    rules,
    "",
    "## Full endpoint reference (use exact shapes — do not invent fields)",
    "",
    endpointsBlock,
  ];

  if (pack === "full") {
    return [
      ...header,
      "",
      "## Task",
      "Answer integration questions using only the reference above. When asked for code, prefer Python and Node.js clients for the 3-call buy flow.",
    ].join("\n");
  }

  if (pack === "wire") {
    return [
      ...header,
      "",
      "## Task — wire my site",
      "Build server-side middleware (never expose the API key in the browser) that:",
      "1) Keeps a map from my local product IDs → Cheap Seller SKU apiCodes (items[].apiCode)",
      "2) After my customer pays me, calls POST /api/v1/orders with { sku, quantity } + a unique Idempotency-Key",
      "3) Delivers data.keys[] (and/or items[].key) to the buyer",
      "4) On network retry, reuses the same Idempotency-Key",
      "5) Handles INSUFFICIENT_BALANCE, BUSY (stock/rate), UNAUTHORIZED, and UNKNOWN_DURATION",
      "Output production-ready code with env vars DRIP_API_BASE and DRIP_API_KEY, plus a short README.",
    ].join("\n");
  }

  const langLabel: Record<"python" | "node" | "php" | "go", string> = {
    python: "Python 3 (stdlib urllib only)",
    node: "Node.js (fetch / undici)",
    php: "PHP 8 (curl extension)",
    go: "Go 1.21+ (net/http)",
  };

  return [
    ...header,
    "",
    `## Task — ${langLabel[pack]} client only`,
    `Output a single self-contained ${pack} file that implements products → balance → POST orders → print keys[].`,
    "Use DRIP_API_BASE and DRIP_API_KEY from the environment. Do not invent endpoints or response fields.",
    "Include Idempotency-Key on POST /orders. Do not send price in the body.",
  ].join("\n");
}

/** @deprecated Prefer buildAiPromptPack("full" | "wire" | lang). */
export function buildAiIntegrationPrompt(input: {
  baseUrl: string;
  publicRpm: number;
  privateRpm: number;
  purchaseFeePercent: number;
  apiKey?: string;
}): string {
  return buildAiPromptPack("full", input);
}
