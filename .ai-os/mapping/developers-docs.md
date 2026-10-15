# Feature Maps & Access Rules

## 1. File Inventory
- Route: `/developers` — UI status: live (public, no login) — GitBook-style reference
- Alias redirect: `/docs` → `/developers`
- Page: `src/app/developers/page.tsx` (props: fee %, public RPM, private RPM, baseUrl)
- Redirect: `src/app/docs/page.tsx`
- Components:
  - `src/components/developers/developers-docs-view.tsx` — S-tier modern developer portal: hero metrics bar, interactive microcents calculator, webhooks guide & signature verification, left TOC + right floating “On this page” rail, endpoint search, Request/Success/Error response inspector tabs, multi-language snippets (cURL/Python/Node/PHP/Go), SDK download center, AI prompt engine, and Postman-grade browser Live Playground
  - `src/components/developers/developers-docs-view.module.css` — custom thin scrollbars, neon playground glow, and code panel styling
- Lib:
  - `src/lib/seller-api/docs-catalog.ts` — `DOC_NAV` (includes Webhooks), `DOC_ENDPOINTS` (full `exampleRequest` / `exampleResponse` / `exampleError`), `DOC_ERRORS` (includes `PRODUCT_MAINTENANCE`, `PRICE_MISSING`, etc.), snippets, `buildAiPromptPack` (`full` | `wire` | lang), `AI_PROMPT_PACKS`
  - `src/lib/seller-api/sdk-packs.ts` — downloadable clients (python/node/php/go/curl)
  - `src/lib/seller-api/openapi.ts` — OpenAPI 3.1 from catalog
  - `src/lib/seller-api/catalog.ts` (flat SKUs), `orders.ts` (sku + keys[] + list)
- Platform API: `src/app/api/v1/{products,products/[code],pricing,stock,me,balance,orders,orders/[id]}/route.ts`
- Docs downloads (public):
  - `GET /api/v1/sdk/[lang]` — `src/app/api/v1/sdk/[lang]/route.ts`
  - `GET /api/v1/openapi.json` — `src/app/api/v1/openapi.json/route.ts`
  - `GET /api/v1/ai-prompt?pack=` — `src/app/api/v1/ai-prompt/route.ts`
- Settings: `getApiPurchaseFeePercent`, `getApiPublicRateLimitRpm`, `getApiDefaultRateLimitRpm`
- Footer: `site-footer` → API Docs; sidebar Development → Docs → `/developers`
- robots / sitemap: allow + list `/developers`

## 2. Hard Governance Rules (Read-Only Guardrails)
- Public page — no session required for docs, live tester, SDK/OpenAPI/AI downloads, or prompt copy.
- **Public API** (no key): `GET /api/v1/products`, `/products/{code}`, `/pricing?sku=`, `/stock?sku=` — flat `items[]`; **retail price only**; 100/min per IP; over limit → `BUSY`. Alias query `duration=`.
- **Private API** (Bearer): `/me`, `/balance`, `GET|POST /orders`, `GET /orders/{id}` — 300 RPM per key; over limit / stock-out → `BUSY`.
- **POST /orders**: `sku` (alias `duration`); **`Idempotency-Key` required**; ignore client `price`; response `keys[]`.
- **GET /orders** list: paginated; **never includes key codes** (`keysCount` only). Full keys on create + GET by id.
- **One active API key per account** — create/rotate at `/app/development`; rotate revokes old secret instantly.
- Money: USD microcents (`1 USD = 100_000_000`) + `*Usd` helpers; Money + Security sections mandatory in docs.
- Every endpoint card shows Request | Success | Error demo JSON from catalog (required fields).
- Live tester: public works without key; private requires pasted Bearer (browser-only); POST sends Idempotency-Key.
- AI packs: client copy + downloadable `.md` via `/api/v1/ai-prompt` — no server LLM proxy. Packs embed full endpoint demos.
- SDK files: server-generated from `sdk-packs.ts`; env `DRIP_API_BASE` + `DRIP_API_KEY`; never expose key in browser apps.
- Snippets: curl / Python / Node / PHP / Go.
- SiteChrome public header/footer (not hub console).

## 3. Permitted Edit Scopes (Write Fields)
- Docs copy, endpoint catalog (`DOC_ENDPOINTS` / `DOC_NAV` / `DOC_ERRORS` / demos), AI packs, SDK templates, OpenAPI builder, live-tester fields.
- Fee % / public+private RPM from AppSetting via server page props.
- Footer + sidebar links to `/developers`.
- Keep docs + OpenAPI + AI prompts + SDK demos in sync when `/api/v1` response shapes change.
