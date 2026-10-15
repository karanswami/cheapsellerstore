# Feature Maps & Access Rules

## 1. File Inventory
- Route: `/admin/seller-api` — UI status: live (Platform API desk)
- Page: `src/app/admin/(panel)/seller-api/page.tsx`
- Components: `src/components/admin/seller-api/seller-api-workspace.tsx` — Settings rows + KPI strip + chip tabs Developers / Keys / Calls / Margin; Dialog-only settings + revoke + mark-paid + detail
- Nav: `src/components/admin/admin-sidebar.tsx` (System → Platform API)
- Libs:
  - `src/lib/seller-api/settings.ts` — `API_MAX_KEYS_PER_USER = 1` (hard lock)
  - `src/lib/seller-api/keys.ts` — create / rotate / revoke; `KEY_SLOT_TAKEN`
  - `src/lib/seller-api/admin-developers.ts` — paginated developers list
  - `src/lib/seller-api/developer-margin.ts`
- Migration: `npm run db:enforce-single-api-key` → `prisma/enforce-single-api-key.ts`
- Schema: `SellerApiKey`, `SellerApiUsage`, `SellerApiWebhook`, `SellerApiIdempotency`, `ApiDeveloperMarginDay`, `TransactionType.API_FEE`, `User.apiEnabled`, `Product.apiCode`, `Duration.apiCode`
- APIs:
  - `GET/PATCH /api/admin/seller-api/settings`
  - `GET /api/admin/seller-api/developers?page&limit&q&status=`
  - `GET /api/admin/seller-api/keys?page&limit&q` · `POST /api/admin/seller-api/keys/[id]` revoke
  - `GET /api/admin/seller-api/usage?page&limit&filter&q`
  - `GET/POST /api/admin/seller-api/developer-margin` (mark paid)
- Related: Users desk `apiEnabled` toggle (`/api/admin/users/[id]`); Products Dialog `apiCode` fields

## 2. Hard Governance Rules (Read-Only Guardrails)
- Admin JWT `role=ADMIN` only.
- Dialog-only settings edits (access / fee / limits) — no inline forms.
- **One ACTIVE key per user** — product invariant; settings UI does not edit max keys.
- Developer margin = sum of `TransactionType.API_FEE` (fee % on API purchases). Separate from `/admin/development` 10% gross-profit share.
- Mark-paid writes `ApiDeveloperMarginDay` only — **no wallet/order side effects**.
- Paginated Developers / Keys / Calls / Margin — never load all at once; search resets page 1.
- Per-role allowlist + global kill switch + per-user `apiEnabled`.
- Revoke via confirm Dialog only.

## 3. Permitted Edit Scopes (Write Fields)
- Settings: platformEnabled, allowedRoles, purchaseFeePercent, RPM, burst, sandbox (not maxKeys).
- Developers detail: toggle `apiEnabled`, revoke active credential.
- Sandbox Mode (`drip_sk_test_...`): loads up to 10 live DB products (mock stock 999) + dynamic random test key codes (max 10 chars: `TEST-XXXXX`).
- Revoke any key; mark margin days paid.
- Do not invent a second fee ledger source.
