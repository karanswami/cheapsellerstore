/** Downloadable Platform API SDK starter files (generated from docs catalog). */

import type { SnippetLang } from "@/lib/seller-api/docs-catalog";

export type SdkLang = SnippetLang;

export const SDK_PACKS: {
  id: SdkLang;
  label: string;
  filename: string;
  mime: string;
  description: string;
}[] = [
  {
    id: "python",
    label: "Python",
    filename: "drip_client.py",
    mime: "text/x-python; charset=utf-8",
    description: "stdlib urllib — products → balance → order → keys[]",
  },
  {
    id: "node",
    label: "Node.js",
    filename: "drip_client.mjs",
    mime: "text/javascript; charset=utf-8",
    description: "fetch — products → balance → order → keys[]",
  },
  {
    id: "php",
    label: "PHP",
    filename: "drip_client.php",
    mime: "application/x-httpd-php; charset=utf-8",
    description: "curl extension — products → balance → order → keys[]",
  },
  {
    id: "go",
    label: "Go",
    filename: "drip_client.go",
    mime: "text/x-go; charset=utf-8",
    description: "net/http — products → balance → order → keys[]",
  },
  {
    id: "curl",
    label: "cURL",
    filename: "drip_api.sh",
    mime: "text/x-shellscript; charset=utf-8",
    description: "Shell scripts for every endpoint",
  },
];

export function isSdkLang(value: string): value is SdkLang {
  return SDK_PACKS.some((p) => p.id === value);
}

export function buildSdkFile(
  lang: SdkLang,
  baseUrl: string,
): { filename: string; mime: string; body: string } {
  const pack = SDK_PACKS.find((p) => p.id === lang)!;
  const base = baseUrl.replace(/\/$/, "");
  const body = (() => {
    switch (lang) {
      case "python":
        return buildPythonSdk(base);
      case "node":
        return buildNodeSdk(base);
      case "php":
        return buildPhpSdk(base);
      case "go":
        return buildGoSdk(base);
      case "curl":
        return buildCurlSdk(base);
    }
  })();
  return { filename: pack.filename, mime: pack.mime, body };
}

function buildPythonSdk(base: string): string {
  return `#!/usr/bin/env python3
"""Drip Platform API v1 client — products → balance → order → keys[].

Env:
  DRIP_API_BASE  (default ${base})
  DRIP_API_KEY   (required for private calls)
  DRIP_SKU       (default SANDBOX-DEMO-30D)
  DRIP_QTY       (default 1)

Never send price in POST /orders — the server ignores client prices.
"""
from __future__ import annotations

import json
import os
import sys
import uuid
import urllib.error
import urllib.request

BASE = os.environ.get("DRIP_API_BASE", "${base}").rstrip("/")
API_KEY = os.environ.get("DRIP_API_KEY", "").strip()
SKU = os.environ.get("DRIP_SKU", "SANDBOX-DEMO-30D")
QTY = int(os.environ.get("DRIP_QTY", "1"))


def request(method: str, path: str, *, auth: bool = False, body: dict | None = None, idempotency: str | None = None):
    headers = {"Accept": "application/json"}
    data = None
    if auth:
        if not API_KEY:
            raise SystemExit("Set DRIP_API_KEY for private calls")
        headers["Authorization"] = f"Bearer {API_KEY}"
    if body is not None:
        headers["Content-Type"] = "application/json"
        data = json.dumps(body).encode()
    if idempotency:
        headers["Idempotency-Key"] = idempotency
    req = urllib.request.Request(f"{BASE}{path}", data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as res:
            return res.status, json.loads(res.read().decode())
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        try:
            payload = json.loads(raw)
        except json.JSONDecodeError:
            payload = {"error": {"code": "HTTP_ERROR", "message": raw}}
        return e.code, payload


def main() -> None:
    status, catalog = request("GET", "/api/v1/products", auth=bool(API_KEY))
    print("products", status)
    items = (catalog.get("data") or {}).get("items") or []
    if not items:
        print(json.dumps(catalog, indent=2))
        sys.exit(1)
    sku = SKU if any(i.get("apiCode") == SKU for i in items) else items[0]["apiCode"]
    print("using sku", sku)

    status, bal = request("GET", "/api/v1/balance", auth=True)
    print("balance", status, (bal.get("data") or {}).get("balanceUsd"))

    idem = str(uuid.uuid4())
    status, order = request(
        "POST",
        "/api/v1/orders",
        auth=True,
        body={"sku": sku, "quantity": QTY},
        idempotency=idem,
    )
    print("order", status)
    data = order.get("data") or {}
    print("keys", data.get("keys"))
    print(json.dumps(order, indent=2))
    if status >= 400:
        sys.exit(1)


if __name__ == "__main__":
    main()
`;
}

