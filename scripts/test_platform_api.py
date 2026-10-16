#!/usr/bin/env python3
"""
Drip Platform API — smoke test for all /api/v1 endpoints.

Usage:
  export DRIP_API_KEY='drip_sk_live_…'   # or drip_sk_test_…
  export DRIP_BASE_URL='https://drip-client.gurugaminghub.store'  # optional
  python3 scripts/test_platform_api.py

  # also run a real purchase (charges wallet + developer fee):
  python3 scripts/test_platform_api.py --buy
  python3 scripts/test_platform_api.py --buy --qty 1 --duration YOUR-DURATION-CODE
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import uuid
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

DEFAULT_BASE = "https://drip-client.gurugaminghub.store"
MICROCENTS = 100_000_000  # 1 USD


def usd(micro: int | float | None) -> str:
    if micro is None:
        return "n/a"
    return f"${float(micro) / MICROCENTS:.2f}"


class DripClient:
    def __init__(self, base_url: str, api_key: str, timeout: float = 30.0):
        self.base = base_url.rstrip("/")
        self.api_key = api_key
        self.timeout = timeout

    def request(
        self,
        method: str,
        path: str,
        *,
        query: dict[str, str] | None = None,
        body: dict[str, Any] | None = None,
        idempotency_key: str | None = None,
    ) -> tuple[int, dict[str, str], Any]:
        url = f"{self.base}{path}"
        if query:
            url = f"{url}?{urlencode(query)}"

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Accept": "application/json",
            "User-Agent": "drip-platform-api-test/1.0",
        }
        data = None
        if body is not None:
            data = json.dumps(body).encode("utf-8")
            headers["Content-Type"] = "application/json"
        if idempotency_key:
            headers["Idempotency-Key"] = idempotency_key

        req = Request(url, data=data, headers=headers, method=method)
        try:
            with urlopen(req, timeout=self.timeout) as res:
                raw = res.read().decode("utf-8")
                hdrs = {k.lower(): v for k, v in res.headers.items()}
                payload = json.loads(raw) if raw else None
                return res.status, hdrs, payload
        except HTTPError as e:
            raw = e.read().decode("utf-8") if e.fp else ""
            hdrs = {k.lower(): v for k, v in e.headers.items()} if e.headers else {}
            try:
                payload = json.loads(raw) if raw else {"error": {"message": raw}}
            except json.JSONDecodeError:
                payload = {"error": {"message": raw or str(e)}}
            return e.code, hdrs, payload
        except URLError as e:
            raise SystemExit(f"Network error: {e}") from e


def step(title: str) -> None:
    print(f"\n{'=' * 60}\n{title}\n{'=' * 60}")


def show(status: int, headers: dict[str, str], payload: Any) -> None:
    rl = {
        k: headers[k]
        for k in (
            "x-ratelimit-limit",
            "x-ratelimit-remaining",
            "x-ratelimit-reset",
            "x-request-id",
        )
        if k in headers
    }
    print(f"HTTP {status}")
    if rl:
        print("rate:", rl)
    print(json.dumps(payload, indent=2, ensure_ascii=False))


def pick_duration(products: list[dict[str, Any]]) -> tuple[str | None, str | None]:
    """Return (product_api_code, duration_api_code) with stock > 0 if possible."""
    for p in products:
        pcode = p.get("apiCode")
        for d in p.get("durations") or []:
            dcode = d.get("apiCode")
            stock = int(d.get("stock") or 0)
            if dcode and stock > 0:
                return pcode, dcode
    for p in products:
        pcode = p.get("apiCode")
        for d in p.get("durations") or []:
            if d.get("apiCode"):
                return pcode, d["apiCode"]
    return None, None


def main() -> int:
    parser = argparse.ArgumentParser(description="Test Drip Platform API /api/v1")
    parser.add_argument(
        "--base",
        default=os.environ.get("DRIP_BASE_URL", DEFAULT_BASE),
        help="API base URL",
    )
    parser.add_argument(
        "--key",
        default=os.environ.get("DRIP_API_KEY", ""),
        help="Bearer API key (or set DRIP_API_KEY)",
    )
    parser.add_argument(
        "--buy",
        action="store_true",
        help="Also POST /api/v1/orders (charges wallet on LIVE keys)",
    )
    parser.add_argument("--duration", default="", help="duration apiCode for pricing/stock/buy")
    parser.add_argument("--qty", type=int, default=1, help="order quantity (default 1)")
    args = parser.parse_args()

    if not args.key.strip():
        print("Set DRIP_API_KEY or pass --key", file=sys.stderr)
        return 2

    if args.key.startswith("drip_sk_live_") and args.buy:
        print("WARNING: LIVE key + --buy will debit real wallet balance.\n")

    client = DripClient(args.base, args.key.strip())
    failed = 0

    # 1) me
    step("GET /api/v1/me")
    status, hdrs, payload = client.request("GET", "/api/v1/me")
    show(status, hdrs, payload)
    if status != 200:
        failed += 1
        print("FAIL: auth/me — fix key / apiEnabled / platform settings before continuing")
        return 1

    data = (payload or {}).get("data") or {}
    user = data.get("user") or {}
    bal = data.get("walletBalanceMicrocents")
    print(
        f"→ role={user.get('role')} sandbox={data.get('sandbox')} "
        f"balance={usd(bal)}"
    )

    # 2) balance
    step("GET /api/v1/balance")
    status, hdrs, payload = client.request("GET", "/api/v1/balance")
    show(status, hdrs, payload)
    if status != 200:
        failed += 1

    # 3) products
    step("GET /api/v1/products")
    status, hdrs, payload = client.request("GET", "/api/v1/products")
    show(status, hdrs, payload)
    products = ((payload or {}).get("data") or {}).get("products") or []
    if status != 200:
        failed += 1

    product_code, duration_code = pick_duration(products)
    if args.duration:
        duration_code = args.duration.strip()
        product_code = product_code  # may still use catalog pick for product detail
        for p in products:
            for d in p.get("durations") or []:
                if d.get("apiCode") == duration_code:
                    product_code = p.get("apiCode")
                    break

    print(f"→ picked product={product_code!r} duration={duration_code!r}")

    # 4) single product
    if product_code:
        step(f"GET /api/v1/products/{product_code}")
        status, hdrs, payload = client.request("GET", f"/api/v1/products/{product_code}")
        show(status, hdrs, payload)
        if status != 200:
            failed += 1
    else:
        print("\nSKIP product detail — catalog empty / no apiCode")

    # 5) pricing + stock
    if duration_code:
        step(f"GET /api/v1/pricing?duration={duration_code}")
        status, hdrs, payload = client.request(
            "GET", "/api/v1/pricing", query={"duration": duration_code}
        )
        show(status, hdrs, payload)
        if status != 200:
            failed += 1
        else:
            pd = (payload or {}).get("data") or {}
            print(
                f"→ unit={usd(pd.get('unitPriceMicrocents'))} "
                f"fee≈{usd(pd.get('estimatedFeeMicrocents'))}"
            )

        step(f"GET /api/v1/stock?duration={duration_code}")
        status, hdrs, payload = client.request(
            "GET", "/api/v1/stock", query={"duration": duration_code}
        )
        show(status, hdrs, payload)
        if status != 200:
            failed += 1
    else:
        print("\nSKIP pricing/stock — no duration apiCode found")

    # 6) purchase (optional)
    order_id = None
    if args.buy:
        if not duration_code:
            print("\nFAIL: --buy needs a duration (catalog empty or pass --duration)")
            failed += 1
        else:
            idem = str(uuid.uuid4())
            step(f"POST /api/v1/orders  (Idempotency-Key={idem})")
            status, hdrs, payload = client.request(
                "POST",
                "/api/v1/orders",
                body={"duration": duration_code, "quantity": args.qty},
                idempotency_key=idem,
            )
            show(status, hdrs, payload)
            if status not in (200, 201):
                failed += 1
            else:
                od = (payload or {}).get("data") or {}
                order_id = od.get("id") or od.get("orderId")
                items = od.get("items") or []
                print(
                    f"→ order_id={order_id} status={od.get('status')} "
                    f"total={usd(od.get('totalMicrocents'))} items={len(items)}"
                )

            # idempotency replay
            step("POST /api/v1/orders (same Idempotency-Key — should replay)")
            status2, hdrs2, payload2 = client.request(
                "POST",
                "/api/v1/orders",
                body={"duration": duration_code, "quantity": args.qty},
                idempotency_key=idem,
            )
            show(status2, hdrs2, payload2)
            if status2 != status:
                print("WARN: idempotent replay status differed")
    else:
        step("POST /api/v1/orders — SKIPPED (pass --buy to charge wallet)")

    # 7) get order
    if order_id:
        step(f"GET /api/v1/orders/{order_id}")
        status, hdrs, payload = client.request("GET", f"/api/v1/orders/{order_id}")
        show(status, hdrs, payload)
        if status != 200:
            failed += 1
    elif args.buy:
        print("\nSKIP GET order — no order id from purchase")

    step("SUMMARY")
    print(f"failures={failed}")
    print("Tip: use a drip_sk_test_… key for free sandbox catalog (SANDBOX-DEMO-30D).")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
