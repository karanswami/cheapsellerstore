# Feature Maps & Access Rules

## 1. File Inventory
- Route: `/app/keys`
- Shared shell: `app-console-shell.md`
- Page: `src/app/app/keys/page.tsx` (`export const dynamic = "force-dynamic"`)
- Loading: `src/app/app/keys/loading.tsx` → `HubPageSkeleton` (`rows={4}`, `showToolbar`, `showChips`)
- Components: `src/components/app/keys-list.tsx`, `src/components/app/keys-list.module.css` (license ticket cards — custom layout, not `HubListRow`)
- Hub components (reference desk):
  - `HubPageShell`
  - `HubHeaderBar` + `HubStatPill` (via `VaultHero` stats: Total / Visible / Hidden)
  - `HubToolbar`, `HubToolbarRow`, `HubSearch`
  - `HubEmptyPanel`
  - `FilterChip` / `FilterChipRow` (`components/ui/`) for Newest/Oldest/Hidden/Select chips
- Libs: `src/lib/auth/customer.ts`, `src/lib/orders.ts` (`getUserKeysPage`), `src/lib/currencies.ts`
- APIs: `GET /api/keys?page=&limit=&q=` (auth) — client live-polls every 5s + tab focus

## 2. Hard Governance Rules (Read-Only Guardrails)
- Shared shell rules: `app-console-shell.md` — **this page is the canonical hub desk reference**.
- Prisma only on server; client components never import `@/lib/prisma`.
- Money is USD microcents only; no FX.
- API envelope `{ data }` / `{ error: { code, message } }`.
- Customer session required; guests redirect to login dialog.
- Shows purchased key codes only (FULFILLED order items).
- **Do not load all keys at once** — server `page`/`limit` + Load more; SSR page 1 only.
- **Live update:** KeysList refreshes page 1 on mount / every 5s / tab focus (`cache: "no-store"`).
- Hide (local) is client-only UX; does not delete server keys.
- Date labels use `KeyDate` (`useSyncExternalStore`) — UTC on SSR/hydrate, local TZ after.
- List UI = stacked license tickets (not data table); keys masked until Reveal/Copy; Select mode for bulk actions.
- Premium vault UI stays on Drip dark neon tokens (CSS Module + shadcn primitives); no second UI kit.

## 3. Permitted Edit Scopes (Write Fields)
- `HubHeaderBar` vault summary stats, `HubToolbar` search + filter chips, ticket cards (reveal/copy/download/hide), Select mode + sticky bulk bar, Show more + server Load more.
- `HubPageSkeleton` props in `loading.tsx` when toolbar/chip density changes.
- Do not fetch unused AVAILABLE keys from inventory APIs.