function buildNodeSdk(base: string): string {
  return `#!/usr/bin/env node
/**
 * Drip Platform API v1 client — products → balance → order → keys[].
 *
 * Env:
 *   DRIP_API_BASE  (default ${base})
 *   DRIP_API_KEY   (required for private calls)
 *   DRIP_SKU       (default SANDBOX-DEMO-30D)
 *   DRIP_QTY       (default 1)
 *
 * Never send price in POST /orders — the server ignores client prices.
 */
import { randomUUID } from "node:crypto";

const BASE = (process.env.DRIP_API_BASE || "${base}").replace(/\\/$/, "");
const API_KEY = (process.env.DRIP_API_KEY || "").trim();
const SKU = process.env.DRIP_SKU || "SANDBOX-DEMO-30D";
const QTY = Number(process.env.DRIP_QTY || "1");

async function request(method, path, { auth = false, body, idempotency } = {}) {
  const headers = { Accept: "application/json" };
  if (auth) {
    if (!API_KEY) throw new Error("Set DRIP_API_KEY for private calls");
    headers.Authorization = \`Bearer \${API_KEY}\`;
  }
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (idempotency) headers["Idempotency-Key"] = idempotency;
  const res = await fetch(\`\${BASE}\${path}\`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

const { status: catStatus, json: catalog } = await request("GET", "/api/v1/products", {
  auth: Boolean(API_KEY),
});
console.log("products", catStatus);
const items = catalog?.data?.items || [];
if (!items.length) {
  console.log(JSON.stringify(catalog, null, 2));
  process.exit(1);
}
const sku = items.some((i) => i.apiCode === SKU) ? SKU : items[0].apiCode;
console.log("using sku", sku);

const { status: balStatus, json: bal } = await request("GET", "/api/v1/balance", {
  auth: true,
});
console.log("balance", balStatus, bal?.data?.balanceUsd);

const idem = randomUUID();
const { status: orderStatus, json: order } = await request("POST", "/api/v1/orders", {
  auth: true,
  body: { sku, quantity: QTY },
  idempotency: idem,
});
console.log("order", orderStatus);
console.log("keys", order?.data?.keys);
console.log(JSON.stringify(order, null, 2));
if (orderStatus >= 400) process.exit(1);
`;
}

