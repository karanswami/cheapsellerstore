# Feature Maps & Access Rules

## 1. File Inventory
- Route: `/app`
- Shared shell: `app-console-shell.md`
- Page: `src/app/app/page.tsx`
- Loading: `src/app/app/loading.tsx` → `AppPageSkeleton` (`variant="store"`) — **not** `HubPageSkeleton`
- Layout: `src/app/app/layout.tsx` → `AppShell` (see `app-console-shell.md`)
- Hub components: `AppHomeShell` (`maxWidth="2xl"` = `max-w-5xl`, same as guest `/`) + store `HubHeaderBar` via `store-catalog-slots`
- Home stream: `src/components/catalog/store-catalog-slots.tsx` (`BannerSlotSuspended` — image carousel then `FlashOfferCarousel` (up to 3 offer slides; autoplay + dots), `CatalogSlotSuspended` — Store `HubHeaderBar` + category tabs + feed) + `src/components/catalog/product-grid-feed.tsx` (Load more) + `src/components/app/banner-carousel.tsx` + `src/components/catalog/flash-offer-carousel.tsx` + `flash-offer-banner.tsx` + catalog product sheet stack + `product-card` (+ module CSS: flat card, 4:3 media, category+verified, blurb, green From price, Demo+Buy CTAs, whole-card click, compact `RatingSummary` → Review Drawer; status badges include PINNED / BESTSELLER) / `flash-sale-ticker` + `product-sheet` (optional version-first) / `product-demo-dialog` (in-site YouTube embed) / `version-picker` / `duration-picker` / `product-reviews-drawer`
- Skeletons: `src/components/app/app-page-skeleton.tsx` (card aspect `4/3`)
- Libs: `src/lib/auth/customer.ts`, `src/lib/sidebar-stats.ts`, `src/lib/banners.ts`, `src/lib/offer-banner.ts`, `src/lib/products.ts` (`getProductsPage` role-aware; sort **pinned → bestseller → newest**; resolves demo URL), `src/lib/youtube.ts` (`getYoutubeEmbedUrl`), `src/lib/roles.ts`, `src/lib/settings.ts` (`getDefaultProductDemoUrl`)
- APIs: `GET /api/products?category=&page=&limit=` (Load more), `GET/POST /api/products/[id]/reviews?page=&limit=&sort=` (Review Drawer), promos/flash/support as before
- Cart/promo: `src/components/cart/cart-provider.tsx`, `src/components/cart/cart-sheet.tsx`, `src/lib/promo-calc.ts`
- Stock: `POST /api/stock/quote` + `src/lib/keys.ts` (`countAvailableKeysByDuration`); product sheet + cart refresh live AVAILABLE; checkout blocked when `!stockOk`

## 2. Hard Governance Rules (Read-Only Guardrails)
- Shared shell rules: `app-console-shell.md`.
- Prisma only on server; client components never import `@/lib/prisma`.
- Money is USD microcents only; use `formatMoney` / `usdToMicrocents`; no FX.
- API envelope `{ data }` / `{ error: { code, message } }`.
- Customer session required; guests redirect to `/?auth=login&next=/app`.
- **Home:** `AppHomeShell` ambient + store section uses shared `HubHeaderBar` (parity with Keys / Deposit / etc.).
- Home: Suspense-stream banners vs catalog; catalog first page only (`getProductsPage`, default 12) + Load more — never dump full catalog on first paint.
- Catalog sort: `isPinned` → `isBestSeller` → `createdAt` asc; products must have ≥1 duration (`durations: { some: {} }`).
- Splash: never inject `<style dangerouslySetInnerHTML>` from a Client Component.
- Same catalog rules as landing; stock labels hidden; Premium Verified seal when reviews exist; always-visible Reviews pill + ProductSheet “Ratings & reviews” row open the Drawer.
- **Demo** opens `ProductDemoDialog` (YouTube embed on-site); does not navigate away for embeddable video URLs.

## 3. Permitted Edit Scopes (Write Fields)
- Home layout, banner carousel, category tabs, product grid / feed / card presentation.
- Store section header via `HubHeaderBar` in `store-catalog-slots` (title / description / product count pill; mobile keeps pill inline, not a full-width second row).
- Home ends with SiteFooter (same component as public); footer owns mobile FAB bottom clearance. Product grid still adds mobile `pb-14` so mid-feed prices clear the support FAB.
- Offer banners: `FlashOfferCarousel` + `getActiveOfferBanners` (polish bare “flash” titles; skip duplicate title/description; up to 3 as carousel slides).
- Server fetch category/products/banners only — no hardcoded catalog.
- Cart promo apply UX + scoped discount display (via cart components / promo-calc).
