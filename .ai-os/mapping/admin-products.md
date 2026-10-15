# Feature Maps & Access Rules

## 1. File Inventory
- Route: `/admin/products`
- Page: `src/app/admin/(panel)/products/page.tsx`
- Layout: `src/app/admin/(panel)/layout.tsx` → `src/components/admin/admin-shell.tsx`, `src/components/admin/admin-sidebar.tsx`
- Components: `src/components/admin/products/products-workspace.tsx` (list + **Default demo** Dialog → `default_product_demo_url`), `src/components/admin/products/admin-product-dialog.tsx` (incl. optional `demoUrl` + interactive **Feature tags / chips** with comma/Enter support + optional duration **Version** + supplier catalog Select), `src/components/admin/use-admin-fetch.ts`
- Libs: `src/lib/public-uploads.ts` (`saveProductUpload`, `readPublicUpload`), `src/lib/slug.ts`, `src/lib/settings.ts` (`getDefaultProductDemoUrl`, `SETTING_KEYS.defaultProductDemoUrl`), `src/lib/admin-products.ts` (`archiveOrDeleteProduct`)
- Types: `src/types/admin-supplier.ts` (`SupplierCatalogDto` for duration Select)
- APIs: `src/app/api/admin/products/route.ts`, `src/app/api/admin/products/[id]/route.ts` (DELETE → archive or hard-delete), `src/app/api/admin/products/upload/route.ts`, `src/app/api/admin/categories/route.ts`, `src/app/api/admin/durations/route.ts`, `src/app/api/admin/durations/[id]/route.ts`, `PATCH /api/admin/settings` (`defaultProductDemoUrl`), `GET /api/admin/settings` (`supplierBuyPricePercent`), `GET /api/admin/supplier/catalog` (read for Select)
- Serve: `src/app/uploads/[...path]/route.ts` — runtime files under `/uploads/*` (product images etc.) because `next start` does not serve `public/` writes after boot

## 2. Hard Governance Rules (Read-Only Guardrails)
- Prisma only on server; client components never import `@/lib/prisma`.
- Money is USD microcents only (`1 USD = 100_000_000`); use `formatMoney` / `usdToMicrocents`; no FX.
- API envelope `{ data }` / `{ error: { code, message } }`.
- Admin gate: customer JWT with `User.role === ADMIN` via `src/app/admin/(panel)/layout.tsx` + `AdminShell`.
- List pages are read-only rows/badges; mutations only inside shadcn Dialog.
- Mobile-first compact lists; no inline wallet/status editors on list rows.
- Durations store user/reseller/buy USD microcent prices; product **Delete** purges AVAILABLE/DISABLED stock; if SOLD keys or order items remain → archive (`isActive: false`) and keep history; otherwise hard-delete.
- Optional per-duration **Version** (`Duration.version`, default `""`) — e.g. Lite / Brutal; blank on normal products. Label unique per `(productId, version)`. When a product has ≥2 distinct versions, storefront ProductSheet shows version chips first.
- Optional per-duration **Supplier product** (`Duration.supplierProductId`) — when supplier catalog is cached, Duration Dialog shows a searchable grouped Select from `/api/admin/supplier/catalog` (fills **buy cost = Settings `supplier_buy_price_percent` of supplier catalog price**, default 50% + empty label/days); otherwise manual ID input. Used when Supplier desk master switch is on (see `admin-supplier.md`).
- Product/Duration `apiCode` unique SKUs for Platform API (auto-allocate if empty).
- Admin can toggle **Pin to top** (`isPinned`), **Best seller** (`isBestSeller`), and **Maintenance Mode** (`isMaintenance`) in the product Dialog; list shows Pinned / Best seller / Maintenance badges. When `isMaintenance` is true, store buttons are disabled and blur maintenance overlay is shown.
- Optional per-product **Demo URL** (`Product.demoUrl`); empty uses saved site default (`default_product_demo_url`) then builtin fallback. Prefer YouTube **watch / shorts / youtu.be** video links so storefront Demo Dialog can embed on-site (channel URLs are not embeddable).
- Optional per-duration **Requires Device Bound ID** (`Duration.requiresAndroidId`) and customizable field label (`Duration.deviceIdName`, default `"Android ID"`); when true, prompts the user at checkout to enter their device ID which is forwarded to the supplier API.
- Never expose unused Key.code on public APIs.
- Uploaded image URLs stay `/uploads/{folder}/…`; serving is via the catch-all route (or nginx alias), not the Next public snapshot alone.

## 3. Permitted Edit Scopes (Write Fields)
- Product Dialog: photo, active / pin / bestseller flags, creatable category, `apiCode`, `demoUrl`, duration price rows + duration `apiCode` + optional `version` + optional `supplierProductId` (catalog Select when synced) + optional `requiresAndroidId` + optional `deviceIdName`.
- Reads: `GET /api/admin/supplier/catalog` (cached items for Duration Select).
- Products page **Default demo** Dialog writes AppSetting `default_product_demo_url`.
- Redirect shells `/new` `/[id]` → this page.
- Storefront order controlled by `Product.isPinned` + `isBestSeller` + `createdAt` (see `getProductsPage`).
