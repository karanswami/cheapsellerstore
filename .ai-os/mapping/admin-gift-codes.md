# Feature Maps & Access Rules

## 1. File Inventory
- Route: `/admin/gift-codes` — live
- Page: `src/app/admin/(panel)/gift-codes/page.tsx`
- Components:
  - `src/components/admin/gift-codes/gift-codes-workspace.tsx`
  - `src/components/admin/gift-codes/admin-gift-code-dialog.tsx`
- Libs: `src/lib/gift-codes.ts` (`createGiftCode`, `listGiftCodesForAdmin`, `disableGiftCode`)
- APIs: `GET/POST /api/admin/gift-codes`, `PATCH /api/admin/gift-codes/[id]` (`action: disable`)
- Schema: `GiftCode` (code, amount microcents, status, optional `assignedUserId`, claim fields, `createdById`)
- Nav: Payments → Gift codes in `admin-sidebar.tsx`
- Meta: `src/lib/console-page-meta.ts` `/admin/gift-codes`

## 2. Hard Governance Rules (Read-Only Guardrails)
- Admin JWT `role=ADMIN` only.
- List is read-only rows/badges; create + disable only inside Dialogs.
- Amount = USD dollars in Dialog → stored as microcents.
- Optional username lock → only that user can claim; blank → first claimer.
- Customer claim gated by Settings → **Pages enable** → Gift codes (default **off**); admin desk shows warning banner when store page is off.
- Paginated list (`page`/`limit`) + status chips + search — never load all.
- Claimed codes show claimer username / email / role / time in detail Dialog.
- Cannot disable already-claimed codes.
- Money via `formatMoney` (USD microcents).

## 3. Permitted Edit Scopes (Write Fields)
- Create Dialog: amount USD, optional code, restrict-user Switch + username, optional expiry, note.
- Detail Dialog: copy code, disable (AVAILABLE only), claimer details.
- Filter chips: All / Available / Claimed / Disabled; search code/note/username.