function buildPhpSdk(base: string): string {
  return `<?php
/**
 * Drip Platform API v1 client — products → balance → order → keys[].
 *
 * Env:
 *   DRIP_API_BASE  (default ${base})
 *   DRIP_API_KEY   (required for private calls)
 *   DRIP_SKU       (default SANDBOX-DEMO-30D)
 *   DRIP_QTY       (default 1)
 *
 * Never send price in POST /orders — the server ignores client prices.
 */

$base = rtrim(getenv('DRIP_API_BASE') ?: '${base}', '/');
$apiKey = trim((string) (getenv('DRIP_API_KEY') ?: ''));
$sku = getenv('DRIP_SKU') ?: 'SANDBOX-DEMO-30D';
$qty = (int) (getenv('DRIP_QTY') ?: '1');

function drip_request(string $method, string $path, bool $auth = false, ?array $body = null, ?string $idempotency = null): array {
    global $base, $apiKey;
    $headers = ['Accept: application/json'];
    if ($auth) {
        if ($apiKey === '') {
            fwrite(STDERR, "Set DRIP_API_KEY for private calls\\n");
            exit(1);
        }
        $headers[] = 'Authorization: Bearer ' . $apiKey;
    }
    $opts = [
        CURLOPT_URL => $base . $path,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_HTTPHEADER => $headers,
    ];
    if ($body !== null) {
        $headers[] = 'Content-Type: application/json';
        if ($idempotency) {
            $headers[] = 'Idempotency-Key: ' . $idempotency;
        }
        $opts[CURLOPT_HTTPHEADER] = $headers;
        $opts[CURLOPT_POSTFIELDS] = json_encode($body);
    }
    $ch = curl_init();
    curl_setopt_array($ch, $opts);
    $raw = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    $json = json_decode((string) $raw, true) ?: [];
    return [$status, $json];
}

[$status, $catalog] = drip_request('GET', '/api/v1/products', $apiKey !== '');
echo "products {$status}\\n";
$items = $catalog['data']['items'] ?? [];
if (!$items) {
    echo json_encode($catalog, JSON_PRETTY_PRINT) . "\\n";
    exit(1);
}
$codes = array_column($items, 'apiCode');
$useSku = in_array($sku, $codes, true) ? $sku : $items[0]['apiCode'];
echo "using sku {$useSku}\\n";

[$status, $bal] = drip_request('GET', '/api/v1/balance', true);
echo 'balance ' . $status . ' ' . ($bal['data']['balanceUsd'] ?? '') . "\\n";

$idem = uniqid('drip_', true);
[$status, $order] = drip_request('POST', '/api/v1/orders', true, [
    'sku' => $useSku,
    'quantity' => $qty,
], $idem);
echo "order {$status}\\n";
echo 'keys ' . json_encode($order['data']['keys'] ?? null) . "\\n";
echo json_encode($order, JSON_PRETTY_PRINT) . "\\n";
if ($status >= 400) {
    exit(1);
}
`;
}

function buildGoSdk(base: string): string {
  return `// Drip Platform API v1 client — products → balance → order → keys[].
//
// Env:
//   DRIP_API_BASE  (default ${base})
//   DRIP_API_KEY   (required for private calls)
//   DRIP_SKU       (default SANDBOX-DEMO-30D)
//   DRIP_QTY       (default 1)
//
// Never send price in POST /orders — the server ignores client prices.
package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strconv"
	"strings"
)

func env(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func request(method, path string, auth bool, body any, idempotency string) (int, map[string]any, error) {
	base := strings.TrimRight(env("DRIP_API_BASE", "${base}"), "/")
	apiKey := os.Getenv("DRIP_API_KEY")
	var reader io.Reader
	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			return 0, nil, err
		}
		reader = bytes.NewReader(b)
	}
	req, err := http.NewRequest(method, base+path, reader)
	if err != nil {
		return 0, nil, err
	}
	req.Header.Set("Accept", "application/json")
	if auth {
		if apiKey == "" {
			return 0, nil, fmt.Errorf("Set DRIP_API_KEY for private calls")
		}
		req.Header.Set("Authorization", "Bearer "+apiKey)
	}
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	if idempotency != "" {
		req.Header.Set("Idempotency-Key", idempotency)
	}
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		return 0, nil, err
	}
	defer res.Body.Close()
	raw, _ := io.ReadAll(res.Body)
	var payload map[string]any
	_ = json.Unmarshal(raw, &payload)
	return res.StatusCode, payload, nil
}

func main() {
	apiKey := os.Getenv("DRIP_API_KEY")
	skuWant := env("DRIP_SKU", "SANDBOX-DEMO-30D")
	qty, _ := strconv.Atoi(env("DRIP_QTY", "1"))

	status, catalog, err := request("GET", "/api/v1/products", apiKey != "", nil, "")
	if err != nil {
		panic(err)
	}
	fmt.Println("products", status)
	data, _ := catalog["data"].(map[string]any)
	items, _ := data["items"].([]any)
	if len(items) == 0 {
		b, _ := json.MarshalIndent(catalog, "", "  ")
		fmt.Println(string(b))
		os.Exit(1)
	}
	sku := skuWant
	found := false
	for _, it := range items {
		m, _ := it.(map[string]any)
		if m["apiCode"] == skuWant {
			found = true
			break
		}
	}
	if !found {
		m, _ := items[0].(map[string]any)
		sku, _ = m["apiCode"].(string)
	}
	fmt.Println("using sku", sku)

	status, bal, err := request("GET", "/api/v1/balance", true, nil, "")
	if err != nil {
		panic(err)
	}
	bd, _ := bal["data"].(map[string]any)
	fmt.Println("balance", status, bd["balanceUsd"])

	idem := fmt.Sprintf("drip-%d", os.Getpid())
	status, order, err := request("POST", "/api/v1/orders", true, map[string]any{
		"sku":      sku,
		"quantity": qty,
	}, idem)
	if err != nil {
		panic(err)
	}
	od, _ := order["data"].(map[string]any)
	fmt.Println("order", status)
	fmt.Println("keys", od["keys"])
	b, _ := json.MarshalIndent(order, "", "  ")
	fmt.Println(string(b))
	if status >= 400 {
		os.Exit(1)
	}
}
`;
}

