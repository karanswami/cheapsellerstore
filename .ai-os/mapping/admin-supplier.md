# Feature Maps & Access Rules

## 1. File Inventory
- Route: `/admin/supplier`
- Page: `src/app/admin/(panel)/supplier/page.tsx` · `loading.tsx`
- Layout: `src/app/admin/(panel)/layout.tsx` → `AdminShell` / `admin-sidebar.tsx` (Store → Supplier)
- Components: `src/components/admin/supplier/supplier-workspace.tsx`, `admin-page-header.tsx`, `use-admin-fetch.ts`, `ui/filter-chip.tsx`
- Libs: `src/lib/supplier/config.ts`, `client.ts` (`normalizeSupplierCatalog`, `normalizeSupplierKeyCodes` / `full_value`), `catalog-cache.ts`, `catalog-admin.ts` (summary + duration mappings DTO), `resolve-key.ts`, `stock.ts`
- Types: `src/types/admin-supplier.ts` (`SupplierCatalogDto` = items + summary + mappings)
- APIs:
  - `GET/PATCH /api/admin/supplier/settings` — enabled, API key (masked on GET), base URL
  - `GET /api/admin/supplier/balance` — live `balance.php`
  - `GET/POST /api/admin/supplier/catalog` — cached catalog + `summary` + local `mappings`; POST refreshes from supplier
  - `GET /api/admin/supplier/logs?page&limit&ok=&fallback=` — paginated `SupplierApiLog` (fallback = `usedFallback`)
- Schema: `Duration.supplierProductId`, `SupplierApiLog`; AppSetting `supplier_api_*` + `supplier_catalog_cache` + `supplier_balance_cache`
- Related: Products duration Dialog Select from catalog; checkout / Platform API fulfill via `resolveKeyForDuration`

## 2. Hard Governance Rules (Read-Only Guardrails)
- Admin JWT `role=ADMIN` only.
- Supplier catalog and balance auto-refresh on a 10-minute TTL (`SUPPLIER_CATALOG_CACHE_TTL_MS = 10m`).
- Upstream supplier balance gates supplier stock: when upstream balance is insufficient to purchase an item (or balance <= 0), the item automatically shows as out of stock on storefront and falls back to local inventory.
- Supplier API key never returned raw on GET (masked); never sent to client components except admin Settings Dialog input.
- Frontend / customer apps never call `licencedashboard.shop`.
- Master switch off → local inventory only; duration without `supplierProductId` → local only.
- Hybrid fulfill: supplier `generate.php` first → on fail/empty/insufficient balance → `claimKey` local; log `usedFallback`.
- Forward `android_id` to supplier API when generating keys for durations marked with `requiresAndroidId`.
- `generate.php` keys may be objects `{ key, password, full_value }` or legacy strings — store/show **`full_value`** to the buyer (fallback: `key:password` / `key`).
- Every supplier HTTP call writes `SupplierApiLog` (request/response JSON) for API-owner support — admin Detail Dialog shows full dump + Copy all.
- Big list: server `page`/`limit` + Load more; Dialog-only settings / catalog detail / log detail.
- Catalog UI: grouped accordion + search + filter chips (all / in / out / mapped / unmapped); row → detail Dialog.
- Prisma server-only; money on Drip side stays USD microcents (supplier prices are cost/reference).

## 3. Permitted Edit Scopes (Write Fields)
- Settings Dialog: enabled Switch, API key, base URL, clear key Switch.
- Catalog Refresh → POST catalog.
- Catalog row → detail Dialog (copy ID; link Products).
- History row → detail Dialog (metadata grid + copy request/response/all).
- Map supplier catalog `id` onto Duration via Products desk Select (`supplierProductId`); catalog Refresh required after API key setup.
