# Feature Maps & Access Rules

## 1. File Inventory
- Route: `/app/development` — UI status: live (Development → API credential hub)
- Redirect: `/app/api` → `/app/development` (`src/app/app/api/page.tsx`)
- Shared shell: `app-console-shell.md`
- Page: `src/app/app/development/page.tsx` (SSR: `getPlatformApiHubSnapshot` → initial overview/credential/webhooks)
- Loading: `src/app/app/development/loading.tsx` → `HubPageSkeleton` (`rows={4}`)
- Components:
  - `src/components/app/development/development-view.tsx` — chip tabs Overview / Credential / Calls / Purchases / Webhooks; strict one ACTIVE credential; Dialog-only create/rotate/revoke/webhook + call/purchase detail
- Nav: `src/components/app/customer-sidebar.tsx` (section **Development** → API Keys; visible exclusively for SELLER, RESELLER, and ADMIN roles; hidden for USER)
- Hub components:
  - `HubPageShell` (`maxWidth="xl"` main; `maxWidth="md"` for gate-denied state)
  - `HubHeaderBar` + `HubStatPill` (Balance / Calls 24h / Success / Purchases) — mobile stats wrap full-width (`hub-header-bar.module.css`)
  - Overview QuickStats: Avg latency 24h · Rate limited 24h · API spend · API fees · Credential status
  - Lists use shadcn `Card` + custom rows (not `HubListRow`)
- Related public docs: `/developers` — see `developers-docs.md`
- Libs: `src/lib/seller-api/*` — hub snapshot `getPlatformApiHubSnapshot` in `keys.ts`; stats/purchases `getUserApiStats`, `listUserApiPurchases`, `listUserApiUsage`
- Session APIs:
  - `GET /api/platform-api/overview`
  - `GET/POST /api/platform-api/keys`
  - `POST /api/platform-api/keys/[id]` (`rotate` | `revoke`)
  - `GET /api/platform-api/usage?page&limit&filter=`
  - `GET /api/platform-api/purchases?page&limit`
  - `GET/POST /api/platform-api/webhooks`
  - `DELETE /api/platform-api/webhooks/[id]`
- Public Platform API: `/api/v1/{products,pricing,stock}` flat SKUs (retail; Bearer → your tier); Private: `/api/v1/{me,balance,orders}` Bearer (`sku` buy + Idempotency-Key; list without keys)

## 2. Hard Governance Rules (Read-Only Guardrails)
- Shared shell rules: `app-console-shell.md`.
- Prisma only on server; client never imports `@/lib/prisma`.
- Money is USD microcents; `formatMoney` for display.
- API envelope `{ data }` / `{ error: { code, message } }`.
- Customer session for hub; Bearer `drip_sk_*` for private `/api/v1`.
- Access: platform on → role in `api_allowed_roles` (SELLER, RESELLER, ADMIN only; completely hidden/disabled for normal USER) → `User.apiEnabled` → not banned.
- Rate limits: standard default RPM (60–100 RPM) for standard accounts; elevated 300 RPM tier for Premium accounts.
- Only API purchases charge wallet (subtotal + developer margin %; 0% fee for VIP Premium accounts); public reads free.
- Secrets shown once; Dialog-only create/rotate/revoke/webhook + call/purchase detail.
- **One ACTIVE credential per account** — create when empty; rotate revokes old instantly (`KEY_SLOT_TAKEN` if create while active).
- Never expose unused license key codes on catalog/pricing/stock.
- No inline edit forms on the page body.
- Big lists: server `page`/`limit` + Load more (calls + purchases).
- Hub first paint is SSR snapshot — do not gate the whole page on client `loading=true` when initial data is present.
- Calls surface a single warn **BUSY** badge for rate-limit (429) and out-of-stock (409 + `error.code=BUSY`); do not also show numeric 409 or duplicate subtitle `· BUSY`.
- Purchases expose copyable `durationApiCode`.
- Header KPIs stay at four pills on mobile — fees / keys live in Overview QuickStats.

## 3. Permitted Edit Scopes (Write Fields)
- `HubHeaderBar` KPI stats; chip tab strip; overview KPI strip; Dialog fields for keys/webhooks.
- Credential (one slot): name, mode LIVE/SANDBOX, scopes, IP allowlist, RPM (capped at private default max 300); Create disabled when slot taken; Rotate/Revoke on hero card.
- Webhooks: URL + order.fulfilled.
- Header link out to `/developers` (+ #money / #ai / #codes).