function buildCurlSdk(base: string): string {
  return `#!/usr/bin/env bash
# Drip Platform API v1 — curl helpers for every endpoint.
# Env: DRIP_API_BASE (default ${base})  DRIP_API_KEY  DRIP_SKU  DRIP_ORDER_ID
set -euo pipefail

BASE="\${DRIP_API_BASE:-${base}}"
BASE="\${BASE%/}"
KEY="\${DRIP_API_KEY:-}"
SKU="\${DRIP_SKU:-SANDBOX-DEMO-30D}"
ORDER_ID="\${DRIP_ORDER_ID:-ORDER_ID}"
AUTH=()
if [[ -n "\$KEY" ]]; then
  AUTH=(-H "Authorization: Bearer \$KEY")
fi

echo "== GET /api/v1/products =="
curl -sS -H "Accept: application/json" "\${AUTH[@]}" "\$BASE/api/v1/products" | jq .

echo "== GET /api/v1/products/SANDBOX-DEMO =="
curl -sS -H "Accept: application/json" "\${AUTH[@]}" "\$BASE/api/v1/products/SANDBOX-DEMO" | jq .

echo "== GET /api/v1/pricing?sku=\$SKU =="
curl -sS -H "Accept: application/json" "\${AUTH[@]}" "\$BASE/api/v1/pricing?sku=\$SKU" | jq .

echo "== GET /api/v1/stock?sku=\$SKU =="
curl -sS -H "Accept: application/json" "\${AUTH[@]}" "\$BASE/api/v1/stock?sku=\$SKU" | jq .

if [[ -z "\$KEY" ]]; then
  echo "Set DRIP_API_KEY to exercise private endpoints."
  exit 0
fi

echo "== GET /api/v1/me =="
curl -sS -H "Accept: application/json" "\${AUTH[@]}" "\$BASE/api/v1/me" | jq .

echo "== GET /api/v1/balance =="
curl -sS -H "Accept: application/json" "\${AUTH[@]}" "\$BASE/api/v1/balance" | jq .

echo "== GET /api/v1/orders =="
curl -sS -H "Accept: application/json" "\${AUTH[@]}" "\$BASE/api/v1/orders?page=1&limit=20" | jq .

echo "== POST /api/v1/orders =="
IDEM="\$(uuidgen 2>/dev/null || cat /proc/sys/kernel/random/uuid)"
curl -sS -X POST \\
  -H "Accept: application/json" \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: \$IDEM" \\
  "\${AUTH[@]}" \\
  -d "{\\"sku\\":\\"\$SKU\\",\\"quantity\\":1}" \\
  "\$BASE/api/v1/orders" | jq .

echo "== GET /api/v1/orders/\$ORDER_ID =="
curl -sS -H "Accept: application/json" "\${AUTH[@]}" "\$BASE/api/v1/orders/\$ORDER_ID" | jq .
`;
}
